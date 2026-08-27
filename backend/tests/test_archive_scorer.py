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
    """Records what the job wrote and which RPCs it called.

    `unscored` may be a list (served once, then empty) or a list-of-batches
    to simulate a multi-batch drain.
    """

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
            if self.unscored and isinstance(self.unscored[0], list):
                return FakeExec(self.unscored.pop(0) if self.unscored else [])
            batch, self.unscored = self.unscored, []
            return FakeExec(batch)
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
        # Mirrors services.archive_writer.normalize_sentiment exactly. Kept
        # faithful (not a pass-through stub) so the uppercase regression below
        # is actually exercised rather than assumed away.
        fake_writer.normalize_sentiment = lambda label: (
            str(label).lower()
            if label and str(label).lower() in ("bullish", "bearish", "neutral")
            else None
        )
        monkeypatch.setitem(sys.modules, "services.archive_writer", fake_writer)

        # UPPERCASE on purpose — this is what analyze_market_sentiment really
        # returns. The first version of these fakes returned lowercase, which
        # is why they passed while production scored nothing.
        fake_nlp = types.ModuleType("main_simple_nlp")
        fake_nlp.analyze_market_sentiment = lambda text, commodity, scores=None: {
            "sentiment": "BULLISH", "confidence": 0.8
        }
        fake_nlp.basic_sentiment_analysis = lambda text, commodity: {
            "sentiment": "BULLISH", "confidence": 0.8
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


class TestLabelNormalisation:
    """The regression that shipped: uppercase labels silently discarded."""

    def test_uppercase_labels_are_scored_not_discarded(self, patched):
        """A perfectly good document must not come back as 'unscorable'.

        The scorers return "BULLISH"; the DB CHECK wants "bullish". The job
        compared against the lowercase tuple without normalising, so every
        score it computed was thrown away while it reported ok.
        """
        client = patched(FakeSupabase([_doc("a")]))
        result = archive_scorer.run()

        assert result["unscorable"] == 0, "a scorable document was discarded"
        assert result["scored"] == 1
        assert all(
            r["sentiment"] == "bullish"
            for r in client.written["entity_mentions"]
        ), "sentiment must be lowercased to satisfy the CHECK constraint"

    def test_unrecognised_label_is_still_rejected(self, patched, monkeypatch):
        """Normalising must not turn into accepting anything."""
        client = patched(FakeSupabase([_doc("a")]))
        sys.modules["main_simple_nlp"].basic_sentiment_analysis = (
            lambda text, commodity: {"sentiment": "SPICY", "confidence": 0.9}
        )
        result = archive_scorer.run()
        assert result["unscorable"] == 1 and result["scored"] == 0


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


class TestDrainLoop:
    """Throughput: the bottleneck was idle time, not per-document work."""

    def test_multiple_batches_drain_in_one_tick(self, patched):
        """A tick keeps pulling until the backlog empties or time runs out.

        The original design did one batch per 600s tick — 1,200 docs/hour,
        ~9.5 hours for the real backlog, over 98% of it spent sleeping.
        """
        client = patched(FakeSupabase([[_doc("a")], [_doc("b")], [_doc("c")], []]))
        result = archive_scorer.run()

        assert result["ok"] is True
        assert result["batches"] == 3, "tick stopped after one batch"
        assert result["scored"] == 3
        assert len(client.written["entity_mentions"]) == 6  # commodity+topic each

    def test_time_budget_is_respected(self, patched, monkeypatch):
        """A huge backlog must not hold the tick open indefinitely."""
        monkeypatch.setattr(archive_scorer, "DRAIN_BUDGET_S", 0)
        client = patched(FakeSupabase([[_doc("a")], [_doc("b")], []]))
        result = archive_scorer.run()
        assert result["batches"] == 1, "budget of 0 should stop after the first batch"

    def test_empty_backlog_costs_one_query(self, patched):
        client = patched(FakeSupabase([]))
        result = archive_scorer.run()
        assert result["backlog_empty"] is True
        assert len([c for c in client.rpc_calls if c[0] == "unscored_documents"]) == 1
