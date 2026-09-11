"""Weather and macro are modifiers, not commodities.

They previously sat in the rulebook alongside oil and gold with fixed
directional signs. Neither has a direction of its own — only a direction with
respect to a commodity:

                 wheat / corn      natural gas         gold
  drought        bullish (yield)   bullish (hydro)     --
  cold snap      ~neutral          bullish (heating)   --
  warm winter    ~neutral          BEARISH             --
  strong dollar  bearish           bearish             BEARISH
  recession      bearish (demand)  bearish             BULLISH (safe haven)

A single sign per event is wrong for at least one market in every row. The
handoff recorded the symptom: drought scored -0.07 and hurricane -0.07, both
wrong for wheat.
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

    if main_simple_nlp.vader_analyzer is None:
        from services.sentiment_engine import get_analyzer

        main_simple_nlp.vader_analyzer = get_analyzer()
    return main_simple_nlp


def _signals(nlp, text, commodity):
    return [
        m["signal"]
        for m in nlp.analyze_fundamental_direction(text, commodity)["matched_signals"]
    ]


# ------------------------------------------------------- weather, per market


def test_drought_is_bullish_for_grain(nlp):
    assert "Adverse crop weather" in _signals(
        nlp, "A severe drought scorched the wheat belt.", "wheat"
    )


def test_favourable_weather_is_bearish_for_grain(nlp):
    f = nlp.analyze_fundamental_direction(
        "Timely rain and favourable weather improved the crop outlook.", "corn"
    )
    assert "Favourable crop weather" in [m["signal"] for m in f["matched_signals"]]
    assert f["rule_bias"] == "BEARISH"


def test_cold_is_bullish_gas_and_warm_is_bearish(nlp):
    assert "Heating demand surge" in _signals(
        nlp, "A polar vortex will bring a severe cold snap next week.", "gas"
    )
    assert "Weak heating demand" in _signals(
        nlp, "A mild winter forecast weighed on the market.", "gas"
    )


def test_drought_reaches_gas_through_hydro(nlp):
    """The row that makes the point: the same event, bullish for two different
    markets for two entirely unrelated reasons."""
    assert "Hydro shortfall" in _signals(
        nlp, "A prolonged drought cut hydro generation output.", "gas"
    )


def test_hurricane_is_a_supply_event_for_energy_only(nlp):
    assert "Gulf production shut-in" in _signals(
        nlp, "A hurricane forced Gulf platforms to shut in production.", "oil"
    )
    # Not a grain signal — the standalone "weather" book used to give it one.
    assert "Gulf production shut-in" not in _signals(
        nlp, "A hurricane forced Gulf platforms to shut in production.", "wheat"
    )


# --------------------------------------------------------- macro, per market


@pytest.mark.parametrize("commodity", ["gold", "copper", "oil", "wheat", "lithium"])
def test_dollar_strength_is_bearish_for_every_usd_priced_market(nlp, commodity):
    """Commodities are priced in USD, so dollar strength is a headwind for all
    of them — it was only coded for the metals."""
    f = nlp.analyze_fundamental_direction(
        "The dollar strengthened sharply against major peers.", commodity
    )
    assert "Dollar strength" in [m["signal"] for m in f["matched_signals"]]
    assert f["rule_bias"] == "BEARISH"


def test_recession_inverts_between_cyclical_and_defensive(nlp):
    """The clearest case for per-commodity signs. Copper is a growth asset;
    gold is what people buy when growth disappoints."""
    text = "A deepening recession and risk-off tone dominated markets."
    assert nlp.analyze_fundamental_direction(text, "copper")["rule_bias"] == "BEARISH"
    assert nlp.analyze_fundamental_direction(text, "gold")["rule_bias"] == "BULLISH"


# ------------------------------------------------------------------ routing


def test_a_real_commodity_outranks_the_pseudo_bucket(nlp):
    """A drought story about wheat is a WHEAT story. Only wheat's book knows a
    drought is bullish there; the standalone weather book has one fixed sign."""
    assert nlp.normalize_commodity(
        None, "Drought weather conditions scorched the wheat belt this summer."
    ) == "wheat"
    assert nlp.normalize_commodity(
        None, "Macro headwinds and a firmer dollar weighed on copper demand."
    ) == "copper"


def test_pseudo_buckets_remain_as_a_fallback(nlp):
    """Kept, not deleted: an article naming no market still needs somewhere to
    land rather than falling through to tone alone."""
    assert nlp.normalize_commodity(
        None, "Weather models shifted overnight across the northern hemisphere."
    ) == "weather"


def test_modifier_mirror_pairs_weigh_the_same(nlp):
    """Same invariant as every other pair: an asymmetry is a directional prior."""
    for bullish, bearish in nlp._MIRROR_PAIRS:
        assert nlp.signal_weight(bullish) == nlp.signal_weight(bearish), (
            f"{bullish} vs {bearish}"
        )


def test_one_macro_factor_alone_does_not_set_direction(nlp):
    """A modifier is context, not a thesis. Dollar strength at 0.7 sits below
    the dominance gate on purpose."""
    r = nlp.analyze_market_sentiment(
        "The dollar strengthened sharply against major peers.", "copper"
    )
    assert r["method"] != "commodity_rules_v3"
