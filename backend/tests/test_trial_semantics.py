"""The 30-day mobile trial, and what happens on day 31.

Pins three decisions that the launch depends on:

  1. The trial grants FULL Pro. It previously granted less than the free tier —
     push alerts were excluded entirely and history was capped at 1 day, so the
     window meant to prove value disabled the feature that proves it.
  2. A lapsed TRIAL resolves to `free`, not `expired`. `expired` has all-zero
     limits; sending trial users there on day 31 bricked the app and contradicted
     the "FREE" tier the App Store listing promises.
  3. Every unknown/error path falls back to `free` — never `free_trial`, which
     now grants Pro and would hand Pro to everyone during a Supabase outage.
"""

import math

import pytest

from services.tier_enforcement import (
    LIMITS,
    UNLIMITED,
    clamp_hours_back,
    get_effective_tier,
    is_realtime_push_allowed,
    limits_for,
)
from services.trial_init import FREE_TRIAL_DAYS


# --- 1. the trial grants full Pro -----------------------------------------

def test_trial_matches_pro_exactly():
    """If these ever diverge, the trial is selling something other than the
    product. Compared field-by-field rather than by identity so a copy-paste
    of the limits object still passes."""
    assert limits_for("free_trial") == limits_for("basic_markets")


def test_trial_has_realtime_push():
    """The single strongest retention mechanism, previously off during trial."""
    assert is_realtime_push_allowed("free_trial")


def test_trial_history_is_not_one_day():
    assert limits_for("free_trial").history_days == UNLIMITED


def test_trial_length_is_thirty_days():
    """Defaulted in code, not only in an env var — INTEGRA_FREE_TRIAL_DAYS was
    unset in production, silently making every trial 7 days."""
    assert FREE_TRIAL_DAYS == 30


# --- 2. free is a usable resting state, not a brick ------------------------

def test_free_tier_exists():
    assert "free" in LIMITS


def test_free_tier_can_still_read_news():
    """The App Store listing promises FREE users a curated feed with AI
    sentiment on every story. Zero articles would make that false."""
    lim = limits_for("free")
    assert lim.articles_per_session > 0
    assert lim.ai_overlay_per_day > 0
    assert "news" in lim.alert_types


def test_free_tier_can_still_bookmark():
    assert limits_for("free").bookmarks > 0


def test_expired_is_strictly_worse_than_free():
    """`expired` is reserved for a lapsed PAID subscription. It should be the
    hard stop; `free` should not be."""
    free, expired = limits_for("free"), limits_for("expired")
    assert expired.bookmarks < free.bookmarks
    assert expired.alerts < free.alerts
    assert expired.articles_per_session < free.articles_per_session


# --- 3. every fallback is `free` ------------------------------------------

@pytest.mark.parametrize("unknown", ["", "nonsense", "pro", "tier_we_renamed_later"])
def test_unknown_tier_falls_back_to_free_not_trial(unknown):
    assert limits_for(unknown) == limits_for("free")


def test_effective_tier_fails_closed_without_supabase():
    assert get_effective_tier(None, "any-user") == "free"


def test_effective_tier_fails_closed_when_rpc_raises():
    class Boom:
        def rpc(self, *_a, **_k):
            raise RuntimeError("supabase down")

    assert get_effective_tier(Boom(), "any-user") == "free"


# --- the clamp actually applies the tier ----------------------------------

def test_free_tier_clamps_history_window():
    # 30 days requested, free tier allows 7
    assert clamp_hours_back("free", 24 * 30) == 24 * 7


def test_trial_does_not_clamp():
    assert clamp_hours_back("free_trial", 24 * 365) == 24 * 365


def test_legacy_api_alias_still_resolves():
    """Existing rows on the pre-split 'api' tier must not become `free`."""
    assert limits_for("api") == limits_for("api_basic")
    assert not math.isnan(limits_for("api").history_days)
