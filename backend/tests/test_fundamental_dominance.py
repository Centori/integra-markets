"""Commodity fundamentals decide direction; tone decides confidence.

Reported from a live card: "Saudi Aramco's Jizan Refinery Hit Again as Houthi
Attacks Escalate" rendered **93% bearish**. An attack on Red Sea export
infrastructure is bullish for crude — the prose describing a supply shock is
always grim, and the price implication is the opposite.

Two independent defects produced that, and both are covered here.

1. VOCABULARY. The oil rulebook's disruption vocabulary was
   war/conflict/sanctions/embargo/hurricane/storm/outage/disruption. The story
   said "hit in a new attack", "struck again", "Houthi attacks". Not one rule
   matched, so there was no directional signal at all.

2. STRUCTURE, and the more serious of the two. Even with the vocabulary fixed,
   the old blend could not express the answer:

       combined = compound * 0.5 + directional * 0.5      directional in [-0.9, 0.9]

   VADER scores that text at -0.902. With EVERY bullish oil rule firing, the
   blend yields -0.001 — NEUTRAL. The label could never be BULLISH regardless
   of how strong the fundamental evidence was.

The fix lets a one-sided fundamental read with at least
SENTIMENT_RULE_DOMINANCE_MIN independent matches set the direction outright.
Gated deliberately: a single keyword match must not overrule tone, and genuinely
conflicting signals fall back to the blend.
"""

from __future__ import annotations

import sys
import types

import pytest


@pytest.fixture(scope="module")
def nlp():
    """Import the real module, stubbing only the Supabase client it needs at import.

    Stubbing `analyze_market_sentiment` itself would test the stub. The point of
    these cases is the real rulebook against the real VADER lexicons, so the
    stub goes as far down as possible and no further.
    """
    # The installed `supabase` package imports as a namespace but does NOT
    # provide create_client, so main_simple_nlp's top-level import raises. A
    # "not in sys.modules" guard is not enough: once any earlier test in the
    # session imports the real broken package, it IS in sys.modules and the
    # guard skips, which is why this file passed alone and errored in the full
    # suite. Test for the attribute, not for presence.
    existing = sys.modules.get("supabase")
    if getattr(existing, "create_client", None) is None:
        fake = types.ModuleType("supabase")
        fake.create_client = lambda *a, **k: None
        fake.Client = object
        sys.modules["supabase"] = fake
    import main_simple_nlp

    # `vader_analyzer` is a module global assigned inside FastAPI's lifespan, so
    # it is None on a plain import and analyze_market_sentiment silently falls
    # through to basic_sentiment_analysis — a different function with a
    # different return shape. Same trap that corrupted jobs/archive_scorer.py
    # and jobs/news_fetcher.py, both of which scored live articles with a
    # 20-word keyword list while believing they were using VADER.
    if main_simple_nlp.vader_analyzer is None:
        from services.sentiment_engine import get_analyzer

        main_simple_nlp.vader_analyzer = get_analyzer()

    return main_simple_nlp


JIZAN = (
    "Saudi Aramco's Jizan Refinery Hit Again as Houthi Attacks Escalate. "
    "Saudi Aramco's 400,000-barrel-per-day Jizan refinery was hit in a new "
    "attack Monday, threatening a major Red Sea refining hub while Saudi "
    "Arabia is moving more oil west to avoid the Strait of Hormuz. Houthi "
    "attacks have also threatened tankers and other oil infrastructure along "
    "the kingdom's alternative Red Sea export route."
)


# ------------------------------------------------------------------ the report


def test_refinery_attack_reads_bullish_for_crude(nlp):
    """The reported card. Was BEARISH at 0.93 confidence."""
    r = nlp.analyze_market_sentiment(JIZAN, "oil")
    assert r["sentiment"] == "BULLISH", r["market_context"]


def test_tone_alone_would_still_say_bearish(nlp):
    """Pins WHY this needed a structural fix rather than more keywords.

    If this ever stops being strongly negative, the lexicons changed and the
    dominance rule deserves re-examination.
    """
    assert nlp.vader_analyzer.polarity_scores(JIZAN)["compound"] < -0.5


def test_the_old_blend_could_not_have_reached_bullish(nlp):
    """Arithmetic proof that the vocabulary fix alone was insufficient.

    Maximum possible bullish evidence under the old formula, against this text.
    """
    compound = -0.902
    best_case = compound * nlp.SENTIMENT_BLEND_VADER + 0.9 * (
        1 - nlp.SENTIMENT_BLEND_VADER
    )  # 0.9 is the directional clamp
    assert best_case < nlp.SENTIMENT_THRESHOLD


# ------------------------------------------------------------------ vocabulary


