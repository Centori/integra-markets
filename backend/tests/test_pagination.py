"""Aggregates must be computed over the window, not over the first page of it.

`/v1/sentiment` averaged `sentiment_score` across a query capped at
`.limit(1000)`. For any window holding more rows, that made `score` the mean of
the most recent 1000 — a biased sample, not a random one — while
`articles_analyzed` reported the sample size as though it were the population.

Nothing errored. The response looked complete, was wrong, and got more wrong
the longer the window, which is the wrong direction for a product sold on
historical context.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.pagination import (  # noqa: E402
    PAGE_SIZE,
    decode_cursor,
    encode_cursor,
    fetch_all,
    page_response,
)


class _FakeQuery:
    def __init__(self, rows, start, end):
        self._page = rows[start : end + 1]

    def execute(self):
        class R:
            pass
        r = R()
        r.data = self._page
        return r


def _source(n, value=1.0):
    """n rows, each carrying `value`, paged the way PostgREST pages."""
    rows = [{"i": i, "sentiment_score": value} for i in range(n)]
    calls = []

    def build(start, end):
        calls.append((start, end))
        return _FakeQuery(rows, start, end)

    return build, calls


class TestExhaustiveFetch:
    def test_reads_past_the_first_page(self):
        build, calls = _source(2500)
        rows, truncated = fetch_all(build)
        assert len(rows) == 2500
        assert truncated is False
        assert len(calls) == 3

    def test_stops_when_the_data_runs_out_not_at_the_ceiling(self):
        build, _ = _source(120)
        rows, truncated = fetch_all(build)
        assert len(rows) == 120
        assert truncated is False, "a short page is exhaustion, not truncation"

    def test_a_short_page_costs_no_extra_round_trip(self):
        build, calls = _source(1500)
        fetch_all(build)
        assert len(calls) == 2

    def test_ceiling_is_reported_as_truncated(self):
        build, _ = _source(10_000)
        rows, truncated = fetch_all(build, max_rows=2000)
        assert len(rows) == 2000
        assert truncated is True

    def test_empty_source_is_not_truncated(self):
        build, _ = _source(0)
        rows, truncated = fetch_all(build)
        assert rows == [] and truncated is False

    def test_exactly_one_full_page(self):
        """The boundary a page-length check gets wrong."""
        build, _ = _source(PAGE_SIZE)
        rows, truncated = fetch_all(build)
        assert len(rows) == PAGE_SIZE
        assert truncated is False


class TestTheBugItself:
    def test_capping_changes_the_answer(self):
        """The concrete failure: 2000 bearish rows then 1000 bullish ones,
        ordered newest-first. A capped read sees only the bullish page."""
        import statistics
        recent = [{"sentiment_score": 0.9} for _ in range(1000)]
        older = [{"sentiment_score": -0.6} for _ in range(2000)]
        rows = recent + older

        def build(start, end):
            return _FakeQuery(rows, start, end)

        capped = statistics.fmean(r["sentiment_score"] for r in rows[:1000])
        full_rows, _ = fetch_all(build)
        full = statistics.fmean(r["sentiment_score"] for r in full_rows)

        assert round(capped, 3) == 0.9, "capped read reports strongly bullish"
        assert full < 0, "the window is actually bearish"
        # Sign inversion is the finding; the magnitude of the gap just shows
        # how far from a rounding error it is.
        assert (capped > 0) != (full > 0), "the cap inverted the sign of the answer"
        assert abs(capped - full) >= 0.9


class TestCursors:
    def test_round_trips(self):
        payload = {"published_at": "2026-09-04T10:00:00Z", "id": "doc-9"}
        assert decode_cursor(encode_cursor(payload)) == payload

    def test_absent_cursor_is_none_not_an_error(self):
        assert decode_cursor(None) is None
        assert decode_cursor("") is None

    def test_malformed_cursor_raises(self):
        """A client that corrupts its cursor must be told, not silently handed
        page one forever while it believes it is advancing."""
        with pytest.raises(ValueError):
            decode_cursor("!!!not-base64!!!")

    def test_cursor_is_opaque(self):
        """Guessable shape becomes a contract, and then the keyset columns
        cannot change without breaking clients."""
        c = encode_cursor({"published_at": "2026-09-04T10:00:00Z"})
        assert "published_at" not in c
        assert "2026" not in c


class TestPageResponse:
    def _rows(self, n):
        return [{"id": f"r{i}"} for i in range(n)]

    def test_extra_row_proves_another_page_without_being_returned(self):
        out = page_response(self._rows(11), limit=10, cursor_from=lambda r: {"id": r["id"]})
        assert len(out["data"]) == 10
        assert out["has_more"] is True
        assert "next_cursor" in out

    def test_exact_boundary_reports_no_more(self):
        """Fetching limit+1 is what makes this right; a count query gets the
        exact-boundary case wrong."""
        out = page_response(self._rows(10), limit=10, cursor_from=lambda r: {"id": r["id"]})
        assert out["has_more"] is False
        assert "next_cursor" not in out

    def test_cursor_points_at_the_last_returned_row(self):
        out = page_response(self._rows(11), limit=10, cursor_from=lambda r: {"id": r["id"]})
        assert decode_cursor(out["next_cursor"]) == {"id": "r9"}

    def test_empty_page(self):
        out = page_response([], limit=10, cursor_from=lambda r: {"id": r["id"]})
        assert out["data"] == [] and out["has_more"] is False


class TestEndpointWiring:
    @pytest.fixture(scope="class")
    def src(self):
        p = os.path.join(os.path.dirname(__file__), "..", "api", "v1_public.py")
        return open(p).read()

    def test_sentiment_no_longer_caps_at_1000(self, src):
        assert ".limit(1000)" not in src

    def test_sentiment_pages_to_exhaustion(self, src):
        assert "fetch_all(_page)" in src

    def test_truncation_is_surfaced_to_the_caller(self, src):
        assert '"truncated": truncated' in src
