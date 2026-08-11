"""Every engine reacts to a commodity mention through ONE vocabulary.

Regression guard: before this, `enhanced_sentiment` carried its own 5-bucket
sector dictionary, so a headline about helium or LPG was tagged by the news
pipeline but invisible to sector scoring. Adding a topic must light it up
everywhere at once.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.topic_taxonomy import (  # noqa: E402
    CATEGORIES,
    TOPICS,
    classify,
    detect_topics,
    sector_terms,
    topic_for_alias,
)

LPG = "LPG cargoes to Asia surge as propane demand climbs"
LITHIUM = "Lithium carbonate slumps on spodumene oversupply"


def test_classify_returns_everything_an_engine_needs():
    out = classify(LPG, title=LPG)
    assert "lpg_ngl" in out["topics"]
    assert "energy_products" in out["categories"]
    assert "LPG / NGLs" in out["labels"]
    # no market prices LPG, so it must not reach divergence
    assert "lpg_ngl" not in out["tradable_topics"]


def test_classify_separates_tradable_from_tagging_only():
    text = "Oil prices climb while lithium carbonate slumps"
    out = classify(text, title=text)
    assert "crude_oil" in out["tradable_topics"]
    assert "lithium" in out["topics"]
    assert "lithium" not in out["tradable_topics"]


def test_sector_terms_covers_every_category():
    terms = sector_terms()
    for cat in {t["category"] for t in TOPICS.values()}:
        assert cat in terms and terms[cat], f"no sector terms for {cat}"
        assert cat in CATEGORIES


def test_sentiment_engine_sees_the_niche_vocabulary():
    flat = {kw for terms in sector_terms().values() for kw in terms}
    for kw in ["propane", "spodumene", "helium", "baltic dry", "potash", "u3o8"]:
        assert kw in flat, f"sector vocabulary missing {kw!r}"


def test_reverse_alias_lookup():
    assert topic_for_alias("propane") == "lpg_ngl"
    assert topic_for_alias("spodumene") == "lithium"
    assert topic_for_alias("Baltic Dry") == "freight_shipping"
    assert topic_for_alias("nonsense-term") is None


def test_archive_and_enricher_use_the_same_rule():
    """Both must be title-aware, or divergence reads rows tagged differently."""
    src = (Path(__file__).resolve().parents[1] / "services" / "archive_writer.py").read_text()
    assert "detect_topics(text_for_match, title=article_title)" in src


def test_enhanced_sentiment_sources_from_taxonomy():
    src = (Path(__file__).resolve().parents[1] / "services" / "enhanced_sentiment.py").read_text()
    assert "from services.topic_taxonomy import sector_terms" in src
    assert "self.market_sectors = sector_terms()" in src


def test_precision_guards_still_hold():
    assert "crude_oil" not in detect_topics("Political turmoil rattled markets")
    assert "bitcoin" not in detect_topics(
        "Prices of cryptocurrencies are extremely volatile."
    )
