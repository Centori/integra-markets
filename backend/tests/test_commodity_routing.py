"""Which rulebook runs is decided by `normalize_commodity`.

A wrong answer here is not noise — it applies an entirely different market's
directional rules to the article, and since a one-sided fundamental read can now
determine the label outright, it hands full authority to the wrong rulebook.

The old implementation matched bare substrings and returned the first dict key
found:

    "Goldman Sachs downgraded the sector"     -> gold
    "Las Vegas Sands reported record revenue" -> gas
    "Cornerstone Capital raised its target"   -> corn
    "The plan was spoiled by a delay"         -> oil

"Goldman Sachs" appears in a large share of financial news. This is the third
instance of the same bug class in this codebase, after `bullish` matching
"bullion" and the client's `'ai'` matching "Ag-ai-n".
"""

from __future__ import annotations

import sys
import types

import pytest


@pytest.fixture(scope="module")
def nlp():
    existing = sys.modules.get("supabase")
    if getattr(existing, "create_client", None) is None:
        fake = types.ModuleType("supabase")
        fake.create_client = lambda *a, **k: None
        fake.Client = object
        sys.modules["supabase"] = fake
    import main_simple_nlp

    # `vader_analyzer` is assigned inside FastAPI's lifespan, so it is None on a
    # plain import and analyze_market_sentiment silently falls through to
    # basic_sentiment_analysis — a different function, different return shape,
    # and a 20-word keyword list instead of the lexicons. The same trap already
    # corrupted jobs/archive_scorer.py and jobs/news_fetcher.py in production.
    if main_simple_nlp.vader_analyzer is None:
        from services.sentiment_engine import get_analyzer

        main_simple_nlp.vader_analyzer = get_analyzer()

    return main_simple_nlp


# ------------------------------------------------------ the false positives


@pytest.mark.parametrize(
    "text",
    [
        "Goldman Sachs downgraded the whole sector this morning.",
        "Las Vegas Sands reported record quarterly revenue.",
        "Cornerstone Capital raised its price target for the miner.",
        "Silverstein Properties refinanced its Manhattan tower.",
        "The plan was spoiled by a last-minute regulatory objection.",
        "Goldsmith and Silverman were appointed to the board.",
    ],
)
def test_company_names_do_not_resolve_to_a_commodity(nlp, text):
    assert nlp.normalize_commodity(None, text) is None


# ---------------------------------------------------------- correct routing


@pytest.mark.parametrize(
    "text,expected",
    [
        ("Brent crude oil prices rose on OPEC news.", "oil"),
        ("Henry Hub natural gas storage drew sharply.", "gas"),
        ("A wheat cargo was loaded at the Black Sea port.", "wheat"),
        ("Gold prices hit a record as bullion demand rose.", "gold"),
        ("Uranium spot prices climbed as U3O8 supply tightened.", "uranium"),
        ("Maize planting progressed ahead of schedule.", "corn"),
    ],
)
def test_real_mentions_still_resolve(nlp, text, expected):
    assert nlp.normalize_commodity(None, text) == expected


def test_refined_products_are_not_natural_gas(nlp):
    """"gasoline" contains "gas". Under substring matching every motor-fuel
    story was scored against the natural-gas rulebook — two markets that move on
    entirely different fundamentals.

    Products now have their own book rather than borrowing crude's, because they
    move INVERSELY to crude on a refinery outage: crude that cannot be processed
    backs up while product supply tightens.
    """
    assert nlp.normalize_commodity(None, "Gasoline demand fell in the shoulder season.") == "refined_products"
    assert nlp.normalize_commodity(None, "Diesel crack spreads widened sharply.") == "refined_products"


def test_refinery_attacks_stay_with_crude(nlp):
    """"refinery" deliberately still routes to oil. A refinery being attacked is
    as much a crude story as a product one, and oil holds the kinetic rules."""
    assert nlp.normalize_commodity(
        None,
        "Saudi Aramco's Jizan refinery was hit in a new attack, threatening oil "
        "infrastructure along the export route.",
    ) == "oil"


def test_plural_aliases_match(nlp):
    """\b after "spread" fails on "crack spreads" — the following "s" is a word
    character — so the alias silently never matched its own commonest form."""
    assert nlp.normalize_commodity(None, "Crack spreads widened.") == "refined_products"


@pytest.mark.parametrize(
    "text,expected",
    [
        ("Copper mine strike halts output as LME stocks fall.", "copper"),
        ("Lithium oversupply deepened as spodumene capacity came online.", "lithium"),
        ("Urea plants curtailed output as gas feedstock costs surged.", "fertilizer"),
        ("Tanker freight rates surged after Red Sea diversions.", "freight"),
        ("Indonesia suspended tin export licences.", "tin"),
        ("Helium rationing continued after a plant outage.", "helium"),
        ("Propane inventories drew below the five-year average.", "lpg"),
        ("Coltan smuggling tightened tantalum supply.", "coltan"),
    ],
)
def test_newly_covered_markets_resolve(nlp, text, expected):
    """topic_taxonomy classifies 39 topics; the rulebook covered 11, so the rest
    were scored on prose tone alone — the mechanism that read a refinery attack
    as 93% bearish."""
    assert nlp.normalize_commodity(None, text) == expected


