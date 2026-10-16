"""WAF store reads and the weekly-report publish decision, against an in-memory fake Supabase."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from waf import store
from waf.weeks import from_report_id

T0 = datetime(2026, 10, 10, tzinfo=timezone.utc)


class FakeQuery:
    """Just enough of the supabase-py builder: eq / gte / lt / in_ / order / range / limit / execute."""

    def __init__(self, rows, embeds):
        self.rows, self.embeds, self.filters = rows, embeds, []
        self._range = None

    def select(self, *_a, **_k):
        return self

    def eq(self, col, val):
        self.filters.append(lambda r: r.get(col) == val)
        return self

    def gte(self, col, val):
        self.filters.append(lambda r: r.get(col) is not None and r[col] >= val)
        return self

    def lt(self, col, val):
        self.filters.append(lambda r: r.get(col) is not None and r[col] < val)
        return self

    def in_(self, col, vals):
        self.filters.append(lambda r: r.get(col) in set(vals))
        return self

    def order(self, col, desc=False):
        self.rows = sorted(self.rows, key=lambda r: r.get(col) or "", reverse=desc)
        return self

    def range(self, start, end):
        self._range = (start, end)
        return self

    def limit(self, _n):
        return self

    def execute(self):
        rows = [r for r in self.rows if all(f(r) for f in self.filters)]
        if self._range:
            rows = rows[self._range[0]: self._range[1] + 1]
        return type("Res", (), {"data": [self.embeds(r) for r in rows], "count": len(rows)})


class FakeSupabase:
    def __init__(self, docs, tags):
        self.docs, self.tags = docs, tags

    def table(self, name):
        if name == "waf_document_tags":
            return FakeQuery(self.tags, dict)

        def embed(doc):
            return doc | {"waf_document_tags": [t for t in self.tags if t["document_id"] == doc["id"]],
                          "sentiment_scores": []}

        return FakeQuery(self.docs, embed)


def _iso(dt):
    return dt.isoformat()


def _fixture():
    docs = [
        {"id": "a", "source": "Punch", "title": "Dangote PMS", "published_at": _iso(T0 + timedelta(days=1))},
        {"id": "b", "source": "Punch", "title": "Bonny Light", "published_at": _iso(T0 + timedelta(days=2))},
        {"id": "old", "source": "Punch", "title": "old story", "published_at": _iso(T0 - timedelta(days=30))},
    ]
    tags = [
        {"document_id": "a", "tag_type": "product", "tag": "PMS", "tagged_at": _iso(T0 + timedelta(days=1, hours=1))},
        {"document_id": "a", "tag_type": "entity", "tag": "dangote_refinery", "tagged_at": _iso(T0 + timedelta(days=1, hours=1))},
        {"document_id": "b", "tag_type": "grade", "tag": "bonny_light", "tagged_at": _iso(T0 + timedelta(days=2, hours=1))},
        # backfill-tagged today, published long before the window: must be excluded
        {"document_id": "old", "tag_type": "product", "tag": "PMS", "tagged_at": _iso(T0 + timedelta(days=3))},
    ]
    return FakeSupabase(docs, tags)


def test_window_filter_newest_first_and_no_backfill_leak():
    rows, truncated = store.tagged_documents(_fixture(), T0, T0 + timedelta(days=7))
    assert [r["id"] for r in rows] == ["b", "a"] and not truncated


def test_tag_filter_keeps_all_of_a_documents_tags():
    rows, _ = store.tagged_documents(_fixture(), T0, T0 + timedelta(days=7), "product", "PMS")
    assert [r["id"] for r in rows] == ["a"]
    assert rows[0]["tags"] == {"entity": ["dangote_refinery"], "product": ["PMS"]}


def test_max_rows_marks_truncated():
    rows, truncated = store.tagged_documents(_fixture(), T0, T0 + timedelta(days=7), max_rows=1)
    assert len(rows) == 1 and truncated


# ------------------------------------------------------------ publish decision

def _run_with(monkeypatch, report, now):
    from jobs import waf_weekly_report
    from waf import report_service

    calls = {}
    monkeypatch.setattr("services._supabase.get_supabase_client", lambda: object())
    monkeypatch.setattr(store, "get_report", lambda sb, rid: report)
    monkeypatch.setattr(store, "record_push_result", lambda sb, rid, res: calls.setdefault("withheld", res))
    monkeypatch.setattr(store, "mark_published", lambda sb, rid, at, res: calls.setdefault("published", res))
    monkeypatch.setattr(report_service, "publish", lambda sb, rid: calls.setdefault("pushed", rid) and {"ok": 1})
    return waf_weekly_report.run(now), calls


def test_empty_report_is_withheld_not_pushed(monkeypatch):
    week = from_report_id("WAF-2026-W42")
    report = {"report_id": week.report_id, "version": 1, "published_at": None, "payload": {"documents_analysed": 0}}
    result, calls = _run_with(monkeypatch, report, week.publish_at + timedelta(minutes=5))
    assert result == {"withheld": "WAF-2026-W42"}
    assert "pushed" not in calls and "published" not in calls


def test_withheld_report_is_not_retried(monkeypatch):
    week = from_report_id("WAF-2026-W42")
    report = {"report_id": week.report_id, "version": 1, "published_at": None,
              "push_result": {"withheld": "no documents"}, "payload": {"documents_analysed": 0}}
    result, calls = _run_with(monkeypatch, report, week.publish_at + timedelta(minutes=10))
    assert result is None and not calls


def test_report_with_documents_is_pushed_at_publish_time(monkeypatch):
    week = from_report_id("WAF-2026-W42")
    report = {"report_id": week.report_id, "version": 1, "published_at": None, "payload": {"documents_analysed": 12}}
    _, calls = _run_with(monkeypatch, report, week.publish_at + timedelta(minutes=5))
    assert calls.get("pushed") == "WAF-2026-W42"
    before, calls = _run_with(monkeypatch, report, week.publish_at - timedelta(minutes=5))
    assert before is None and not calls


# ------------------------------------------------------------ health

def test_health_reports_db_errors_instead_of_500(monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from api import waf as waf_api

    def boom(*_a, **_k):
        raise RuntimeError("relation waf_document_tags does not exist")

    monkeypatch.setattr(waf_api, "_supabase", lambda: object())
    monkeypatch.setattr(store, "pipeline_counts", boom)
    app = FastAPI()
    app.include_router(waf_api.health_router)
    body = TestClient(app).get("/health/waf").json()
    assert "does not exist" in body["counts"]["error"]
    assert "waf_ingest_last_tick" in body and "scheduler_threads" in body


# ------------------------------------------------------------ catch-up

def test_first_tick_catches_up_once_and_retries_after_failure(monkeypatch):
    from jobs import waf_ingest

    calls = []
    monkeypatch.setattr("services._supabase.get_supabase_client", lambda: object())
    monkeypatch.setattr(store, "recent_documents", lambda sb, since: ([], False))
    monkeypatch.setattr(waf_ingest, "ingest_meman", lambda sb: {"new": 0})
    monkeypatch.setattr(waf_ingest, "_caught_up", False)

    def flaky_backfill(sb, days):
        calls.append(days)
        if len(calls) == 1:
            raise TimeoutError("read timed out")
        return {"seen": 5, "tagged": 2, "port_positions": 0}

    monkeypatch.setattr(waf_ingest, "backfill", flaky_backfill)
    import pytest
    with pytest.raises(TimeoutError):
        waf_ingest.run()
    assert waf_ingest.LAST_TICK["ok"] is False and "timed out" in waf_ingest.LAST_TICK["error"]
    assert waf_ingest.run()["catch_up"]["tagged"] == 2
    assert "catch_up" not in waf_ingest.run()
    assert calls == [waf_ingest.CATCH_UP_DAYS, waf_ingest.CATCH_UP_DAYS]
