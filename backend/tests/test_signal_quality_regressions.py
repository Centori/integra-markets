"""Regressions for the four defects found in the 2026-08-25 signal audit.

Each test is pinned to a symptom observed in the live production response
from POST /api/news/feed on that date, not to an abstract invariant.
"""

import os
import re
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# --------------------------------------------------------------------------
# A1 -- raw markup and bare URLs reached production article cards.
# --------------------------------------------------------------------------

class TestStoreSummaryHygiene:
    # Verbatim from the live feed on 2026-08-25, article[0].
    GOOGLE_NEWS_ANCHOR = (
        '<a href="https://news.google.com/rss/articles/CBMixgFBVV95cUxPeWVpMEdo'
        'enRuUHdzUlpxOG1xdVdSMTItdmhxNk5MUGc3YmdGLXl0S2EwYkNYVDV6" target="_blank">'
        'Oil hits one-week low as investors shrug off US sanctions on Iran</a>'
        '&nbsp;&nbsp;<font color="#6f6f6f">Reuters</font>'
    )

    def test_no_markup_survives(self):
        from services.text_clean import clean_summary_text
        out = clean_summary_text(self.GOOGLE_NEWS_ANCHOR)
        assert "<" not in out and ">" not in out
        assert "href" not in out

    def test_no_bare_url_survives(self):
        from services.text_clean import clean_summary_text
        out = clean_summary_text("Crude slipped today. Full story https://example.com/a/b?c=1")
        assert "http" not in out
        assert "Crude slipped today." in out

    def test_entities_are_decoded(self):
        from services.text_clean import clean_summary_text
        assert "&nbsp;" not in clean_summary_text(self.GOOGLE_NEWS_ANCHOR)

    def test_syndication_tail_is_removed(self):
        from services.text_clean import clean_summary_text
        body = (
            "Norway's Equinor hopes to make a big oil discovery offshore Namibia, "
            "the exploration hotspot of recent years. The post Equinor Eyes Major "
            "Oil Discovery appeared first on OilPrice.com"
        )
        assert "appeared first on" not in clean_summary_text(body)

    def test_summary_identical_to_title_falls_back_to_title_not_duplicate(self):
        """Live article[2] shipped with summary == title verbatim."""
        from services.text_clean import best_summary
        title = ("Gold prices today, Tuesday, August 25, 2026: "
                 "Gold hits 3-month high this morning")
        assert best_summary(title, title) == title

    def test_usable_body_is_preferred_over_title(self):
        from services.text_clean import best_summary
        title = "Equinor Eyes Major Oil Discovery Offshore Namibia"
        body = ("Norway's energy major Equinor hopes to make a pretty big oil "
                "discovery offshore Namibia, the global exploration hotspot.")
        assert best_summary(body, title) == body

    def test_feed_store_emits_clean_summaries(self):
        """The store reader is the path that actually served the bad text."""
        from services.feed_store import _to_article
        row = {
            "id": "doc-1",
            "title": "Oil hits one-week low as investors shrug off US sanctions on Iran",
            "content": self.GOOGLE_NEWS_ANCHOR,
            "source": "Reuters",
            "url": "https://news.google.com/rss/articles/CBMixgF",
            "published_at": "2026-08-25T09:00:00+00:00",
        }
        art = _to_article(row, None, [])
        assert "<" not in art["summary"]
        assert "http" not in art["summary"]


# --------------------------------------------------------------------------
# B1 -- unanchored substring matching produced false drivers.
# --------------------------------------------------------------------------

GHOST_CASES = [
    ("Global supply remains constrained this quarter.", "up"),
    ("The group upgraded guidance for the year.", "up"),
    ("Central bank bullion reserves rose again in July.", "bull"),
    ("The refinery shutdown will last three weeks.", "down"),
    ("Downstream margins narrowed across the complex.", "down"),
    ("The ruling went against the operator.", "gain"),
    ("Load-bearing infrastructure was unaffected.", "bear"),
    ("Forbearance was extended to the borrower.", "bear"),
    ("Glossy brochures were printed for the roadshow.", "loss"),
]

