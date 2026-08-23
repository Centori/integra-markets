"""Security gates for the API key layer.

Contract change (2026-08-23): scopes are DERIVED from the caller's live
subscription at request time, not read from the `api_keys.scopes` column.
Freezing scopes at mint time made revocation structurally impossible — a key
minted while subscribed kept working forever after cancellation.

`api_keys.scopes` is now a display cache for the dashboard. These tests pin
that it is never an authorization input.

Pure-logic tests: no Supabase, no network, no pytest-asyncio plugin (the
dependency callables are driven directly via asyncio.run).
"""

import asyncio
import time

import pytest
from fastapi import HTTPException

from services.api_key_auth import (
    ARCHIVE_SCOPE,
    HISTORY_DEPTH_CAP_DAYS,
    HISTORY_SCOPE,
    assert_history_depth,
    effective_scopes,
    require_scopes,
)
from services.entitlement import Entitlement, scopes_for_tier


def _auth(tier: str, *, stored_scopes=None, key_id: str = "k1") -> dict:
    """Build an auth row as verify_api_key produces it: a live entitlement in
    `_entitlement`, plus whatever happens to be in the stored column."""
    row = {"id": key_id, "_entitlement": Entitlement(tier, scopes_for_tier(tier), time.monotonic())}
    if stored_scopes is not None:
        row["scopes"] = stored_scopes
    return row


# --- scope derivation ------------------------------------------------------

def test_archive_tier_carries_both_scopes():
    assert scopes_for_tier("api_history") == {ARCHIVE_SCOPE, HISTORY_SCOPE}


def test_basic_tier_is_history_only():
    assert scopes_for_tier("api_basic") == {HISTORY_SCOPE}


def test_legacy_api_alias_is_history_only():
    assert scopes_for_tier("api") == {HISTORY_SCOPE}


def test_trial_tier_is_history_only():
    """The 30-day beta reads history; export is what it does not get."""
    assert scopes_for_tier("api_trial") == {HISTORY_SCOPE}


@pytest.mark.parametrize("tier", ["free", "free_trial", "basic", "basic_markets", "expired", "", None])
def test_non_api_tiers_carry_no_scopes(tier):
    assert scopes_for_tier(tier) == set()


# --- the stored column is NOT an authorization input ------------------------

def test_stored_scopes_are_ignored_when_entitlement_is_empty():
    """The regression test for the whole change: a key row still carrying
    ["archive"] from before the fix grants nothing once the subscription is
    gone."""
    row = _auth("expired", stored_scopes=[ARCHIVE_SCOPE, HISTORY_SCOPE])
    assert effective_scopes(row) == set()


def test_stored_scopes_cannot_widen_a_live_entitlement():
    """A self-granted `archive` in the column does not survive a history tier."""
    row = _auth("api_basic", stored_scopes=[ARCHIVE_SCOPE])
    assert effective_scopes(row) == {HISTORY_SCOPE}
    with pytest.raises(HTTPException) as exc:
        assert_history_depth(row, HISTORY_DEPTH_CAP_DAYS + 1)
    assert exc.value.status_code == 403


def test_missing_entitlement_is_unprivileged_not_unrestricted():
    """A row that never passed through verify_api_key grants nothing."""
    assert effective_scopes({}) == set()
    assert effective_scopes({"scopes": [ARCHIVE_SCOPE]}) == set()


# --- require_scopes: 403 on under-privileged key ---------------------------

def _run_dep(dep, auth):
    return asyncio.run(dep(auth=auth))


def test_require_scopes_passes_when_scope_present():
    dep = require_scopes(HISTORY_SCOPE)
    auth = _auth("api_basic")
    assert _run_dep(dep, auth) is auth


def test_require_scopes_passes_archive_key_for_history_route():
    dep = require_scopes(HISTORY_SCOPE)
    auth = _auth("api_history")  # archive tier carries history too
    assert _run_dep(dep, auth) is auth


def test_require_scopes_rejects_missing_scope_with_403():
    dep = require_scopes(HISTORY_SCOPE)
    with pytest.raises(HTTPException) as exc:
        _run_dep(dep, _auth("free"))
    assert exc.value.status_code == 403
    assert HISTORY_SCOPE in exc.value.detail


def test_require_scopes_rejects_lapsed_subscription():
    dep = require_scopes(HISTORY_SCOPE)
    with pytest.raises(HTTPException) as exc:
        _run_dep(dep, _auth("expired", stored_scopes=[HISTORY_SCOPE]))
    assert exc.value.status_code == 403


# --- assert_history_depth: cap measured by AGE, not window width ------------

def test_history_within_cap_allowed_for_history_key():
    assert_history_depth(_auth("api_basic"), HISTORY_DEPTH_CAP_DAYS - 1)


def test_history_beyond_cap_blocked_without_archive():
    with pytest.raises(HTTPException) as exc:
        assert_history_depth(_auth("api_basic"), HISTORY_DEPTH_CAP_DAYS + 30)
    assert exc.value.status_code == 403
    assert ARCHIVE_SCOPE in exc.value.detail


def test_history_beyond_cap_allowed_with_archive():
    assert_history_depth(_auth("api_history"), 365 * 5)


def test_history_exactly_at_cap_allowed():
    assert_history_depth(_auth("api_basic"), HISTORY_DEPTH_CAP_DAYS)


def test_depth_cap_is_thirty_days():
    """Pinned to the pricing decision: the $99 tier sells a 30-day window,
    which sits inside real queryable depth. 90 sold more than exists."""
    assert HISTORY_DEPTH_CAP_DAYS == 30


# --- POST /api/keys no longer accepts caller-supplied identity or scopes ----

def test_create_key_request_rejects_body_user_id():
    """user_id is derived from the JWT, never the body."""
    from api.api_keys import CreateKeyRequest

    assert "user_id" not in CreateKeyRequest.model_fields
    model = CreateKeyRequest(name="ci", user_id="attacker-supplied")
    assert not hasattr(model, "user_id")


def test_create_key_request_rejects_body_scopes():
    """scopes are derived from the subscription, never the body. The field is
    absent rather than ignored so the dashboard cannot keep sending it under
    the impression that it works."""
    from api.api_keys import CreateKeyRequest

    assert "scopes" not in CreateKeyRequest.model_fields
    model = CreateKeyRequest(name="ci", scopes=["archive"])
    assert not hasattr(model, "scopes")
