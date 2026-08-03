"""API tier ladder: 30-day trial (no export) -> $99 -> $179 (full archive).

Pure-logic tests over the tier LIMITS matrix, no Supabase/network.
"""

from services.tier_enforcement import can_query_historical, exports_allowed, limits_for


def test_trial_is_30_days_and_cannot_export():
    lim = limits_for("api_trial")
    assert lim.history_days == 30
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
