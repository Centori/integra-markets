"""API tier ladder: 30-day trial (no export) -> $99 -> $179 (full archive).

Pure-logic tests over the tier LIMITS matrix, no Supabase/network.
"""

from services.tier_enforcement import can_query_historical, exports_allowed, limits_for


def test_trial_is_24_hours_and_cannot_export():
    """CHANGED 2026-09-07, deliberately: the open beta was 30 days.

    30 days of history is the paid api_basic product. A free tier that ships
    the paid tier's depth has nothing to convert to, so the trial now shows 24
    hours — enough to see the shape of the data, not enough to substitute for
    paying.

    This is a REDUCTION for anyone already holding a beta key. It is revertible
    without a deploy: INTEGRA_DEPTH_QUERY_API_TRIAL=30 on Railway restores the
    old depth. See test_depth_is_overridable_without_a_deploy.
    """
    lim = limits_for("api_trial")
    assert lim.history_days == 1
    assert exports_allowed("api_trial") is False


def test_basic_99_is_30_day_window_with_export():
    lim = limits_for("api_basic")
    assert lim.history_days == 30          # 30-day rolling, not 90
    assert exports_allowed("api_basic") is True


def test_history_179_is_full_archive_with_export():
    lim = limits_for("api_history")
    assert lim.history_days == float("inf")
    assert exports_allowed("api_history") is True


def test_only_archive_tier_reaches_historical():
    assert can_query_historical("api_history") is True
    assert can_query_historical("api_basic") is False
    assert can_query_historical("api_trial") is False


def test_non_api_tiers_default_to_no_export():
    for t in ("free_trial", "basic", "basic_markets", "expired"):
        assert exports_allowed(t) is False
