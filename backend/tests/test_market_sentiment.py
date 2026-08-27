"""GET /api/sentiment/market.

Why this endpoint's availability is load-bearing: the mobile dashboard fetch
opens with it and treats a non-200 as fatal to the entire load.

    // app/services/api.js  dashboardApi.getTodayDashboard
    const response = await fetch(`${API_URL}/sentiment/market`);
    if (!response.ok) throw new Error(...);      // never reaches /news/feed

The route lived only in main_simple_nlp.py, which is not the deployed
entrypoint, so it 404'd. The throw produced `{news: []}`, `loadNews` then
called `loadCachedFeed()`, and `loadCachedFeed` has no TTL — so the app
re-served its last cached batch forever. The feed looked frozen while
POST /api/news/feed was returning correctly ordered fresh articles.

Hence the central assertion here: it must answer 200 even when the archive is
empty or unreachable. A 5xx would reinstate the frozen feed.
"""
import asyncio
import datetime as dt
import os
import sys

import pytest

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))
sys.path.insert(0, _HERE)

from api.market_sentiment import get_market_sentiment as _get_market_sentiment  # noqa: E402


def get_market_sentiment():
    """Sync wrapper: pytest-asyncio is not available here."""
    return asyncio.run(_get_market_sentiment())


def _iso(hours_ago: float) -> str:
    return (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=hours_ago)).isoformat()


class FakeQuery:
    def __init__(self, rows_by_entity):
        self.rows_by_entity, self.entity = rows_by_entity, None

    def select(self, *_a, **_k):
        return self

    def eq(self, col, val):
        if col == "entity":
            self.entity = val
        return self

    def gte(self, *_a, **_k):
        return self

    def order(self, *_a, **_k):
        return self

    def limit(self, *_a, **_k):
        return self

    def execute(self):
        return type("R", (), {"data": self.rows_by_entity.get(self.entity, [])})()


class FakeSupabase:
    def __init__(self, rows_by_entity):
        self.rows_by_entity = rows_by_entity

    def table(self, _name):
        return FakeQuery(self.rows_by_entity)


def _install(monkeypatch, client):
    import services._supabase as sb
    monkeypatch.setattr(sb, "get_supabase_client", lambda: client)


def _mentions(*scores):
    # published_at, not extracted_at: the time axis is publication date. See
    # migration 20260827_entity_mentions_published_at — scoring 2020 articles
    # stamps extracted_at with today, so an extracted_at window would pull
    # five-year-old news into "sentiment right now".
    return [{"score": s, "sentiment": "neutral", "published_at": _iso(1)} for s in scores]


class TestAlwaysAnswers200:
    """The property that keeps the mobile feed from freezing."""

    def test_empty_archive_still_returns_a_payload(self, monkeypatch):
        _install(monkeypatch, FakeSupabase({}))
        result = get_market_sentiment()
        assert result["overall"] == "NEUTRAL"
        assert result["confidence"] == 0.0
        assert len(result["commodities"]) == 6
        assert all(c["sample_size"] == 0 for c in result["commodities"])

    def test_unreachable_database_does_not_raise(self, monkeypatch):
        import services._supabase as sb

        def boom():
            raise RuntimeError("supabase unreachable")

        monkeypatch.setattr(sb, "get_supabase_client", boom)
        result = get_market_sentiment()
        assert result["commodities"] == []
        assert result["overall"] == "NEUTRAL"

    def test_query_error_for_one_commodity_does_not_sink_the_rest(self, monkeypatch):
        class PartlyBroken(FakeSupabase):
            def table(self, name):
                q = super().table(name)
                original = q.execute

                def execute():
                    if q.entity == "gold":
                        raise RuntimeError("timeout")
                    return original()

                q.execute = execute
                return q

        _install(monkeypatch, PartlyBroken({"oil": _mentions(0.8, 0.9)}))
        result = get_market_sentiment()
        by_name = {c["name"]: c for c in result["commodities"]}
        assert by_name["OIL"]["sentiment"] == "BULLISH"
        assert by_name["GOLD"]["sample_size"] == 0


