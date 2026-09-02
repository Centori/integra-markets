"""Bulk export: gating, budgets, and file correctness.

Export is the paid tiers' lever — `api_trial` may read the API all month and
must not be able to bulk-export a single row. It is also the one endpoint
where a single call can move tens of thousands of rows, so the limits are
what make it safe to expose at all.
"""
import csv
import datetime as dt
import io
import sys
import types

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from services import rate_limit


@pytest.fixture(autouse=True)
def _clean():
    rate_limit.reset_cache()
    yield
    rate_limit.reset_cache()


def _rows(n, start=dt.datetime(2026, 8, 1, tzinfo=dt.timezone.utc)):
    return [
        {
            "document_id": f"doc-{i}",
            "entity": "crude_oil",
            "sentiment": "bullish",
            # signed -1..+1. NOT `score`, which is a confidence magnitude and
            # averages HIGHER for bearish rows than bullish ones.
            "sentiment_score": 0.7,
            "confidence": 0.85,
            "published_at": (start + dt.timedelta(hours=i)).isoformat(),
            "model_version": "2026-09-02",
            # headline/source/url/precision live on raw_documents and arrive as
            # a PostgREST embed, not as flat columns.
            "raw_documents": {
                "title": f"Crude headline {i}",
                "source": "OilPrice.com",
                "url": f"https://example.test/{i}",
                "published_at_precision": "exact" if i % 2 == 0 else "crawl_estimate",
            },
        }
        for i in range(n)
    ]


class FakeQuery:
    def __init__(self, parent, table):
        self._p, self._t = parent, table
        self._lo, self._hi = 0, None

    def select(self, *_a, **_k):
        return self

    def eq(self, *_a, **_k):
        return self

    def gte(self, *_a, **_k):
        return self

    def lte(self, *_a, **_k):
        return self

    def like(self, *_a, **_k):
        return self

    def order(self, *_a, **_k):
        return self

    def limit(self, *_a, **_k):
        return self

    def range(self, lo, hi):
        self._lo, self._hi = lo, hi
        return self

    def execute(self):
        if self._t == "api_key_usage":
            return types.SimpleNamespace(count=self._p.export_count, data=[])
        page = self._p.rows[self._lo : (self._hi + 1 if self._hi is not None else None)]
        return types.SimpleNamespace(count=None, data=page)


class FakeSupabase:
    def __init__(self, rows, export_count=0):
        self.rows, self.export_count = rows, export_count

    def table(self, name):
        return FakeQuery(self, name)


def _client(monkeypatch, tier="api_basic", rows=None, export_count=0):
    from api import export as export_mod

    fake = FakeSupabase(rows if rows is not None else _rows(5), export_count)
    monkeypatch.setattr(export_mod, "_supabase", lambda: fake)

    ent = types.SimpleNamespace(
        tier=tier,
        scopes=frozenset({"history"}),
        is_expired_tier=False,
        can_export=lambda: tier in ("api_basic", "api", "api_history"),
    )
    auth_row = {"id": "key-1", "user_id": "u1", "_entitlement": ent, "_tier": tier}

    from services import api_key_auth

    monkeypatch.setattr(api_key_auth, "assert_history_depth", lambda *_a, **_k: None)
    monkeypatch.setattr(export_mod, "assert_history_depth", lambda *_a, **_k: None)

    app = FastAPI()
    app.include_router(export_mod.router)
    # Replace the auth dependency with the fixture row.
    for route in app.routes:
        if getattr(route, "path", "") == "/v1/export/sentiment":
            dep = route.dependant.dependencies[0]
            app.dependency_overrides[dep.call] = lambda: auth_row
    return TestClient(app, raise_server_exceptions=False)


class TestGating:
    def test_trial_tier_cannot_export(self, monkeypatch):
        """The whole point of the feature: read all month, export is paid."""
        c = _client(monkeypatch, tier="api_trial")
        r = c.get("/v1/export/sentiment?commodity=crude_oil")
        assert r.status_code == 403
        assert "not included in the api_trial plan" in r.json()["detail"]

    def test_403_says_normal_queries_still_work(self, monkeypatch):
        """An upsell must not read as 'your key is broken'."""
        c = _client(monkeypatch, tier="api_trial")
        detail = c.get("/v1/export/sentiment?commodity=crude_oil").json()["detail"]
        assert "can still be queried" in detail

    def test_paid_tier_can_export(self, monkeypatch):
        c = _client(monkeypatch, tier="api_basic")
        assert c.get("/v1/export/sentiment?commodity=crude_oil").status_code == 200


