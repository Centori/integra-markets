"""Confirms exactly what the divergence cards receive from the backend.

`enrich_articles_with_divergence` (services/news_enricher.py) is the function
that attaches the fields the mobile NewsCard + analysis overlay render:

    divergenceProvider  "polymarket" | "kalshi"
    divergenceStatus    "DIVERGENCE" | "ALIGNED" | "NO_DATA"
    divergenceDelta     signed float (news sentiment − market implied)
    divergenceTopic     the matched topic key

The card only shows its footer when divergenceStatus == "DIVERGENCE", and the
strongest signal (largest |delta|) across a provider pair wins. These tests
stub the divergence/taxonomy layer so no network or Supabase is touched, and
assert the contract end-to-end.
"""
import sys
import types

from services import news_enricher


class _Reading:
    """Mimics services.divergence.DivergenceReading's fields used by the enricher."""

    def __init__(self, dp=None, sp="NO_DATA", dk=None, sk="NO_DATA"):
        self.delta_polymarket = dp
        self.status_polymarket = sp
        self.delta_kalshi = dk
        self.status_kalshi = sk


def _stub(monkeypatch, *, topics, reading):
    dv = types.ModuleType("services.divergence")
    dv.DEFAULT_LOOKBACK_HOURS = 24
    dv.DEFAULT_THRESHOLD = 0.15
    dv.compute = lambda supabase, topic_key, threshold, lookback_hours: reading
    tax = types.ModuleType("services.topic_taxonomy")
    tax.detect_topics = lambda text: topics
    monkeypatch.setitem(sys.modules, "services.divergence", dv)
    monkeypatch.setitem(sys.modules, "services.topic_taxonomy", tax)


def test_polymarket_divergence_fields(monkeypatch):
    # Polymarket |0.42| beats Kalshi |0.05| → Polymarket signal wins.
    _stub(monkeypatch, topics=["crude_oil"],
          reading=_Reading(dp=0.42, sp="DIVERGENCE", dk=0.05, sk="ALIGNED"))
    art = news_enricher.enrich_articles_with_divergence(
        None, [{"title": "Oil surges", "summary": "crude rally"}])[0]
    assert art["divergenceProvider"] == "polymarket"
    assert art["divergenceStatus"] == "DIVERGENCE"
    assert art["divergenceDelta"] == 0.42
    assert art["divergenceTopic"] == "crude_oil"


def test_strongest_absolute_delta_wins(monkeypatch):
    # Kalshi |−0.55| beats Polymarket |0.20| even though Polymarket is ALIGNED.
    _stub(monkeypatch, topics=["gold"],
          reading=_Reading(dp=0.20, sp="ALIGNED", dk=-0.55, sk="DIVERGENCE"))
    art = news_enricher.enrich_articles_with_divergence(
        None, [{"title": "Gold", "summary": "y"}])[0]
    assert art["divergenceProvider"] == "kalshi"
    assert art["divergenceDelta"] == -0.55
    assert art["divergenceStatus"] == "DIVERGENCE"


def test_no_signal_leaves_card_clean(monkeypatch):
    # Both providers NO_DATA → no fields attached → card renders no footer.
    _stub(monkeypatch, topics=["crude_oil"], reading=_Reading())
    art = news_enricher.enrich_articles_with_divergence(
        None, [{"title": "Oil", "summary": "x"}])[0]
    for k in ("divergenceProvider", "divergenceStatus", "divergenceDelta", "divergenceTopic"):
        assert k not in art


def test_empty_articles_pass_through():
    assert news_enricher.enrich_articles_with_divergence(None, []) == []
