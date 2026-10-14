"""Six markets the pipeline already reached and nothing could name.

`fetch_agriculture_news` has queried "corn OR soybeans OR wheat OR soybean
meal" since it was written, and `topic_taxonomy` has carried soybean, iron ore,
steel, coffee, arabica, robusta, cocoa and sugar as topics. But a commodity
exists for this engine only if it appears in `_COMMODITY_ALIASES`, and none of
those did — so every soybean article fetched over the platform's whole history
was scored against no rulebook and produced no `entity_mentions` row.

`coffee` and `sugar` were the clearest case of half-wiring: both sat in
`_DRIVER_TERMS` and in the ticker map, so the words could be shown to a reader
as a "key driver", while neither was a market the product could answer a
question about.

Found while drafting App Store metadata. The pt-BR listing led its subtitle
with "Soja" and en-AU with iron ore and coal — the three terms most likely to
be searched by the users those locales were chosen for, and all three resolved
to nothing. Advertising a market you cannot answer about is worse than not
being found: the install happens, the query returns empty, and the user
concludes the product is broken rather than narrow.
"""

from __future__ import annotations

import pathlib
import re

import pytest

import data_sources
from services.commodity_sentiment import (
    _COMMODITY_ALIASES,
    _DRIVER_FALSE_FORMS,
    analyze_market_sentiment,
    get_commodity_rulebook,
    normalize_commodity,
)

NEW_MARKETS = ("soybeans", "sugar", "coffee", "cocoa", "iron_ore", "coal")


class TestTheMarketsExist:
    @pytest.mark.parametrize("canonical", NEW_MARKETS)
    def test_the_engine_can_name_it(self, canonical):
        assert canonical in set(_COMMODITY_ALIASES.values())

    @pytest.mark.parametrize("canonical", NEW_MARKETS)
    def test_it_has_a_rulebook(self, canonical):
        """Without one the article is scored on tone alone, which is the
        output this product exists not to ship: a number with no evidence."""
        book = get_commodity_rulebook()[canonical]
        assert book["bullish"] and book["bearish"]

    @pytest.mark.parametrize("alias,canonical", [
        ("soybean", "soybeans"), ("soy", "soybeans"), ("soymeal", "soybeans"),
        ("soybean meal", "soybeans"), ("soyoil", "soybeans"),
        ("sugar", "sugar"), ("raw sugar", "sugar"), ("sugarcane", "sugar"),
        ("coffee", "coffee"), ("arabica", "coffee"), ("robusta", "coffee"),
        ("cocoa", "cocoa"), ("cacao", "cocoa"),
        ("iron ore", "iron_ore"), ("iron-ore", "iron_ore"),
        ("coal", "coal"), ("thermal coal", "coal"), ("coking coal", "coal"),
        ("met coal", "coal"), ("metallurgical coal", "coal"),
    ])
    def test_the_alias_resolves(self, alias, canonical):
        assert normalize_commodity(alias) == canonical


class TestTheWordBoundariesHold:
    """`port` once matched inside "export" and turned a commercial story into a
    physical supply shock. These are the same hazard in the new aliases."""

    @pytest.mark.parametrize("text", [
        "Charcoal producers in the region expanded output",
        "The governing coalition agreed a windfall levy",
        "Supporters coalesced around a single candidate",
    ])
    def test_coal_does_not_match_inside_another_word(self, text):
        assert normalize_commodity(None, text) != "coal"

    def test_bare_iron_is_not_an_alias(self):
        """"iron out", "ironclad", "Iron Dome" are ordinary prose. The market is
        always written in full, so only the two-word form is an alias."""
        assert "iron" not in _COMMODITY_ALIASES
        assert normalize_commodity(None, "Negotiators ironed out the final terms") != "iron_ore"

    def test_bare_cane_is_not_an_alias(self):
        assert "cane" not in _COMMODITY_ALIASES

    def test_the_driver_matcher_guards_coal(self):
        """Unlike the alias matcher, the driver matcher appends `\\w*`, so `coal`
        reaches "coalition" there. A driver is text shown to a reader."""
        assert "coalition" in _DRIVER_FALSE_FORMS["coal"]


# (headline, commodity, expected). Written in the vocabulary each market
# actually uses — WASDE and crush for soy, grindings and arrivals for cocoa,
# portside stocks and mill margins for iron ore.
READINGS = [
    ("Soybean export sales rose sharply as China booked three cargoes", "soybeans", "BULLISH"),
    ("Brazil harvests a record soybean crop, pressuring Chicago futures", "soybeans", "BEARISH"),
    ("USDA cut its soybean yield estimate in the August WASDE", "soybeans", "BULLISH"),
    ("India extends its sugar export ban through the season", "sugar", "BULLISH"),
    ("Mills divert more cane to ethanol as parity shifts", "sugar", "BULLISH"),
    ("Sugar surplus widens as Brazil crushes a record cane crop", "sugar", "BEARISH"),
    ("Frost in Minas Gerais damages arabica trees", "coffee", "BULLISH"),
    ("ICE certified coffee stocks rose to a three-year high", "coffee", "BEARISH"),
    ("Ivory Coast cocoa arrivals fell behind last season's pace", "cocoa", "BULLISH"),
    ("Cocoa grindings missed estimates across all three regions", "cocoa", "BEARISH"),
    ("Port iron ore inventories piled up as mills curbed output", "iron_ore", "BEARISH"),
    ("Cyclone halts Pilbara shipments, Rio Tinto cuts guidance", "iron_ore", "BULLISH"),
    ("Newcastle thermal coal climbs as power demand hits a record", "coal", "BULLISH"),
    ("Utility coal stockpiles built on mild winter weather", "coal", "BEARISH"),
]


