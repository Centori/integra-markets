"""archive_scorer: the properties that keep the archive draining.

The failure this job exists to prevent is not a crash — it is a job that
logs "ok" forever while achieving nothing. So these tests are mostly about
forward progress, not about sentiment correctness.
"""

import sys
import types

import pytest

from jobs import archive_scorer


class FakeExec:
    def __init__(self, data):
        self._data = data

    def execute(self):
        return types.SimpleNamespace(data=self._data)


class FakeTable:
    def __init__(self, recorder, name):
        self._rec = recorder
        self._name = name

    def upsert(self, rows, **kwargs):
        self._rec.setdefault(self._name, []).extend(rows)
        return FakeExec(rows)


class FakeSupabase:
    """Records what the job wrote and which RPCs it called."""

    def __init__(self, unscored, rpc_fail=None):
        self.unscored = unscored
        self.written = {}
        self.rpc_calls = []
        self._rpc_fail = rpc_fail or set()

    def table(self, name):
        return FakeTable(self.written, name)

    def rpc(self, name, params):
        self.rpc_calls.append((name, params))
        if name in self._rpc_fail:
            raise RuntimeError(f"{name} exploded")
        if name == "unscored_documents":
            return FakeExec(self.unscored)
        if name == "mark_documents_scored":
            return FakeExec(len(params.get("p_ids") or []))
        return FakeExec(None)


@pytest.fixture
def patched(monkeypatch):
    """Install a fake supabase + deterministic scorers."""

    def _install(client):
        fake_sb = types.ModuleType("services._supabase")
        fake_sb.get_supabase_client = lambda: client
        monkeypatch.setitem(sys.modules, "services._supabase", fake_sb)

        fake_writer = types.ModuleType("services.archive_writer")
        fake_writer.ACTIVE_MODEL_NAME = "test_model"
        fake_writer.ACTIVE_MODEL_VERSION = "2026-08-27"
        monkeypatch.setitem(sys.modules, "services.archive_writer", fake_writer)

        fake_nlp = types.ModuleType("main_simple_nlp")
        fake_nlp.analyze_market_sentiment = lambda text, commodity, scores=None: {
            "sentiment": "bullish", "confidence": 0.8
        }
        fake_nlp.basic_sentiment_analysis = lambda text, commodity: {
            "sentiment": "bullish", "confidence": 0.8
        }
        fake_nlp.normalize_commodity = lambda _a, _b: "oil"
        fake_nlp.vader_analyzer = None
        monkeypatch.setitem(sys.modules, "main_simple_nlp", fake_nlp)

        fake_topics = types.ModuleType("services.topic_taxonomy")
        fake_topics.detect_topics = lambda text, title=None: ["crude_oil"]
        monkeypatch.setitem(sys.modules, "services.topic_taxonomy", fake_topics)
        return client

    return _install


def _doc(doc_id, title="Oil rises", content="Crude climbed.", published="2020-03-01T00:00:00+00:00"):
    return {"id": doc_id, "source": "x", "title": title, "content": content,
            "published_at": published, "raw_payload": {}}


class TestForwardProgress:
    """The stall class of bug — a job that runs but never advances."""

    def test_unscorable_documents_are_still_marked(self, patched):
        """A document with no text must NOT be left in the backlog.

        Otherwise, because the queue is ordered oldest-first, a handful of
        empty documents at the front of 2020 pins the scorer permanently and
        nothing behind them is ever reached.
        """
        client = patched(FakeSupabase([_doc("a", title="", content="")]))
        result = archive_scorer.run()

        assert result["ok"] is True
        assert result["unscorable"] == 1
        assert result["scored"] == 0
        marks = [c for c in client.rpc_calls if c[0] == "mark_documents_scored"]
        assert marks, "unscorable document was never marked — backlog would stall"
        assert marks[0][1]["p_ids"] == ["a"]

    def test_every_touched_document_is_marked(self, patched):
        client = patched(FakeSupabase([_doc("a"), _doc("b", title="", content=""), _doc("c")]))
        archive_scorer.run()
        marks = [c for c in client.rpc_calls if c[0] == "mark_documents_scored"][0]
        assert set(marks[1]["p_ids"]) == {"a", "b", "c"}

    def test_empty_backlog_is_success_not_failure(self, patched):
        patched(FakeSupabase([]))
        result = archive_scorer.run()
        assert result["ok"] is True and result["backlog_empty"] is True


class TestPublicationDateAxis:
    """The whole point: history must be indexed by when news happened."""

    def test_published_at_is_carried_onto_entity_rows(self, patched):
        client = patched(FakeSupabase([_doc("a", published="2020-03-01T00:00:00+00:00")]))
        archive_scorer.run()
        rows = client.written["entity_mentions"]
        assert rows, "no entity rows written"
        assert all(r["published_at"] == "2020-03-01T00:00:00+00:00" for r in rows), (
            "entity_mentions must carry the document's publication date, not the scoring time"
        )

    def test_commodity_and_topic_rows_both_emitted(self, patched):
        client = patched(FakeSupabase([_doc("a")]))
        archive_scorer.run()
        kinds = {r["entity_type"] for r in client.written["entity_mentions"]}
        assert kinds == {"commodity", "topic"}


class TestFailsLoudly:
    """Silent degradation is the thing being engineered out."""

    def test_marking_failure_is_reported_not_swallowed(self, patched):
        client = patched(FakeSupabase([_doc("a")], rpc_fail={"mark_documents_scored"}))
        result = archive_scorer.run()
        assert result["ok"] is False
        assert "mark_scored" in result["error"]

    def test_rpc_failure_reports_not_raises(self, patched):
        patched(FakeSupabase([], rpc_fail={"unscored_documents"}))
        result = archive_scorer.run()
        assert result["ok"] is False and "rpc" in result["error"]

    def test_missing_supabase_does_not_raise(self, monkeypatch):
        fake_sb = types.ModuleType("services._supabase")
        fake_sb.get_supabase_client = lambda: None
        monkeypatch.setitem(sys.modules, "services._supabase", fake_sb)
        fake_writer = types.ModuleType("services.archive_writer")
        fake_writer.ACTIVE_MODEL_NAME = "m"
        fake_writer.ACTIVE_MODEL_VERSION = "v"
        monkeypatch.setitem(sys.modules, "services.archive_writer", fake_writer)
        result = archive_scorer.run()
        assert result["ok"] is False
