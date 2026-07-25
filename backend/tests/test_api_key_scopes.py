"""Security gates for the API key layer (Phase 1).

Covers the two monetization/security fixes:

  1. Scope/tier enforcement in the api_key auth layer — `verify_api_key` alone
     no longer grants the paid archive. Historical routes require the `history`
     scope ($99 tier); look-back beyond 90 days requires `archive` ($249).
  2. `require_scopes` returns 403 (upgrade needed), not 401 (bad key), on a
     valid-but-under-privileged key.

These are pure-logic tests: no Supabase, no network, no pytest-asyncio plugin
(the dependency callables are driven directly via asyncio.run).
"""

import asyncio

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


# --- effective_scopes: archive is a superset of history --------------------

def test_archive_scope_implies_history():
    assert effective_scopes({"scopes": [ARCHIVE_SCOPE]}) == {ARCHIVE_SCOPE, HISTORY_SCOPE}


def test_history_scope_is_only_history():
    assert effective_scopes({"scopes": [HISTORY_SCOPE]}) == {HISTORY_SCOPE}


def test_no_scopes_is_empty():
    assert effective_scopes({"scopes": []}) == set()
    assert effective_scopes({}) == set()


# --- require_scopes: 403 on under-privileged key ---------------------------

def _run_dep(dep, auth):
    """Drive a require_scopes dependency directly, bypassing FastAPI's Depends."""
    return asyncio.run(dep(auth=auth))


def test_require_scopes_passes_when_scope_present():
    dep = require_scopes(HISTORY_SCOPE)
    auth = {"id": "k1", "scopes": [HISTORY_SCOPE]}
    assert _run_dep(dep, auth) is auth


def test_require_scopes_passes_archive_key_for_history_route():
    dep = require_scopes(HISTORY_SCOPE)
    auth = {"id": "k1", "scopes": [ARCHIVE_SCOPE]}  # archive ⊇ history
    assert _run_dep(dep, auth) is auth


def test_require_scopes_rejects_missing_scope_with_403():
    dep = require_scopes(HISTORY_SCOPE)
    with pytest.raises(HTTPException) as exc:
        _run_dep(dep, {"id": "k1", "scopes": []})  # base key, no history
    assert exc.value.status_code == 403
    assert HISTORY_SCOPE in exc.value.detail


# --- assert_history_depth: 90-day cap unless archive -----------------------

def test_history_within_cap_allowed_for_history_key():
    # 89 days, history scope → fine
    assert_history_depth({"scopes": [HISTORY_SCOPE]}, HISTORY_DEPTH_CAP_DAYS - 1)


def test_history_beyond_cap_blocked_without_archive():
    with pytest.raises(HTTPException) as exc:
        assert_history_depth({"scopes": [HISTORY_SCOPE]}, HISTORY_DEPTH_CAP_DAYS + 30)
    assert exc.value.status_code == 403
    assert ARCHIVE_SCOPE in exc.value.detail


def test_history_beyond_cap_allowed_with_archive():
    # 5 years back, archive scope → no raise
    assert_history_depth({"scopes": [ARCHIVE_SCOPE]}, 365 * 5)


def test_history_exactly_at_cap_allowed():
    assert_history_depth({"scopes": [HISTORY_SCOPE]}, HISTORY_DEPTH_CAP_DAYS)


# --- POST /api/keys no longer accepts a body user_id -----------------------

def test_create_key_request_rejects_body_user_id():
    """The request model must not carry user_id — it's derived from the JWT."""
    from api.api_keys import CreateKeyRequest

    assert "user_id" not in CreateKeyRequest.model_fields
    # A caller-supplied user_id is ignored/forbidden, not silently trusted.
    model = CreateKeyRequest(name="ci", user_id="attacker-supplied")
    assert not hasattr(model, "user_id")