class TestComputesFromRealData:
    """The legacy implementation returned a hardcoded list with the comment
    'in production, this would use real data'."""

    def test_bullish_scores_read_bullish(self, monkeypatch):
        _install(monkeypatch, FakeSupabase({"oil": _mentions(0.8, 0.75, 0.9)}))
        oil = {c["name"]: c for c in (get_market_sentiment())["commodities"]}["OIL"]
        assert oil["sentiment"] == "BULLISH"
        assert oil["avg_score"] == pytest.approx(0.8167, abs=1e-3)
        assert oil["sample_size"] == 3
        assert oil["change"] > 0

    def test_bearish_scores_read_bearish(self, monkeypatch):
        _install(monkeypatch, FakeSupabase({"wheat": _mentions(0.2, 0.3)}))
        wheat = {c["name"]: c for c in (get_market_sentiment())["commodities"]}["WHEAT"]
        assert wheat["sentiment"] == "BEARISH"
        assert wheat["change"] < 0

    def test_scores_at_the_midpoint_read_neutral(self, monkeypatch):
        _install(monkeypatch, FakeSupabase({"corn": _mentions(0.5, 0.52, 0.48)}))
        corn = {c["name"]: c for c in (get_market_sentiment())["commodities"]}["CORN"]
        assert corn["sentiment"] == "NEUTRAL"

    def test_overall_follows_the_majority(self, monkeypatch):
        _install(monkeypatch, FakeSupabase({
            "oil": _mentions(0.9), "gold": _mentions(0.85), "wheat": _mentions(0.2),
        }))
        result = get_market_sentiment()
        assert result["overall"] == "BULLISH"
        assert result["confidence"] > 0.65

    def test_a_tie_is_neutral(self, monkeypatch):
        _install(monkeypatch, FakeSupabase({"oil": _mentions(0.9), "wheat": _mentions(0.1)}))
        assert (get_market_sentiment())["overall"] == "NEUTRAL"

    def test_unobserved_commodities_are_not_invented(self, monkeypatch):
        """Reported with sample_size 0 and a null score, never a plausible fake."""
        _install(monkeypatch, FakeSupabase({"oil": _mentions(0.8)}))
        by_name = {c["name"]: c for c in (get_market_sentiment())["commodities"]}
        assert by_name["COPPER"]["avg_score"] is None
        assert by_name["COPPER"]["sample_size"] == 0
        assert by_name["COPPER"]["change"] == 0.0
        # And an unobserved commodity must not sway the overall reading.
        assert (get_market_sentiment())["overall"] == "BULLISH"


class TestContract:
    def test_legacy_response_keys_are_preserved(self, monkeypatch):
        _install(monkeypatch, FakeSupabase({"oil": _mentions(0.8)}))
        result = get_market_sentiment()
        for key in ("overall", "confidence", "timestamp", "commodities", "analysis_method"):
            assert key in result
        for key in ("name", "sentiment", "change", "confidence"):
            assert key in result["commodities"][0]

    def test_all_six_tracked_commodities_are_always_present(self, monkeypatch):
        _install(monkeypatch, FakeSupabase({}))
        names = {c["name"] for c in (get_market_sentiment())["commodities"]}
        assert names == {"OIL", "NAT GAS", "WHEAT", "GOLD", "CORN", "COPPER"}

    def test_confidence_never_exceeds_one(self, monkeypatch):
        _install(monkeypatch, FakeSupabase({e: _mentions(*([0.9] * 400))
                                            for e in ("oil", "gold", "wheat")}))
        result = get_market_sentiment()
        assert result["confidence"] <= 1.0
        assert all(c["confidence"] <= 1.0 for c in result["commodities"])
