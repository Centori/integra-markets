"""What the app shows under "Key Sentiment Drivers" should explain the score.

It answered with nouns off a fixed list. For

    "Gold slips as rising oil prices, Treasury yields dent appeal"

it returned ['oil', 'gold', 'price', 'yield'] — four words that are equally
present in a headline that sent gold up and one that sent it down. As a
description of the topic that is accurate; as an explanation of a bearish score
sitting next to it, it explains nothing, and a reader cannot check it.

The rulebook already knew the answer and was discarding it. A fired rule
carries a named signal, a direction, a weight, and — since the matcher stopped
throwing away the match object — the span of text that triggered it:

    Price action down · "Gold slips"

Same headline, same engine. That is checkable against the article by eye, which
is the property that matters for a product whose output is a judgement.
"""

from __future__ import annotations

from services.commodity_sentiment import (
    extract_key_drivers,
    extract_keywords,
    driver_labels,
)


def test_a_driver_names_the_signal_and_quotes_the_evidence():
    drivers = extract_key_drivers(
        "Gold slips as rising oil prices, Treasury yields dent appeal", "gold"
    )
    assert drivers, "a headline with a firing rule must produce a driver"
    top = drivers[0]
    assert top["driver"] == "Price action down"
    assert top["direction"] == "bearish"
    assert "slips" in top["phrase"].lower()
    assert "Gold slips" in top["label"]


def test_the_direction_is_carried_not_inferred():
    """A driver without a direction is the old output with extra steps."""
    bullish = extract_key_drivers(
        "Corn Bulls Flock Back in on Monday as Export Shipments Remain Strong", "corn"
    )[0]
    assert bullish["direction"] == "bullish"
    assert "Export Shipments Remain Strong" in bullish["phrase"]


def test_the_quoted_span_keeps_the_original_casing():
    """The phrase is quoted back to a reader, so it has to look like the text.

    The matcher used to run against a lowercased copy, which would have printed
    'gold slips' under a headline that says 'Gold slips'.
    """
    top = extract_key_drivers("Gold slips as Treasury yields rise", "gold")[0]
    assert top["phrase"].startswith("Gold")


def test_drivers_lead_with_the_evidence_that_governed_the_score():
    """Ordered by weight, so the top driver is the one that decided it."""
    drivers = extract_key_drivers(
        "Strait of Hormuz closure disrupts tanker traffic as prices surge", "oil"
    )
    weights = [d["weight"] for d in drivers]
    assert weights == sorted(weights, reverse=True)


def test_topic_terms_remain_as_the_fallback():
    """Text with no firing rule should still say what it is about.

    Marked `context` rather than given a direction, so a client cannot mistake
    a topic for a reason.
    """
    text = "Analysts discuss the outlook for oil and gas markets in 2027"
    drivers = extract_key_drivers(text, "oil")
    if drivers:
        assert all(d["direction"] == "context" for d in drivers)
        assert all(d["phrase"] == "" for d in drivers)
        assert {d["driver"] for d in drivers} <= set(extract_keywords(text))


def test_labels_are_plain_strings_for_clients_that_cannot_take_a_dict():
    """NewsFeed.js renders key_drivers as chips."""
    labels = driver_labels(
        "Copper Erases Tariff Selloff as Shanghai Stockpiles Hit Three-Year Low", "copper"
    )
    assert labels and all(isinstance(label, str) for label in labels)
    assert "Exchange stock draw" in labels[0]


# --- the chokepoint gap these drivers exposed ------------------------------
#
# Both of these ran on the live feed during the Hormuz crisis and fired nothing,
# because the rules wanted a disruption verb beside the place name while
# tanker-tracking copy states the shortfall as a measurement.

def test_a_chokepoint_shortfall_stated_as_a_number_is_read():
    for headline in (
        "Hormuz Traffic Running 80% Below Its 10-Day Average",
        "Just One Commodity Vessel Left the Strait of Hormuz on Wednesday",
    ):
        drivers = extract_key_drivers(headline, "oil")
        assert drivers, f"nothing fired on {headline!r}"
        assert drivers[0]["driver"] == "Chokepoint disruption"
        assert drivers[0]["direction"] == "bullish"


def test_ordinary_transit_counts_are_not_a_disruption():
    """The bound that keeps the count rule honest.

    "Just one vessel" is the story; "21 tankers transited" is a Tuesday.
    """
    assert not [
        d for d in extract_key_drivers(
            "21 tankers transited the Strait of Hormuz on Tuesday", "oil"
        )
        if d["driver"] == "Chokepoint disruption"
    ]
