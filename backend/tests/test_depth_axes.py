"""Query depth and export depth are separate axes.

The point of the split: an archive customer may ASK anything of the full
archive and may DOWNLOAD only the last year of it. Before this, one number
governed both and the archive scope lifted it for both at once, so an archive
key could export half a million rows reaching to the beginning of the archive
— the whole database, one call at a time.

These tests pin the asymmetry, because it is the kind of property that looks
like a bug to someone reading only one of the two call sites.
"""

from __future__ import annotations

import math

import pytest
from fastapi import HTTPException

from services.api_key_auth import assert_export_depth, assert_history_depth, tier_of
from services.entitlement import (
    HISTORY_DEPTH_CAP_DAYS,
    depth_for,
    export_depth_days,
    query_depth_days,
)
from services.tier_enforcement import limits_for


class _Ent:
    def __init__(self, tier):
        self.tier = tier
        self.scopes = frozenset({"history"})


def _auth(tier):
    return {"id": "k", "user_id": "u", "_entitlement": _Ent(tier)}


# ------------------------------------------------------------------ the table


@pytest.mark.parametrize(
    "tier,query,export",
    [
        ("api_trial", 1, 0),
        ("api_basic", 30, 30),
        ("api", 30, 30),
        ("api_history", math.inf, 365),
    ],
)
def test_depth_table(tier, query, export):
    assert query_depth_days(tier) == query
    assert export_depth_days(tier) == export


def test_unknown_tier_gets_the_least_not_the_most():
    """An unrecognised tier is a bug. The safe reading of a bug is 'give the
    least' — matching rate_limit's _FALLBACK_LIMIT."""
    assert query_depth_days("enterprise_platinum") == 1
    assert export_depth_days("enterprise_platinum") == 0
    assert query_depth_days(None) == 1


# ------------------------------------------------- the asymmetry, on the gates


def test_archive_key_may_query_the_whole_archive():
    assert_history_depth(_auth("api_history"), 365 * 8)  # must not raise


def test_archive_key_may_not_export_the_whole_archive():
    """The headline behaviour. Same key, same depth, different axis."""
    with pytest.raises(HTTPException) as exc:
        assert_export_depth(_auth("api_history"), 365 * 8)
    assert exc.value.status_code == 403


def test_archive_key_may_export_inside_a_year():
    assert_export_depth(_auth("api_history"), 364)


def test_trial_key_is_capped_at_24_hours():
    assert_history_depth(_auth("api_trial"), 0.9)
    with pytest.raises(HTTPException):
        assert_history_depth(_auth("api_trial"), 2)


def test_trial_key_may_not_export_at_all():
    with pytest.raises(HTTPException) as exc:
        assert_export_depth(_auth("api_trial"), 0.1)
    assert "not available on this plan" in exc.value.detail


def test_basic_key_has_no_asymmetry():
    """Nothing to separate at 30 days; an asymmetry here would only confuse."""
    assert_history_depth(_auth("api_basic"), 29)
    assert_export_depth(_auth("api_basic"), 29)
    with pytest.raises(HTTPException):
        assert_export_depth(_auth("api_basic"), 31)


def test_missing_entitlement_is_unprivileged_not_unrestricted():
    """A caller that somehow bypasses verify_api_key must get the least."""
    assert tier_of({}) == ""
    with pytest.raises(HTTPException):
        assert_history_depth({}, 5)


# --------------------------------------------------------------- no drift
#
# api_trial / api_basic / api_history are defined in BOTH tier_enforcement
# (which drives clamp_hours_back, used by /v1/sentiment and the feed) and
# entitlement (which drives the depth gates, used by export). Two literals for
# one policy is how they drift, and which number applied would depend on the
# path a request happened to take.


@pytest.mark.parametrize("tier", ["api_trial", "api_basic", "api_history"])
def test_one_policy_read_twice(tier):
    assert limits_for(tier).history_days == query_depth_days(tier)


def test_legacy_constant_still_matches_its_documented_contract():
    """HISTORY_DEPTH_CAP_DAYS is now derived rather than independent. The
    migration and the public docs both quote 30, so it must stay 30 unless
    that is a deliberate change."""
    assert HISTORY_DEPTH_CAP_DAYS == 30
    assert HISTORY_DEPTH_CAP_DAYS == query_depth_days("api_basic")


def test_depth_is_overridable_without_a_deploy(monkeypatch):
    """Dropping the trial from 30 days to 24 hours is a REDUCTION for anyone
    already on the open beta. It has to be revertible as a Railway config
    change rather than a redeploy."""
    monkeypatch.setenv("INTEGRA_DEPTH_QUERY_API_TRIAL", "30")
    import importlib

    from services import entitlement

    importlib.reload(entitlement)
    try:
        assert entitlement.query_depth_days("api_trial") == 30
    finally:
        monkeypatch.delenv("INTEGRA_DEPTH_QUERY_API_TRIAL", raising=False)
        importlib.reload(entitlement)


def test_unlimited_survives_the_env_parser():
    """'unlimited' has to round-trip; float('unlimited') would raise and a
    silent fallback to a number would quietly cap the archive tier."""
    import importlib
    import os

    from services import entitlement

    os.environ["INTEGRA_DEPTH_EXPORT_API_HISTORY"] = "unlimited"
    importlib.reload(entitlement)
    try:
        assert entitlement.export_depth_days("api_history") == math.inf
    finally:
        del os.environ["INTEGRA_DEPTH_EXPORT_API_HISTORY"]
        importlib.reload(entitlement)


def test_depth_for_returns_both_axes():
    d = depth_for("api_history")
    assert d.query_days == math.inf and d.export_days == 365
