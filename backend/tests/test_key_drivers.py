"""Key Sentiment Drivers must actually reach the card.

Two independent faults, both live:

  * `_to_article` never emitted the drivers. The ingest writes them to
    `raw_payload.keywords`, but the store reader dropped them, so
    `item.key_drivers || item.keywords || []` in NewsFeed.js resolved to []
    on every card — on every tier, not only free. This was not a paywall.

  * `extract_keywords` matched with unanchored `term in text_lower`, so the
    terms it did store included "gas" from Vegas, "oil" from turmoil, "corn"
    from cornerstone and "import" from important — which appears in a large
    share of financial copy.
"""

import os
import re
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def _row(payload):
    return {
        "id": "doc-1",
        "title": "SPR Sinks Toward Operational Minimum as U.S. Crude Inventories Build",
        "content": "US crude inventories rose as the SPR fell toward its minimum.",
        "source": "OilPrice.com",
        "url": "https://oilprice.com/x",
        "published_at": "2026-08-26T09:00:00+00:00",
        "raw_payload": payload,
    }


class TestDriversReachTheCard:
    def test_stored_drivers_are_emitted_as_strings(self):
        from services.feed_store import _to_article
        art = _to_article(_row({"keywords": ["oil", "supply", "price"]}), None, [])
        assert art["keywords"] == ["oil", "supply", "price"]

    def test_stored_drivers_are_emitted_as_scored_objects(self):
        """AIAnalysisOverlay maps {word, score}; NewsFeed.js reads strings."""
        from services.feed_store import _to_article
        drivers = _to_article(_row({"keywords": ["oil", "supply"]}), None, [])["key_drivers"]
        assert [d["word"] for d in drivers] == ["oil", "supply"]
        assert all(0.0 < d["score"] <= 1.0 for d in drivers)

    def test_scores_descend_so_leading_terms_rank_higher(self):
        from services.feed_store import _to_article
        drivers = _to_article(_row({"keywords": ["oil", "supply", "price"]}), None, [])["key_drivers"]
        scores = [d["score"] for d in drivers]
        assert scores == sorted(scores, reverse=True)

    def test_both_keys_are_always_present(self):
        """The client reads `key_drivers || keywords`; neither may be absent."""
        from services.feed_store import _to_article
        art = _to_article(_row({}), None, [])
        assert art["keywords"] == [] and art["key_drivers"] == []

    @pytest.mark.parametrize("payload", [
        {"keywords": "oil, gas, price"},   # comma string, older rows
        {"keywords": None},
        {},
        None,                              # no raw_payload at all
    ])
    def test_legacy_row_shapes_do_not_break(self, payload):
        from services.feed_store import _to_article
        assert isinstance(_to_article(_row(payload), None, [])["keywords"], list)

    def test_duplicates_are_collapsed(self):
        from services.feed_store import _to_article
        art = _to_article(_row({"keywords": ["oil", "Oil", "OIL", "gas"]}), None, [])
        assert art["keywords"] == ["oil", "gas"]

    def test_list_is_capped(self):
        from services.feed_store import _to_article
        many = ["oil", "gas", "price", "supply", "demand", "gold", "wheat"]
        assert len(_to_article(_row({"keywords": many}), None, [])["keywords"]) == 5


def _extract_keywords():
    """Load the extractor without importing main_simple_nlp (needs supabase)."""
    src = open(os.path.join(os.path.dirname(__file__), "..", "main_simple_nlp.py")).read()
    block = src[src.index("_DRIVER_TERMS = ["):
                src.index("def extract_trigger_keywords_with_relevance")]
    ns = {"re": re, "List": list}
    exec(block, ns)
    return ns["extract_keywords"]


class TestDriverExtractionBoundaries:
    @pytest.fixture(scope="class")
    def ek(self):
        return _extract_keywords()

    @pytest.mark.parametrize("text,ghost", [
        ("It is important to note this.", "import"),
        ("The cornerstone of the deal.", "corn"),
        ("A weekend in Las Vegas.", "gas"),
        ("The plan was spoiled by turmoil.", "oil"),
        ("The federal offer was accepted.", "fed"),
        ("Gasket failure halted the line.", "gas"),
    ])
    def test_substring_ghosts_are_not_drivers(self, ek, text, ghost):
        assert ghost not in ek(text), f"{ghost!r} falsely extracted from {text!r}"

    @pytest.mark.parametrize("text,expected", [
        ("Crude oil prices rose overnight.", "oil"),
        ("Natural gas storage climbed.", "gas"),
        ("Supply constraints persist.", "supply"),
        ("Production was cut again.", "production"),
        ("Corn futures fell on the harvest.", "corn"),
        ("The Fed held rates steady.", "fed"),
        ("Exports hit a record.", "export"),
    ])
    def test_real_drivers_and_inflections_survive(self, ek, text, expected):
        assert expected in ek(text), f"{expected!r} missed in {text!r}"

    def test_commodities_lead_the_truncated_list(self, ek):
        text = "Oil, gas, gold, wheat and copper prices all moved on supply and demand."
        assert ek(text)[0] in ("oil", "gas", "gold", "wheat", "copper")

    def test_empty_text_is_safe(self, ek):
        assert ek("") == [] and ek(None) == []
