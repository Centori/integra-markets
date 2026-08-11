"""Feed personalization: stored alert_preferences flow into the news pipeline.

Covers the pure merge logic (_resolve_preferences) — precedence, defaults,
tier-capped custom RSS urls — without touching Supabase or the network.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.news_feed import (  # noqa: E402
    DEFAULT_COMMODITIES,
    DEFAULT_REGIONS,
    NewsFeedRequest,
    _clean_str_list,
    _resolve_preferences,
)

INF = float("inf")


def test_anonymous_defaults():
    prefs = _resolve_preferences(NewsFeedRequest(), None, "free_trial", 0)
    assert prefs["commodities"] == DEFAULT_COMMODITIES
    assert prefs["regions"] == DEFAULT_REGIONS
    assert prefs["keywords"] == []
    assert prefs["websiteURLs"] == []
    assert prefs["_personalized"] is False


def test_stored_preferences_flow_through():
    stored = {
        "commodities": ["Crude Oil", "Natural Gas"],
        "regions": ["US"],
        "keywords": ["OPEC", "pipeline"],
        "website_urls": ["https://example.com/rss"],
        "alert_threshold": "High",
    }
    prefs = _resolve_preferences(NewsFeedRequest(), stored, "basic_markets", 10)
    assert prefs["commodities"] == ["Crude Oil", "Natural Gas"]
    assert prefs["keywords"] == ["OPEC", "pipeline"]
    assert prefs["regions"] == ["US"]
    assert prefs["websiteURLs"] == ["https://example.com/rss"]
    assert prefs["alertThreshold"] == "high"  # normalized to lowercase
    assert prefs["_personalized"] is True


def test_request_fields_override_stored():
    stored = {"commodities": ["Gold"], "keywords": ["fed"]}
    req = NewsFeedRequest(commodities=["Wheat"], keywords=["drought"])
    prefs = _resolve_preferences(req, stored, "basic", 3)
    assert prefs["commodities"] == ["Wheat"]
    assert prefs["keywords"] == ["drought"]


def test_legacy_commodity_filter_still_wins_over_stored():
    stored = {"commodities": ["Gold"]}
    req = NewsFeedRequest(commodity_filter="oil")
    prefs = _resolve_preferences(req, stored, "free_trial", 0)
    assert prefs["commodities"] == ["oil"]


def test_custom_rss_capped_by_tier():
    stored = {"website_urls": [f"https://s{i}.com/rss" for i in range(8)]}
    free = _resolve_preferences(NewsFeedRequest(), stored, "free_trial", 0)
    basic = _resolve_preferences(NewsFeedRequest(), stored, "basic", 3)
    pro = _resolve_preferences(NewsFeedRequest(), stored, "basic_markets", INF)
    assert free["websiteURLs"] == []          # free: no custom sources
    assert len(basic["websiteURLs"]) == 3     # basic: capped at 3
    assert len(pro["websiteURLs"]) == 8       # unlimited keeps all


def test_clean_str_list_hardening():
    assert _clean_str_list(None) == []
    assert _clean_str_list("not-a-list") == []
    assert _clean_str_list([1, "", "  ", "ok", None]) == ["ok"]
    assert len(_clean_str_list([f"k{i}" for i in range(50)])) == 20  # capped
