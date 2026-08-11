"""A divergence reading is stamped on ONE article per topic, not all of them.

Live-feed audit (2026-08-11) found 18/18 cards carrying a badge: the feed was
all oil/gold headlines, topic matching was correct, but every matching article
inherited the same per-topic reading. The badge has to identify the single most
relevant story or it reads as wallpaper.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.news_enricher import enrich_articles_with_divergence  # noqa: E402


class FakeReading:
    """Mimics DivergenceReading for crude_oil with both providers priced."""
    delta_polymarket = 0.62
    delta_kalshi = None
    status_polymarket = "DIVERGENCE"
    status_kalshi = "NO_DATA"
    polymarket_implied = 0.31
    kalshi_implied = 0.58


def _patch(monkeypatch_target, reading=FakeReading()):
    import services.news_enricher as ne

    def fake_compute(supabase, topic_key, threshold, lookback_hours):
        return reading if topic_key == "crude_oil" else None

    # detect_topics/compute are imported inside the function, so patch the modules
    import services.divergence as dv
    dv.compute = fake_compute
    dv.DEFAULT_THRESHOLD = 0.15
    dv.DEFAULT_LOOKBACK_HOURS = 24
    return ne


OIL_FEED = [
    {"title": "Markets wrap: equities mixed", "summary": "Crude oil steadied while brent held near highs on refinery news."},
    {"title": "Oil Prices Climb as US-Iran Peace Hopes Fade", "summary": "Crude rose."},
    {"title": "Oil, Gold and Wheat Market Update", "summary": "Oil gained."},
    {"title": "Gold Targets $4,500 as Momentum Holds", "summary": "Bullion rallied."},
]


def test_only_one_article_gets_the_oil_badge():
    ne = _patch(None)
    arts = [dict(a) for a in OIL_FEED]
    ne.enrich_articles_with_divergence(None, arts)
    stamped = [a for a in arts if a.get("divergenceStatus")]
    assert len(stamped) == 1, f"expected 1 stamped card, got {len(stamped)}"


def test_the_owner_is_a_title_match_not_a_body_only_match():
    ne = _patch(None)
    arts = [dict(a) for a in OIL_FEED]
    ne.enrich_articles_with_divergence(None, arts)
    owner = next(a for a in arts if a.get("divergenceStatus"))
    # article[0] mentions oil only in the body; a title match must win
    assert "Oil" in owner["title"], f"badge landed on body-only match: {owner['title']}"
    assert owner["divergenceTopic"] == "crude_oil"


def test_cross_market_also_limited_to_one_card():
    ne = _patch(None)
    arts = [dict(a) for a in OIL_FEED]
    ne.enrich_articles_with_divergence(None, arts)
    crossed = [a for a in arts if a.get("crossMarketStatus")]
    assert len(crossed) <= 1


def test_untagged_articles_stay_clean():
    ne = _patch(None)
    arts = [dict(a) for a in OIL_FEED]
    ne.enrich_articles_with_divergence(None, arts)
    gold = next(a for a in arts if a["title"].startswith("Gold Targets"))
    assert "divergenceStatus" not in gold


def test_empty_feed_is_safe():
    ne = _patch(None)
    assert ne.enrich_articles_with_divergence(None, []) == []