@pytest.mark.parametrize("text,commodity,expected", READINGS)
def test_the_reading(text, commodity, expected):
    assert analyze_market_sentiment(text, commodity)["sentiment"] == expected


@pytest.mark.parametrize("text,commodity", [(t, c) for t, c, _ in READINGS])
def test_every_reading_carries_named_evidence(text, commodity):
    """A direction with no named signal is the tone fallback wearing a
    rulebook's clothes, and it cannot be checked against the article."""
    signals = analyze_market_sentiment(text, commodity)["market_context"]["matched_signals"]
    assert signals, f"{text!r} scored on tone alone — no rule fired"


class TestTheOrderingFaultsFoundWhileWritingThese:
    def test_the_stress_word_may_precede_the_origin(self):
        """"Frost in Minas Gerais" puts the weather first. The rule wanted the
        place name first and fired nothing, leaving only the 0.8 weather
        modifier — which sits below SENTIMENT_RULE_DOMINANCE_WEIGHT, so tone
        governed and a frost headline read NEUTRAL.

        The same fault, with the same cause, as the inventory rule that required
        an exchange to be named before the word `inventories`.
        """
        for text in (
            "Frost in Minas Gerais damages arabica trees",
            "Minas Gerais hit by frost, damaging arabica trees",
        ):
            signals = {
                s["signal"]
                for s in analyze_market_sentiment(text, "coffee")["market_context"]["matched_signals"]
            }
            assert "Origin crop stress" in signals, text

    def test_a_verb_followed_by_a_space_still_matches(self):
        """`divert\\w+` demands a word character after the verb, so it missed
        "Mills divert more cane to ethanol" — the single most common way the
        Brazilian crush story is written."""
        signals = {
            s["signal"]
            for s in analyze_market_sentiment(
                "Mills divert more cane to ethanol as parity shifts", "sugar"
            )["market_context"]["matched_signals"]
        }
        assert "Cane diverted to ethanol" in signals


class TestSomethingActuallyFetchesThem:
    """A market the engine can name but no source fetches is still empty, and
    looks identical from outside to a market nobody is writing about.

    This is deliberately not a blanket assertion over every canonical: the
    metals and agriculture trade-press queries are scoped by SITE, so they
    cover gold, silver and copper without naming them. It asserts only the six
    added here, each of which needed a query that did not exist.
    """

    @pytest.fixture(scope="class")
    def source(self):
        return pathlib.Path(data_sources.__file__).read_text()

    @pytest.mark.parametrize("term", ["sugar", "coffee", "arabica", "robusta", "cocoa"])
    def test_a_query_asks_for_the_soft(self, term, source):
        assert re.search(rf"\b{term}\b", source, re.I), (
            f"no source queries for {term}; the fetcher docstring claimed softs "
            f"while the query named none"
        )

    @pytest.mark.parametrize("term", ["iron ore", "thermal coal", "coking coal"])
    def test_a_query_asks_for_the_bulk(self, term, source):
        assert term.lower() in source.lower(), f"no source queries for {term}"

    def test_the_new_queries_are_scheduled(self):
        """Both ride inside fetchers the scheduler already runs. A new fetcher
        that nothing calls is the failure this repo has shipped twice."""
        job = pathlib.Path("jobs/news_fetcher.py").read_text()
        for fetcher in ("fetch_agriculture_news", "fetch_metals_news"):
            assert fetcher in job


class TestTheDirectionsAreSymmetric:
    """One word changed should not change how willing the engine is to commit.

    `Supply surplus` was registered at 0.8 and its mirror `Supply deficit` was
    not, so it took the 1.0 default. The consequence, on the same sentence:

        "A global sugar deficit is forecast for next season"  -> BULLISH
        "A global sugar surplus is forecast for next season"  -> NEUTRAL

    A forecast is softer evidence than an observation, and that is true in both
    directions. Both now inform the reading without overruling the sentence's
    tone — which is what `test_observed_inventory_outweighs_tone` asserts for
    inventories, applied to the pair that had drifted.
    """

    def test_mirrored_signals_carry_equal_weight(self):
        from services.commodity_sentiment import _MIRROR_PAIRS, signal_weight

        asymmetric = [
            (a, b, signal_weight(a), signal_weight(b))
            for a, b in _MIRROR_PAIRS
            if signal_weight(a) != signal_weight(b)
        ]
        assert not asymmetric, (
            "mirrored signals with unequal weight make the engine readier to "
            f"call one direction than the other on identical evidence: {asymmetric}"
        )

    def test_a_bare_forecast_informs_but_does_not_govern(self):
        for word, commodity in (("deficit", "sugar"), ("surplus", "sugar"),
                                ("deficit", "cocoa"), ("surplus", "cocoa")):
            text = f"A global {commodity} {word} is forecast for next season"
            result = analyze_market_sentiment(text, commodity)
            assert result["sentiment"] == "NEUTRAL", text
            assert result["market_context"]["matched_signals"], (
                f"{text!r} should still report the signal it found"
            )