RECALL_CASES = [
    ("Crude prices surge on supply fears.", "surge"),
    ("Equities rallied into the close.", "rally"),
    ("Gold gains for a third session.", "gain"),
    ("Prices dropped sharply overnight.", "drop"),
    ("Output rises after the outage.", "rise"),
    ("Heavy losses across the complex.", "loss"),
    ("A bearish tone dominated trading.", "bear"),
    ("Bullish sentiment returned to the tape.", "bull"),
    ("Bears took control of the session.", "bear"),
    ("Production declined for a third month.", "decline"),
    ("Growth stalled in the third quarter.", "growth"),
    ("Crude crashed eight percent overnight.", "crash"),
]


class TestKeywordPatterns:
    """Pattern-level: runs without torch/textblob, so CI always covers it."""

    @pytest.fixture(scope="class")
    def matches(self):
        from services.keyword_forms import keyword_pattern
        vocab = ["surge", "rally", "gain", "rise", "boost", "growth", "profit",
                 "bull", "up", "crash", "fall", "drop", "decline", "loss",
                 "bear", "down", "recession", "stable", "unchanged", "flat",
                 "steady", "maintain"]
        return lambda t: {w for w in vocab if keyword_pattern(w).findall(t.lower())}

    @pytest.mark.parametrize("text,ghost", GHOST_CASES)
    def test_substring_ghosts_are_not_reported(self, matches, text, ghost):
        assert ghost not in matches(text), f"{ghost!r} falsely extracted from {text!r}"

    @pytest.mark.parametrize("text,expected", RECALL_CASES)
    def test_real_hits_and_inflections_still_match(self, matches, text, expected):
        assert expected in matches(text), f"{expected!r} missed in {text!r}"

    def test_bullish_and_bearish_are_reachable(self):
        """The adjectival forms carry the strongest signal; regular rules miss them."""
        from services.keyword_forms import surface_forms
        assert "bullish" in surface_forms("bull")
        assert "bearish" in surface_forms("bear")

    def test_mechanical_bearing_is_excluded(self):
        from services.keyword_forms import surface_forms
        assert "bearing" not in surface_forms("bear")


class TestKeywordExtractionEndToEnd:
    """Same assertions through the real extractor, when its deps are present."""

    @pytest.fixture(scope="class")
    def predict(self):
        pytest.importorskip("torch")
        pytest.importorskip("textblob")
        from services.enhanced_sentiment import KeywordDQN
        return KeywordDQN().predict

    @pytest.mark.parametrize("text,ghost", GHOST_CASES)
    def test_substring_ghosts_are_not_reported(self, predict, text, ghost):
        words = [k["word"] for k in predict(text)]
        assert ghost not in words, f"{ghost!r} falsely extracted from {text!r}"


# --------------------------------------------------------------------------
# D1 -- implied probability must be the mid, not the bid.
# --------------------------------------------------------------------------

class TestImpliedProbability:
    def test_uses_mid_not_bid(self):
        from services.polymarket_public import _normalize_market
        m = _normalize_market({
            "slug": "x", "question": "Q",
            "bestBid": "0.40", "bestAsk": "0.50", "lastTradePrice": "0.99",
        })
        assert m["yes_price"] == pytest.approx(0.45)
        assert m["spread"] == pytest.approx(0.10)

    def test_yes_and_no_are_consistent(self):
        from services.polymarket_public import _normalize_market
        m = _normalize_market({
            "slug": "x", "question": "Q", "bestBid": "0.40", "bestAsk": "0.50",
        })
        assert m["yes_price"] + m["no_price"] == pytest.approx(1.0)

    def test_zero_bid_is_not_swallowed_by_truthiness(self):
        """gamma-api sends strings; "0" must survive rather than falling through."""
        from services.polymarket_public import _normalize_market
        m = _normalize_market({
            "slug": "x", "question": "Q",
            "bestBid": "0", "bestAsk": "0.04", "lastTradePrice": "0.80",
        })
        assert m["yes_price"] == pytest.approx(0.02)

    def test_falls_back_to_last_trade_only_with_no_book(self):
        from services.polymarket_public import _normalize_market
        m = _normalize_market({"slug": "x", "question": "Q", "lastTradePrice": "0.62"})
        assert m["yes_price"] == pytest.approx(0.62)
        assert m["spread"] is None