@pytest.mark.parametrize(
    "text,signal",
    [
        ("A drone attack struck the Ras Tanura export terminal.", "Infrastructure attack"),
        ("The refinery was hit by a missile overnight.", "Infrastructure attack"),
        ("Militants seized a tanker carrying crude cargo.", "Shipping interdiction"),
        ("Crude exports were halted after the incident.", "Export halt"),
    ],
)
def test_kinetic_disruption_vocabulary(nlp, text, signal):
    f = nlp.analyze_fundamental_direction(text, "oil")
    assert signal in [m["signal"] for m in f["matched_signals"]], f


def test_bare_attack_language_is_not_a_supply_shock(nlp):
    """Patterns are anchored to infrastructure nouns in both directions.

    Unanchored "attack" would read political and monetary copy as supply shocks
    — the same substring-matching failure as 'bullish' matching 'bullion'.
    """
    f = nlp.analyze_fundamental_direction(
        "The senator launched a blistering attack on the central bank's "
        "handling of inflation.",
        "oil",
    )
    signals = [m["signal"] for m in f["matched_signals"]]
    assert "Infrastructure attack" not in signals, signals


# ------------------------------------------------------------------ the gate


def test_weak_evidence_does_not_overrule_tone(nlp):
    """The gate reads summed WEIGHT, not match count.

    Counting made an unbalanced rulebook into a directional prior — oil has 9
    bullish patterns against 13 bearish, so whichever side has more patterns
    reaches a count threshold more easily. It also let two vague matches
    outrank one decisive one.
    """
    f = nlp.analyze_fundamental_direction(JIZAN, "oil")
    assert f["bullish_weight"] >= nlp.SENTIMENT_RULE_DOMINANCE_WEIGHT

    # "Supply disruption risk" alone is 0.7 — real, but not decisive.
    r = nlp.analyze_market_sentiment(
        "The war has kept oil shipping routes under review, traders said, "
        "amid a grim and deeply worrying outlook for everyone involved.",
        "oil",
    )
    assert r["market_context"]["bullish_weight"] < nlp.SENTIMENT_RULE_DOMINANCE_WEIGHT
    assert r["method"] != "commodity_rules_v3"


def test_a_single_decisive_signal_is_enough(nlp):
    """An OPEC cut needs no corroboration. Requiring two matches would have
    made the most consequential recurring event in crude insufficient alone."""
    r = nlp.analyze_market_sentiment("OPEC+ agreed to cut oil output at its meeting.", "oil")
    assert r["sentiment"] == "BULLISH"
    assert r["method"] == "commodity_rules_v3"


def test_repeated_signal_counts_once(nlp):
    """Two patterns emit "Infrastructure attack" (attack-then-noun and
    noun-then-attack). One event described twice is not two pieces of evidence."""
    f = nlp.analyze_fundamental_direction(JIZAN, "oil")
    names = [m["signal"] for m in f["matched_signals"]]
    assert len(names) == len(set(names))


def test_conflicting_signals_fall_back_to_the_blend(nlp):
    """Genuine ambiguity deserves tone's vote. An attack alongside a demand
    collapse is not a one-sided story and must not be forced bullish."""
    r = nlp.analyze_market_sentiment(
        "A drone attack hit an oil pipeline terminal, yet demand fell sharply "
        "and inventories posted a large build amid recession fears.",
        "oil",
    )
    directions = {m["direction"] for m in r["market_context"]["matched_signals"]}
    assert len(directions) == 2
    assert r["method"] == "commodity_vader_v2"


# ------------------------------------------------- it corrects both directions


def test_bearish_fundamentals_override_positive_tone(nlp):
    """The mirror case, and the reason this is not just 'make things bullish'.

    Cheerful prose about rising output and building inventories is bearish for
    crude. VADER reads this text POSITIVE.
    """
    text = (
        "Crude oil inventories posted a large build as US production output "
        "rose to a record. Demand growth slowed sharply amid recession fears."
    )
    r = nlp.analyze_market_sentiment(text, "oil")
    assert r["sentiment"] == "BEARISH", r["market_context"]


def test_opec_cut_with_inventory_draw_is_bullish(nlp):
    """Also fixes a pre-existing pattern that was too tight to fire:
    `(inventory).{0,12}(draw)` could not span "inventories posted a steep draw"."""
    r = nlp.analyze_market_sentiment(
        "OPEC+ agreed to cut output sharply while crude inventories posted a "
        "steep draw.",
        "oil",
    )
    assert r["sentiment"] == "BULLISH", r["market_context"]


def test_market_colour_stays_neutral(nlp):
    r = nlp.analyze_market_sentiment(
        "Oil prices were little changed in quiet trading ahead of the report.",
        "oil",
    )
    assert r["sentiment"] == "NEUTRAL"
    assert r["method"] == "vader_v2"


def test_matched_signals_are_surfaced_for_the_card(nlp):
    """These are what the Key Sentiment Drivers panel should be showing —
    named fundamental signals, not words scraped out of the prose."""
    r = nlp.analyze_market_sentiment(JIZAN, "oil")
    signals = r["market_context"]["matched_signals"]
    assert signals and all("signal" in m and "direction" in m for m in signals)
