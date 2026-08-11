"""Expanded commodity taxonomy: niche commodities are tagged, not badged.

LPG, lithium, helium, freight etc. have no prediction market, so they must
label the article (feed personalization, filtering, alerts) without ever
producing a divergence badge.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.topic_taxonomy import (  # noqa: E402
    CATEGORIES,
    TOPICS,
    detect_topics,
    has_market_coverage,
    list_topics_for_api,
    matching_markets,
    tradable_topics,
)


def test_niche_commodities_are_detected():
    cases = {
        "LPG cargoes to Asia surge as propane demand climbs": "lpg_ngl",
        "Lithium carbonate prices slump on spodumene oversupply": "lithium",
        "Helium shortage forces MRI makers to ration industrial gas": "helium",
        "Baltic Dry index jumps as tanker rates spike in the Suez Canal": "freight_shipping",
        "Urea and potash prices climb on ammonia outage": "fertilizer",
        "Arabica coffee hits record as cocoa and sugar rally": "softs",
        "Iron ore rebounds while rebar demand lifts steel margins": "iron_ore_steel",
        "Uranium spot price rises as enrichment capacity tightens": "uranium",
        "Diesel cracks widen while jet fuel demand recovers": "refined_products",
        "Rare earth export curbs hit neodymium supply": "rare_earths",
        "Palladium and platinum diverge on autocatalyst demand": "platinum_palladium",
        "Live cattle futures climb; lean hogs slip": "livestock",
        "EU ETS carbon price climbs as CBAM nears": "carbon_markets",
        "Cobalt and nickel slide on Indonesian supply": "cobalt_nickel",
    }
    for headline, expected in cases.items():
        found = detect_topics(headline, title=headline)
        assert expected in found, f"{expected!r} not detected in {headline!r} (got {found})"


def test_tagging_only_topics_declare_no_market_coverage():
    for key in ["lpg_ngl", "lithium", "helium", "freight_shipping", "softs"]:
        assert has_market_coverage(key) is False, f"{key} should be tagging-only"


def test_core_topics_keep_market_coverage():
    for key in ["crude_oil", "gold", "fed_rates", "bitcoin", "iran_middle_east"]:
        assert has_market_coverage(key) is True, f"{key} must stay tradable"
    assert set(tradable_topics()) <= set(TOPICS)


def test_matching_markets_is_safe_for_tagging_only_topics():
    markets = [{"title": "Will lithium prices exceed $20k?"}]
    # no matcher declared → must return [] rather than KeyError
    assert matching_markets("lithium", markets, "polymarket") == []
    assert matching_markets("helium", markets, "kalshi") == []


def test_every_topic_has_a_registered_category():
    for key, t in TOPICS.items():
        assert t["category"] in CATEGORIES, f"{key} has unknown category {t['category']}"


def test_api_payload_exposes_market_coverage():
    payload = {t["key"]: t for t in list_topics_for_api()}
    assert payload["lithium"]["market_coverage"] is False
    assert payload["crude_oil"]["market_coverage"] is True
    assert payload["lithium"]["category_label"] == "Battery & transition"


def test_no_regression_on_precision_fixes():
    # word-boundary guards must still hold with the bigger keyword set
    assert "crude_oil" not in detect_topics("Political turmoil rattled markets")
    assert "bitcoin" not in detect_topics(
        "Prices of cryptocurrencies are extremely volatile and may be affected."
    )
    # "tin" must not fire inside ordinary words
    assert "aluminium_zinc" not in detect_topics("Testing continues at the plant")