# --------------------------------------------------------------------------
# D2 -- WITHDRAWN.
#
# The audit called DEFAULT_THRESHOLD "2x too sensitive": 0.20 on the signed
# axis is 10 percentage points of probability, while the comment said
# "20-point divergence". That reading was wrong. The repo's convention is
# that a "point" is a hundredth of the *signed* axis, and
# tests/test_divergence_scale.py pins the 0.60-vs-0.50 boundary case
# deliberately, with a docstring explaining that the half-width 0..1 score
# scale "is precisely the confusion that produced the original bug".
#
# Changing the value would have broken a considered, tested decision. The
# constant is unchanged; only its comment now states the unit unambiguously.
# Whether 10 probability points is the right *sensitivity* is a calibration
# question, not a defect -- and the live deltas observed on 2026-08-25
# (0.7574, 0.694) clear either threshold comfortably.
# --------------------------------------------------------------------------


# --------------------------------------------------------------------------
# D4 -- the card must be able to name the market it is talking about.
# --------------------------------------------------------------------------

class TestMarketAttribution:
    def _reading(self):
        from services.divergence import DivergenceReading
        return DivergenceReading(
            topic="iran_middle_east", topic_label="Iran / Middle East",
            sentiment_score=0.62, sentiment_sample_size=14,
            polymarket_implied=-0.10, polymarket_market_count=2,
            kalshi_implied=None, kalshi_market_count=0,
            delta_polymarket=0.44, delta_kalshi=None,
            status_polymarket="DIVERGENCE", status_kalshi="NO_DATA",
            threshold=0.40,
            related_markets=[
                {"provider": "polymarket", "question": "Thin market?",
                 "url": "https://polymarket.com/event/thin",
                 "condition_id": "0xthin", "volume_24h": 10.0},
                {"provider": "polymarket", "question": "US strikes Iran before December?",
                 "url": "https://polymarket.com/event/us-strikes-iran",
                 "condition_id": "0xdeep", "volume_24h": 900000.0},
            ],
            computed_at="2026-08-25T12:00:00+00:00",
        )

    def test_leading_market_is_carried_through(self):
        from services.news_enricher import _pick_strongest_signal
        sig = _pick_strongest_signal(self._reading())
        assert sig["marketQuestion"] == "US strikes Iran before December?"
        assert sig["marketUrl"] == "https://polymarket.com/event/us-strikes-iran"
        assert sig["marketId"] == "0xdeep"

    def test_highest_volume_market_wins(self):
        from services.news_enricher import _pick_strongest_signal
        assert _pick_strongest_signal(self._reading())["marketQuestion"] != "Thin market?"

    def test_absent_related_markets_is_not_fatal(self):
        from services.news_enricher import _pick_strongest_signal
        r = self._reading()
        r.related_markets = []
        sig = _pick_strongest_signal(r)
        assert sig["provider"] == "polymarket"
        assert "marketQuestion" not in sig

    def test_new_fields_are_tier_stripped(self):
        """Paid market identity must not leak to tiers without divergence."""
        src = open(os.path.join(os.path.dirname(__file__), "..",
                                "api", "news_feed.py")).read()
        strip_block = src[src.index("art.pop(k, None)") - 900:src.index("art.pop(k, None)")]
        for field in ("divergenceMarketQuestion", "divergenceMarketUrl", "divergenceMarketId"):
            assert field in strip_block, f"{field} is not tier-stripped"