class TestCsvOutput:
    def test_csv_has_header_and_rows(self, monkeypatch):
        c = _client(monkeypatch, rows=_rows(3))
        r = c.get("/v1/export/sentiment?commodity=crude_oil&format=csv")
        parsed = list(csv.reader(io.StringIO(r.text)))
        assert parsed[0] == [
            "published_at", "commodity", "sentiment", "sentiment_score",
            "confidence", "headline", "source", "url", "document_id",
            "published_at_precision", "model_version",
        ]
        assert len(parsed) == 4  # header + 3

    def test_attachment_filename_is_set(self, monkeypatch):
        c = _client(monkeypatch)
        r = c.get("/v1/export/sentiment?commodity=crude_oil")
        assert "attachment;" in r.headers["content-disposition"]
        assert "integra_crude_oil_" in r.headers["content-disposition"]
        assert r.headers["content-type"].startswith("text/csv")

    def test_date_precision_travels_with_the_data(self, monkeypatch):
        """~87% of the archive is dated by crawl time, not publication time.
        A spreadsheet outlives any caveat in the docs, so the column ships in
        the file itself."""
        c = _client(monkeypatch, rows=_rows(4))
        rows = list(csv.DictReader(io.StringIO(c.get("/v1/export/sentiment?commodity=crude_oil").text)))

        # This used to assert only truthiness, which passed while the value was
        # a HARDCODED "crawl_estimate" on every row — the column was never
        # selected from the database at all, so exact-dated rows were labelled
        # as guesses. Assert the real per-row values instead.
        assert [r["published_at_precision"] for r in rows] == [
            "exact", "crawl_estimate", "exact", "crawl_estimate",
        ]

    def test_export_carries_the_article_it_scored(self):
        """A number with no headline cannot answer "why was oil bearish then"."""
        from api.export import _COLUMNS, _row_values

        values = dict(zip(_COLUMNS, _row_values(_rows(1)[0])))
        assert values["headline"] == "Crude headline 0"
        assert values["source"] == "OilPrice.com"
        assert values["url"] == "https://example.test/0"

    def test_sentiment_score_is_signed_and_distinct_from_confidence(self):
        """They were byte-identical in 100% of exported rows."""
        from api.export import _COLUMNS, _row_values

        values = dict(zip(_COLUMNS, _row_values(_rows(1)[0])))
        assert values["sentiment_score"] == 0.7
        assert values["confidence"] == 0.85
        assert values["sentiment_score"] != values["confidence"]


class TestRowCap:
    def test_export_stops_at_the_row_limit(self, monkeypatch):
        monkeypatch.setenv("INTEGRA_EXPORT_ROWS_API_BASIC", "5")
        monkeypatch.setattr(rate_limit, "_EXPORT_ROW_LIMITS", {"api_basic": 5})
        c = _client(monkeypatch, rows=_rows(50))
        r = c.get("/v1/export/sentiment?commodity=crude_oil")
        body = list(csv.reader(io.StringIO(r.text)))
        assert len(body) == 6, "header + 5 rows"
        assert r.headers["X-Integra-Row-Limit"] == "5"

    def test_xlsx_cap_is_lower_than_csv(self):
        """CSV streams; a workbook must be finalised as a zip before any of it
        can be sent, so it gets a tighter ceiling."""
        assert rate_limit.export_rows_limit("api_history", "xlsx") < rate_limit.export_rows_limit(
            "api_history", "csv"
        )

    def test_truncation_is_contiguous_from_the_start(self, monkeypatch):
        """A capped export must be 'the first N', not an arbitrary slice, so a
        user can reason about it and resume."""
        monkeypatch.setattr(rate_limit, "_EXPORT_ROW_LIMITS", {"api_basic": 3})
        c = _client(monkeypatch, rows=_rows(20))
        rows = list(csv.DictReader(io.StringIO(c.get("/v1/export/sentiment?commodity=crude_oil").text)))
        stamps = [r["published_at"] for r in rows]
        assert stamps == sorted(stamps), "rows must be ascending by publication time"


class TestExportBudget:
    def test_monthly_export_count_is_enforced(self, monkeypatch):
        """Request metering counts CALLS. One call can return 50,000 rows, so
        exports need a separate budget on the 'how often' axis."""
        monkeypatch.setattr(rate_limit, "_EXPORT_COUNT_LIMITS", {"api_basic": 2})
        c = _client(monkeypatch, export_count=2)
        r = c.get("/v1/export/sentiment?commodity=crude_oil")
        assert r.status_code == 429
        assert int(r.headers["Retry-After"]) >= 1

    def test_429_says_normal_queries_are_unaffected(self, monkeypatch):
        monkeypatch.setattr(rate_limit, "_EXPORT_COUNT_LIMITS", {"api_basic": 1})
        c = _client(monkeypatch, export_count=5)
        assert "Normal API queries are" in c.get("/v1/export/sentiment?commodity=crude_oil").json()["detail"]

    def test_export_budget_fails_open(self, monkeypatch):
        """Same posture as request metering: a counter that cannot count must
        not block a paying customer."""
        allowed, info = rate_limit.check_and_consume_export(
            types.SimpleNamespace(table=lambda *_a: (_ for _ in ()).throw(RuntimeError("down"))),
            "k", "api_basic",
        )
        assert allowed is True and info["degraded"] is True


