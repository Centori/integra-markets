"""Headlines that were scored backwards, and the reasons they were.

Found by reading production output rather than by testing: three of the scores
attached to real articles in the database disagreed with the plain meaning of
the headline. All three were ±0.36, which is what suggested one mechanism
rather than three unrelated misses.

Two mechanisms, as it turned out, and neither was the rulebook being wrong
about the market:

  1. THE GAP SKIPPED THE VERB. "Gold slips as rising oil prices, Treasury
     yields dent appeal" scored BULLISH. The subject matched correctly — gold —
     and the 28-character gap then carried the match straight over "slips" to
     reach "rising" nine characters later. A gap wide enough to be useful is
     wide enough to step over the word that answers the question.

  2. AN UNANCHORED ADJECTIVE. "Corn Bulls Flock Back in as Export Shipments
     Remain Strong" scored BEARISH on the single word "Strong", because
     `strong\\w*` sat as a bare alternative inside the Ample supply rule.
     Strong exports are demand, and demand is bullish.

A third class surfaced while fixing those: rules that were right and simply
never matched, which is the failure this rulebook exists to prevent.
"""

from __future__ import annotations

import pytest

from services.commodity_sentiment import analyze_market_sentiment

# (headline, commodity, expected) — every one of these is a real headline from
# the production feed, except where noted.
FIXED = [
    ("Gold slips as rising oil prices, Treasury yields dent appeal", "gold", "BEARISH"),
    ("Corn Bulls Flock Back in on Monday as Export Shipments Remain Strong", "corn", "BULLISH"),
    ("Copper Erases Tariff Selloff as Shanghai Stockpiles Hit Three-Year Low", "copper", "BULLISH"),
]

# Cases that must not move while the above are fixed.
CONTROLS = [
    ("Oil Prices Surge to Four-Month Highs as War Risks Mount", "oil", "BULLISH"),
    ("Brent futures fell as demand fears mount", "oil", "BEARISH"),
    ("Gold hits record high on safe haven demand", "gold", "BULLISH"),
    ("Copper inventories rose sharply at LME warehouses", "copper", "BEARISH"),
    ("LME copper stocks fell to a three-year low", "copper", "BULLISH"),
    ("Record corn crop pressures prices", "corn", "BEARISH"),
    ("Wheat eases after Monday's rally", "wheat", "BEARISH"),
    ("Silver retreats from multi-year highs", "silver", "BEARISH"),
]


@pytest.mark.parametrize("text,commodity,expected", FIXED)
def test_the_reported_inversions(text, commodity, expected):
    assert analyze_market_sentiment(text, commodity)["sentiment"] == expected


@pytest.mark.parametrize("text,commodity,expected", CONTROLS)
def test_controls_still_read_correctly(text, commodity, expected):
    assert analyze_market_sentiment(text, commodity)["sentiment"] == expected


def test_the_gap_cannot_step_over_a_contradicting_verb():
    """The mechanism itself, stated so a future widening of the gap fails here.

    Both verbs are present and the FIRST one after the subject governs. Without
    the direction-aware gap, the pattern is free to ignore it and take the one
    that agrees with the rule it belongs to — which means every rule can find
    evidence for itself in a sentence that says the opposite.
    """
    import re

    from services.commodity_sentiment import get_commodity_rulebook

    rules = {
        r["signal"]: r["pattern"]
        for direction in ("bullish", "bearish")
        for r in get_commodity_rulebook()["gold"][direction]
        if r["signal"].startswith("Price action")
    }
    text = "Gold slips as rising oil prices, Treasury yields dent appeal"

    # Asserted on the patterns rather than on the verdict, because a sentence
    # rich enough to carry both verbs usually carries a second real signal too,
    # and then the test would be measuring the blend instead of the gap.
    assert not re.search(rules["Price action up"], text, re.I), (
        "the gap stepped over 'slips' to reach 'rising' — the original bug"
    )
    assert re.search(rules["Price action down"], text, re.I), (
        "'slips' is the verb governing this sentence and must match"
    )


def test_strong_alone_is_not_a_supply_statement():
    """`strong` needs a noun before it means ample supply.

    It reached production as a bare alternative, so any sentence containing the
    word — about demand, prices, exports, anything — was read as abundant
    supply and scored bearish.
    """
    assert analyze_market_sentiment(
        "Corn export demand remains strong on Chinese buying", "corn"
    )["sentiment"] == "BULLISH"
    # And the real supply statement still reads bearish.
    assert analyze_market_sentiment(
        "Strong corn harvest weighs on the market", "corn"
    )["sentiment"] == "BEARISH"


def test_mining_equities_are_not_read_as_warehouse_inventory():
    """Why bare `stocks` still requires an exchange qualifier.

    "Copper Stocks Sink as White House Tariff Uncertainty Spooks Traders" is a
    real headline about mining SHARES. Allowing bare `stocks` to mean inventory
    would read a selloff as a bullish inventory draw — inverting a headline
    while appearing to fix inversions.

    This asserts only that the inventory rule stays out of it. The product
    decision is that equities stories should not be scored as commodity
    sentiment AT ALL, which is an exclusion at ingest rather than a rule here;
    until that lands, this keeps the specific misreading from happening.
    """
    result = analyze_market_sentiment(
        "Copper Stocks Sink as White House Tariff Uncertainty Spooks Traders", "copper"
    )
    assert result["sentiment"] != "BULLISH"
    signals = {
        s["signal"] for s in result.get("market_context", {}).get("matched_signals", [])
    }
    assert "Exchange stock draw" not in signals


def test_inventory_needs_no_exchange_named_first():
    """The rule was right and simply never matched.

    It required an exchange name BEFORE the word, so "Copper inventories rose
    sharply at LME warehouses" — which names the exchange four words later —
    fell through to tone. `inventories` and `stockpiles` are unambiguous on
    their own and no longer wait for a qualifier.
    """
    signals = {
        s["signal"]
        for s in analyze_market_sentiment(
            "Copper inventories rose sharply at LME warehouses", "copper"
        )["market_context"]["matched_signals"]
    }
    assert "Exchange stock build" in signals


def test_observed_inventory_outweighs_tone():
    """Why the weight moved from 0.8 to 0.9.

    Below SENTIMENT_RULE_DOMINANCE_WEIGHT a rule cannot govern the reading, so
    a reported inventory move fired, was overruled by the sentence's tone, and
    scored NEUTRAL. The grain equivalent has always been 0.9 for the same kind
    of statement.
    """
    from services.commodity_sentiment import (
        SENTIMENT_RULE_DOMINANCE_WEIGHT,
        signal_weight,
    )

    for signal in ("Exchange stock draw", "Exchange stock build"):
        assert signal_weight(signal) >= SENTIMENT_RULE_DOMINANCE_WEIGHT, (
            f"{signal} cannot govern a reading it is the direct evidence for"
        )
    assert signal_weight("Exchange stock draw") == signal_weight("Stocks tightening")
