"""News sentiment and market probability must be compared on the same scale.

Caught 2026-08-17 while verifying that real divergence cards had begun to flow.
They had — but with implausible deltas against a 0.20 threshold:

    status=DIVERGENCE provider=polymarket delta=1.2096 topic=fed_rates
    status=DIVERGENCE provider=polymarket delta=1.4129 topic=iran_middle_east
    status=DIVERGENCE provider=polymarket delta=1.3472 topic=russia_ukraine

`entity_mentions.score` runs 0..1 with 0.5 meaning neutral. `_to_signed` had
already mapped the market probability onto -1..+1 with 0.0 meaning neutral. The
delta subtracted one from the other, adding a constant +0.5 offset to every
reading.

The consequence was not merely noisy, it was inverted:

  * perfectly neutral news vs a perfectly neutral market -> delta +0.50,
    reported as DIVERGENCE;
  * neutral news vs a strongly bullish market — a real divergence — cancelled
    to 0.00 and was reported as ALIGNED.

A signal that fires on everything and misses the real thing is worse than no
signal, so this is worth pinning precisely.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.divergence import (  # noqa: E402
    DEFAULT_THRESHOLD,
    _classify,
    _sentiment_to_signed,
    _to_signed,
)


def delta(sentiment_0_1, market_prob_0_1):
    """The comparison as compute() now performs it."""
    return round(_sentiment_to_signed(sentiment_0_1) - _to_signed(market_prob_0_1), 4)


class TestBothScalesAgree:
    def test_neutral_maps_to_zero_on_both_sides(self):
        assert _sentiment_to_signed(0.5) == 0.0
        assert _to_signed(0.5) == 0.0

    def test_extremes_map_to_the_same_bounds(self):
        assert _sentiment_to_signed(0.0) == -1.0
        assert _sentiment_to_signed(1.0) == 1.0
        assert _to_signed(0.0) == -1.0
        assert _to_signed(1.0) == 1.0

    def test_none_propagates(self):
        assert _sentiment_to_signed(None) is None
        assert _to_signed(None) is None


class TestTheOffsetIsGone:
    def test_neutral_versus_neutral_is_aligned(self):
        """The false positive that made every card diverge."""
        d = delta(0.50, 0.50)
        assert d == 0.0
        assert _classify(d, DEFAULT_THRESHOLD) == "ALIGNED"

    def test_mildly_bullish_news_against_a_neutral_market_is_not_a_signal(self):
        d = delta(0.55, 0.50)
        assert d == pytest.approx(0.10, abs=1e-9)
        assert _classify(d, DEFAULT_THRESHOLD) == "ALIGNED"

    def test_a_ten_point_lean_sits_exactly_on_the_threshold(self):
        """Worth stating explicitly: a 0.60 score is 0.20 signed, and
        DEFAULT_THRESHOLD is documented as "20-point divergence" with a `>=`
        comparison — so this is the boundary case, and it counts as divergence.
        The 0..1 score scale is half the width of the signed scale, which is
        precisely the confusion that produced the original bug."""
        d = delta(0.60, 0.50)
        assert d == pytest.approx(DEFAULT_THRESHOLD, abs=1e-9)
        assert _classify(d, DEFAULT_THRESHOLD) == "DIVERGENCE"

    def test_agreement_at_any_level_is_aligned(self):
        """Both sides bullish, or both bearish, must never read as divergence."""
        for sentiment, prob in ((0.80, 0.80), (0.20, 0.20), (0.65, 0.65), (0.35, 0.35)):
            d = delta(sentiment, prob)
            assert _classify(d, DEFAULT_THRESHOLD) == "ALIGNED", (sentiment, prob, d)


class TestGenuineDivergenceIsCaught:
    def test_neutral_news_against_a_bullish_market(self):
        """The false NEGATIVE: the old formula cancelled this to exactly 0.00."""
        d = delta(0.50, 0.75)
        assert _classify(d, DEFAULT_THRESHOLD) == "DIVERGENCE"
        assert d < 0  # market ahead of the news

    def test_bearish_news_against_a_bullish_market(self):
        d = delta(0.20, 0.80)
        assert _classify(d, DEFAULT_THRESHOLD) == "DIVERGENCE"
        assert d == pytest.approx(-1.2, abs=1e-3)

    def test_bullish_news_against_a_bearish_market(self):
        d = delta(0.85, 0.20)
        assert _classify(d, DEFAULT_THRESHOLD) == "DIVERGENCE"
        assert d > 0  # news ahead of the market

    def test_sign_encodes_direction(self):
        """Positive = news more bullish than the market, and vice versa."""
        assert delta(0.90, 0.30) > 0
        assert delta(0.30, 0.90) < 0


class TestBounds:
    def test_delta_stays_within_the_documented_range(self):
        """news_enricher documents divergenceDelta as float in [-2, +2]."""
        for sentiment in (0.0, 0.25, 0.5, 0.75, 1.0):
            for prob in (0.0, 0.25, 0.5, 0.75, 1.0):
                assert -2.0 <= delta(sentiment, prob) <= 2.0

    def test_maximum_opposition_is_the_extreme(self):
        assert delta(1.0, 0.0) == 2.0
        assert delta(0.0, 1.0) == -2.0

    def test_threshold_is_reachable_but_not_trivially(self):
        """Sanity: 0.20 must sit between 'noise' and 'real', not below noise."""
        assert _classify(delta(0.55, 0.50), DEFAULT_THRESHOLD) == "ALIGNED"
        assert _classify(delta(0.65, 0.50), DEFAULT_THRESHOLD) == "DIVERGENCE"


class TestRegressionAgainstTheOldFormula:
    @staticmethod
    def _old_delta(sentiment_0_1, market_prob_0_1):
        return round(sentiment_0_1 - _to_signed(market_prob_0_1), 4)

    def test_old_formula_flagged_neutral_agreement(self):
        """Documents what was wrong, so nobody reintroduces it."""
        assert _classify(self._old_delta(0.50, 0.50), DEFAULT_THRESHOLD) == "DIVERGENCE"

    def test_old_formula_missed_real_divergence(self):
        assert _classify(self._old_delta(0.50, 0.75), DEFAULT_THRESHOLD) == "ALIGNED"

    def test_new_formula_reverses_both_verdicts(self):
        assert _classify(delta(0.50, 0.50), DEFAULT_THRESHOLD) == "ALIGNED"
        assert _classify(delta(0.50, 0.75), DEFAULT_THRESHOLD) == "DIVERGENCE"
