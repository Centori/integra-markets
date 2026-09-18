"""Negative-sounding supply news is BULLISH for the commodity.

This is the distinction the engine kept getting backwards, and it is the whole
reason a commodity rulebook exists. "Attacks", "slumps", "halted", "disruption"
all read as bad news, and VADER scores them accordingly — but a supply event
removes barrels from the market and lifts the price. Demand down is bearish;
supply down is bullish; both sound negative.

Every case below was reported from production scoring the wrong direction, or is
a control that had to keep its existing answer. They failed not because the
rulebook was wrong but because no rule MATCHED, so the blend fell back to tone
alone — which is inverted for this whole class of news.

The controls matter as much as the fixes. It is easy to make supply news bullish
by making everything bullish.
"""

from __future__ import annotations

import pytest

from services.commodity_sentiment import analyze_market_sentiment

# (headline, commodity, expected) — reported inversions.
FIXED = [
    # Attacked infrastructure. Failed on vocabulary: "energy sites" was not in
    # the asset noun class, though "refinery" and "pipeline" were.
    ("Oil Prices Near $100 After Fresh Attacks on Saudi Energy Sites", "oil", "BULLISH"),
    # Chokepoint. Nothing in the rulebook knew what Hormuz was, and "slumps" is
    # not an attack verb, so the most consequential shipping event in the oil
    # market matched no rule at all.
    ("Hormuz Tanker Traffic Slumps as Saudi Arabia Halts Some Operations", "oil", "BULLISH"),
    # Geopolitical risk with the commodity first. The rule required
    # (war).{0,24}(oil), so every headline that led with the price move missed.
    ("Oil Prices Surge to Four-Month Highs as War Risks Mount", "oil", "BULLISH"),
    # Demand expressed as a flow. A refiner does not "demand" crude in a
    # headline; it imports it.
    ("China crude imports rose for a second month, up 6.2% from July", "oil", "BULLISH"),
    # Explicit price action. Nothing read the stated direction.
    ("Crude oil prices extended their climb, reaching the highest since May", "oil", "BULLISH"),
    ("Saudi Arabia halts some operations at energy facilities after attacks", "oil", "BULLISH"),
]

# Controls: these were already right and must stay right.
CONTROLS = [
    ("Oil prices set for weekly fall on easing supply fears", "oil", "BEARISH"),
    ("Global demand for crude collapses as recession deepens", "oil", "BEARISH"),
    ("Chinese refinery runs fell sharply on weak margins", "oil", "BEARISH"),
    # Mirror of the chokepoint rule. Flows normalising is bearish.
    ("Red Sea transits recover as shipping returns to normal routes", "oil", "BEARISH"),
    ("OPEC+ agrees to raise output quotas from next month", "oil", "BEARISH"),
    # Mirror of price action.
    ("Brent tumbles to a three-month low on demand worries", "oil", "BEARISH"),
]


@pytest.mark.parametrize("text,commodity,expected", FIXED)
def test_supply_events_are_bullish(text, commodity, expected):
    result = analyze_market_sentiment(text, commodity)
    assert result["sentiment"] == expected, (
        f"{text!r} scored {result['sentiment']} via {result.get('method')}. "
        f"A supply disruption is bullish for the commodity; scoring it on tone "
        f"alone inverts the sign."
    )


@pytest.mark.parametrize("text,commodity,expected", CONTROLS)
def test_genuinely_bearish_news_stays_bearish(text, commodity, expected):
    result = analyze_market_sentiment(text, commodity)
    assert result["sentiment"] == expected, (
        f"{text!r} scored {result['sentiment']}. Making supply news bullish must "
        f"not be achieved by making everything bullish."
    )


@pytest.mark.parametrize("text,commodity", [(t, c) for t, c, _ in FIXED])
def test_the_rulebook_decides_not_tone(text, commodity):
    """The fix is that a RULE matches, not that tone was re-tuned.

    Each of these previously produced `vader_v2` — pure tone, no rule. If one
    starts doing so again, the rule stopped matching and the sign will follow.
    """
    result = analyze_market_sentiment(text, commodity)
    assert result.get("method") != "vader_v2", (
        f"{text!r} fell through to tone alone. The rulebook no longer covers it."
    )
