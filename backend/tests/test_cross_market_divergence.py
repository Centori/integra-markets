"""Kalshi-vs-Polymarket cross-market divergence signal.

Surfaces when the two prediction markets disagree with EACH OTHER on a topic
(independent of news sentiment). Pure-logic tests over `_cross_market_signal`,
no Supabase/network.
"""

from types import SimpleNamespace

from services.news_enricher import _cross_market_signal

THR = 0.20


def _reading(poly, kal):
    return SimpleNamespace(polymarket_implied=poly, kalshi_implied=kal)


def test_none_when_only_polymarket_priced():
    assert _cross_market_signal(_reading(0.4, None), THR) is None


def test_none_when_only_kalshi_priced():
    assert _cross_market_signal(_reading(None, -0.3), THR) is None


def test_none_when_neither_priced():
    assert _cross_market_signal(_reading(None, None), THR) is None


def test_aligned_when_markets_agree():
    sig = _cross_market_signal(_reading(0.50, 0.55), THR)  # 0.05 gap < 0.20
    assert sig is not None
    assert sig["crossStatus"] == "ALIGNED"


def test_divergence_when_markets_disagree():
    sig = _cross_market_signal(_reading(0.60, 0.10), THR)  # 0.50 gap > 0.20
    assert sig["crossStatus"] == "DIVERGENCE"
    # signed: kalshi - polymarket
    assert sig["crossDelta"] == -0.50
    assert sig["polymarketImplied"] == 0.60
    assert sig["kalshiImplied"] == 0.10


def test_delta_sign_is_kalshi_minus_polymarket():
    sig = _cross_market_signal(_reading(0.10, 0.60), THR)
    assert sig["crossDelta"] == 0.50  # kalshi higher -> positive


def test_exact_threshold_counts_as_divergence():
    sig = _cross_market_signal(_reading(0.0, 0.20), THR)
    assert sig["crossStatus"] == "DIVERGENCE"