@pytest.mark.parametrize(
    "text,expected",
    [
        ("Copper mine strike halts output at the Chilean operation as LME stocks fall to a multi-year low.", "BULLISH"),
        ("LME copper inventories rose sharply while Chinese property construction contracted further.", "BEARISH"),
        ("Lithium oversupply deepened as new spodumene capacity came online and EV sales slowed.", "BEARISH"),
        ("Urea plants curtailed output as gas feedstock costs surged, and India issued a new tender.", "BULLISH"),
        ("Diesel crack spreads widened sharply after an unplanned refinery outage.", "BULLISH"),
        ("Wheat ending stocks fell after the WASDE cut production, and crop conditions deteriorated.", "BULLISH"),
        ("Corn carryout rose as the USDA raised its yield estimate and crop conditions improved.", "BEARISH"),
        ("The crude curve flipped into backwardation as prompt spreads firmed.", "BULLISH"),
        ("Crude moved deeper into contango and floating storage economics turned positive.", "BEARISH"),
    ],
)
def test_new_rules_produce_the_right_direction(nlp, text, expected):
    assert nlp.analyze_market_sentiment(text)["sentiment"] == expected


def test_past_tense_matches(nlp):
    """News is written in the past tense; the rulebook was written in the
    present. "inventories rose" missed a pattern matching "rise", and "demand
    strengthened" missed one matching "strong" — so real articles routed to the
    right market and then matched nothing."""
    f = nlp.analyze_fundamental_direction("LME copper inventories rose sharply.", "copper")
    assert "Exchange stock build" in [m["signal"] for m in f["matched_signals"]]


def test_curve_rules_reach_every_storable_market(nlp):
    """Curve structure is defined once and merged, not repeated per commodity."""
    book = nlp.get_commodity_rulebook()
    for market in ("oil", "gas", "wheat", "copper", "lithium"):
        signals = [r["signal"] for r in book[market]["bullish"]]
        assert "Backwardation" in signals, market
    # No storage economics in FX or macro, so no curve.
    assert "Backwardation" not in [r["signal"] for r in book["forex"]["bullish"]]


def test_specific_alias_outranks_generic_one(nlp):
    """An article saying "natural gas" once and "gas" twice is about gas either
    way, but "crude oil" must not lose to a passing mention of something else."""
    text = "Crude oil exports rose, though some gas was flared at the site."
    assert nlp.normalize_commodity(None, text) == "oil"


def test_most_discussed_commodity_wins(nlp):
    """Resolution scores every alias rather than returning whichever came first
    in a dict, so the answer no longer depends on declaration order."""
    text = (
        "Gold edged up. The main story was oil: crude oil inventories fell, "
        "oil exports rose, and oil demand strengthened."
    )
    assert nlp.normalize_commodity(None, text) == "oil"


def test_explicit_commodity_argument_still_wins(nlp):
    """Callers that already know the commodity must not have it re-inferred."""
    assert nlp.normalize_commodity("brent", "a story about wheat") == "oil"
    assert nlp.normalize_commodity("WTI", None) == "oil"


def test_no_commodity_mentioned_returns_none(nlp):
    assert nlp.normalize_commodity(None, "The central bank held rates steady.") is None
    assert nlp.normalize_commodity(None, "") is None
    assert nlp.normalize_commodity(None, None) is None


# ------------------------------------------------- the bearish mirror set
#
# The kinetic-disruption patterns added to the bullish side needed inverses, or
# the pattern imbalance becomes a directional prior nobody chose.


@pytest.mark.parametrize(
    "text,signal",
    [
        ("The US will tap the Strategic Petroleum Reserve with a large release.", "SPR release"),
        ("Sanctions on crude exports were eased under a new waiver.", "Sanctions relief"),
        ("A ceasefire was agreed between the two sides.", "De-escalation"),
        ("The damaged crude pipeline was restarted this morning.", "Supply restored"),
        ("OPEC+ agreed to raise its production quota.", "OPEC quota increase"),
    ],
)
def test_bearish_mirror_vocabulary(nlp, text, signal):
    f = nlp.analyze_fundamental_direction(text, "oil")
    assert signal in [m["signal"] for m in f["matched_signals"]], f


def test_sanctions_imposed_and_eased_are_opposite(nlp):
    """The bullish sanctions pattern had an OPTIONAL trailing group, so a bare
    mention of "sanctions" matched — including "sanctions were eased", which is
    the bearish case. Imposition language is now required."""
    imposed = nlp.analyze_market_sentiment(
        "The EU imposed new sanctions on Russian crude oil exports.", "oil"
    )
    eased = nlp.analyze_market_sentiment(
        "Sanctions on crude oil exports were eased under a new waiver.", "oil"
    )
    assert imposed["sentiment"] == "BULLISH"
    assert eased["sentiment"] == "BEARISH"


# ---------------------------------------------------------------- weights


def test_vague_signals_weigh_less_than_decisive_ones(nlp):
    assert nlp.signal_weight("Energy security support") < nlp.signal_weight("OPEC supply cut")
    assert nlp.signal_weight("Supply disruption risk") < nlp.signal_weight("Infrastructure attack")
    assert nlp.signal_weight("An unlisted signal") == 1.0


def test_mirror_pairs_weigh_the_same(nlp):
    """A bullish rule and its bearish inverse must be equally decisive.

    "Sanctions relief" shipped at 0.80 against "Sanctions imposed" at 0.85,
    which meant imposition cleared the dominance gate alone and relief did not
    — the same event read bullish going in and merely neutral coming out. An
    asymmetry between mirrors is a directional prior smuggled in through the
    weights, which is exactly what per-signal weighting was meant to remove.
    """
    for bullish, bearish in nlp._MIRROR_PAIRS:
        assert nlp.signal_weight(bullish) == nlp.signal_weight(bearish), (
            f"{bullish}={nlp.signal_weight(bullish)} vs "
            f"{bearish}={nlp.signal_weight(bearish)}"
        )