class TestBadInput:
    def test_reversed_range_is_rejected(self, monkeypatch):
        c = _client(monkeypatch)
        r = c.get("/v1/export/sentiment?commodity=crude_oil&from=2026-08-10T00:00:00Z&to=2026-08-01T00:00:00Z")
        assert r.status_code == 400

    def test_unknown_format_is_rejected(self, monkeypatch):
        c = _client(monkeypatch)
        assert c.get("/v1/export/sentiment?commodity=crude_oil&format=pdf").status_code == 422


class TestXlsxOutput:
    """XlsxWriter is in requirements.txt, so CI covers this. Skipped locally
    when absent rather than failing — the endpoint itself degrades to a clear
    501 pointing at format=csv, which is also asserted below."""

    def test_xlsx_round_trips(self, monkeypatch):
        pytest.importorskip("xlsxwriter")
        openpyxl = pytest.importorskip("openpyxl")
        from api.export import _COLUMNS, _xlsx_bytes

        blob = _xlsx_bytes(iter(_rows(120)))
        wb = openpyxl.load_workbook(io.BytesIO(blob), read_only=True)
        sheet = wb["sentiment"]
        data = list(sheet.iter_rows(values_only=True))

        assert list(data[0]) == _COLUMNS
        assert len(data) - 1 == 120
        assert data[1][1] == "crude_oil"

    def test_missing_library_degrades_to_a_clear_501(self, monkeypatch):
        """Not an opaque ImportError 500 — tell the caller to use CSV."""
        import builtins

        from api.export import _xlsx_bytes
        from fastapi import HTTPException

        real_import = builtins.__import__

        def no_xlsxwriter(name, *a, **k):
            if name == "xlsxwriter":
                raise ImportError("simulated")
            return real_import(name, *a, **k)

        monkeypatch.setattr(builtins, "__import__", no_xlsxwriter)
        with pytest.raises(HTTPException) as exc:
            _xlsx_bytes(iter(_rows(1)))
        assert exc.value.status_code == 501
        assert "format=csv" in exc.value.detail


class TestDefaultWindow:
    """A no-argument export is the first call anyone makes. It must not 403."""

    def test_default_window_sits_inside_the_depth_cap(self, monkeypatch):
        """Defaulting to exactly HISTORY_DEPTH_CAP_DAYS looks right and fails
        every time: the gate compares (now - start) > cap, and by the time it
        runs, start is microseconds older than the cap."""
        from api import export as export_mod
        from services.entitlement import HISTORY_DEPTH_CAP_DAYS

        seen = {}

        def spy(_auth, days):
            seen["days"] = days
            if days > HISTORY_DEPTH_CAP_DAYS:
                from fastapi import HTTPException

                raise HTTPException(status_code=403, detail="too deep")

        monkeypatch.setattr(export_mod, "assert_history_depth", spy)
        monkeypatch.setattr(export_mod, "effective_scopes", lambda _a: {"history"})

        c = _client(monkeypatch)
        monkeypatch.setattr(export_mod, "assert_history_depth", spy)
        r = c.get("/v1/export/sentiment?commodity=crude_oil")

        assert r.status_code == 200, f"no-argument export was refused: {r.text[:120]}"
        assert seen["days"] <= HISTORY_DEPTH_CAP_DAYS
        assert seen["days"] > HISTORY_DEPTH_CAP_DAYS - 1, "should still give nearly the full window"

    def test_archive_scope_gets_the_full_default(self, monkeypatch):
        from api import export as export_mod

        seen = {}
        monkeypatch.setattr(export_mod, "assert_history_depth",
                            lambda _a, d: seen.__setitem__("days", d))
        monkeypatch.setattr(export_mod, "effective_scopes", lambda _a: {"history", "archive"})
        c = _client(monkeypatch, tier="api_history")
        monkeypatch.setattr(export_mod, "assert_history_depth",
                            lambda _a, d: seen.__setitem__("days", d))
        assert c.get("/v1/export/sentiment?commodity=crude_oil").status_code == 200
        assert seen["days"] > 29.9, "archive callers should get the full default window"
