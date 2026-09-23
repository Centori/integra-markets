"""A comp grant must reach BOTH tier resolvers, or it is worse than none.

The dashboard renders from ``tier_enforcement.get_effective_tier`` (via
/api/subscriptions/entitlement); key creation authorizes from
``entitlement.resolve``. Comping one and not the other produces a dashboard
that offers key management next to a create call that answers 403 — a state
that reads as a broken product rather than as a missing entitlement.

These tests exist to pin that pairing. The rest cover the parsing, because the
input is a hand-edited environment variable and every realistic mistake in one
(padding, case, quotes, a trailing comma) should still grant access rather than
silently not.
"""

from __future__ import annotations

import pytest
import requests

from services import comp_access
from services.comp_access import DEFAULT_COMP_TIER, comp_tier_for, is_comped
from services.entitlement import resolve as resolve_entitlement
from services.tier_enforcement import get_effective_tier

UID = "11111111-2222-3333-4444-555555555555"
STRANGER_UID = "99999999-8888-7777-6666-555555555555"
EMAIL = "owner@example.com"


@pytest.fixture(autouse=True)
def _clear_env(monkeypatch):
    for var in (
        "INTEGRA_COMP_EMAILS",
        "INTEGRA_COMP_USER_IDS",
        "INTEGRA_COMP_TIER",
        # Cleared so a developer with real credentials exported does not have
        # these tests make live admin calls against production.
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
    ):
        monkeypatch.delenv(var, raising=False)
    # The email lookup is memoised for 15 minutes; a cache surviving between
    # tests would let one test's stub answer another's assertion.
    comp_access._email_cache.clear()


class _Boom:
    """Marker for 'this call raises', used by the outage test."""


class _Response:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def _stub_admin_lookup(monkeypatch, users):
    """Point the GoTrue admin call at a dict. Returns the list of ids requested."""
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key")
    comp_access._email_cache.clear()
    calls = []

    def _get(url, headers=None, timeout=None):
        user_id = url.rsplit("/", 1)[-1]
        calls.append(user_id)
        if user_id not in users:
            return _Response(404, None)
        return _Response(200, {"id": user_id, "email": users[user_id]})

    monkeypatch.setattr(requests, "get", _get)
    return calls


def test_nobody_is_comped_by_default():
    """The absence of configuration must not grant anything."""
    assert comp_tier_for(UID, EMAIL) is None
    assert not is_comped(UID, EMAIL)


def test_email_grant(monkeypatch):
    monkeypatch.setenv("INTEGRA_COMP_EMAILS", EMAIL)
    assert comp_tier_for(None, EMAIL) == DEFAULT_COMP_TIER


def test_user_id_grant(monkeypatch):
    monkeypatch.setenv("INTEGRA_COMP_USER_IDS", UID)
    assert comp_tier_for(UID, None) == DEFAULT_COMP_TIER


def test_parsing_survives_hand_editing(monkeypatch):
    """Padding, case, quotes and a trailing comma are all user error we absorb."""
    monkeypatch.setenv("INTEGRA_COMP_EMAILS", ' "Owner@Example.COM" , someone@else.io ,')
    assert comp_tier_for(None, "owner@example.com") == DEFAULT_COMP_TIER
    assert comp_tier_for(None, "  SOMEONE@ELSE.IO ") == DEFAULT_COMP_TIER
    assert comp_tier_for(None, "stranger@else.io") is None


def test_tier_is_overridable(monkeypatch):
    monkeypatch.setenv("INTEGRA_COMP_EMAILS", EMAIL)
    monkeypatch.setenv("INTEGRA_COMP_TIER", "api_basic")
    assert comp_tier_for(None, EMAIL) == "api_basic"


def test_both_resolvers_agree_on_an_email_grant(monkeypatch):
    """The pairing this file exists for.

    supabase=None on purpose: it proves the grant is decided BEFORE any lookup,
    so it holds when the RPC is unavailable and — the actual case — when there
    is no subscription row to find because nobody has paid yet.
    """
    monkeypatch.setenv("INTEGRA_COMP_EMAILS", EMAIL)

    assert get_effective_tier(None, UID, EMAIL) == DEFAULT_COMP_TIER

    ent = resolve_entitlement(None, UID, EMAIL)
    assert ent.tier == DEFAULT_COMP_TIER
    assert ent.scopes, "a comped tier with no scopes cannot create a key"
    assert ent.can_export()


def test_both_resolvers_agree_on_a_user_id_grant(monkeypatch):
    """The UUID list is the one that reaches API-key requests.

    An API-key request has no email — only api_keys.user_id — so an email-only
    grant unlocks the dashboard and leaves every key minted from it inert.
    """
    monkeypatch.setenv("INTEGRA_COMP_USER_IDS", UID)

    assert get_effective_tier(None, UID) == DEFAULT_COMP_TIER

    ent = resolve_entitlement(None, UID)  # no email, as on the key path
    assert ent.tier == DEFAULT_COMP_TIER
    assert ent.scopes


def test_a_stranger_is_unaffected(monkeypatch):
    """The override must be inert for everyone not listed.

    With supabase=None both resolvers fail closed, which is what a non-comped
    caller should still get.
    """
    monkeypatch.setenv("INTEGRA_COMP_EMAILS", EMAIL)
    monkeypatch.setenv("INTEGRA_COMP_USER_IDS", UID)

    assert get_effective_tier(None, "99999999-8888-7777-6666-555555555555") == "free"

    ent = resolve_entitlement(None, "99999999-8888-7777-6666-555555555555", "x@y.io")
    assert ent.tier == "expired"
    assert not ent.scopes


def test_an_identifier_in_the_wrong_variable_still_works(monkeypatch):
    """Putting an email in the UUID variable must not silently do nothing.

    The two variable names document which identifier reaches which surface.
    Treating them as two separate matches meant a value in the "wrong" one
    matched nothing at all — a grant that looks configured and isn't, which is
    the exact failure this module exists to avoid.
    """
    monkeypatch.setenv("INTEGRA_COMP_USER_IDS", EMAIL)
    assert comp_tier_for(UID, EMAIL) == DEFAULT_COMP_TIER

    monkeypatch.delenv("INTEGRA_COMP_USER_IDS")
    monkeypatch.setenv("INTEGRA_COMP_EMAILS", UID)
    assert comp_tier_for(UID, None) == DEFAULT_COMP_TIER


def test_an_email_grant_reaches_the_api_key_path(monkeypatch):
    """The half-grant this module exists to prevent, closed.

    An API-key request carries only api_keys.user_id. An email grant therefore
    used to unlock the dashboard — which mints keys happily — and leave every
    one of those keys answering 403, with nothing anywhere saying why. The
    email behind the UUID is now looked up instead of demanded as a second
    hand-pasted variable.
    """
    monkeypatch.setenv("INTEGRA_COMP_EMAILS", EMAIL)
    _stub_admin_lookup(monkeypatch, {UID: EMAIL})

    assert comp_tier_for(UID, None) == DEFAULT_COMP_TIER

    ent = resolve_entitlement(None, UID)  # no email, as on the key path
    assert ent.scopes, "a comped key with no scopes is a key that 403s"


def test_the_lookup_is_not_a_second_grant(monkeypatch):
    """Resolving an email must not comp an account whose email is not listed."""
    monkeypatch.setenv("INTEGRA_COMP_EMAILS", EMAIL)
    _stub_admin_lookup(monkeypatch, {STRANGER_UID: "stranger@else.io"})
    assert comp_tier_for(STRANGER_UID, None) is None


def test_no_service_key_means_no_lookup(monkeypatch):
    """Without admin credentials the old constraint still holds, silently safe.

    This is the deployment where only the UUID variable can comp a key, and it
    must fail closed rather than raise or grant.
    """
    monkeypatch.setenv("INTEGRA_COMP_EMAILS", EMAIL)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    comp_access._email_cache.clear()
    assert comp_tier_for(UID, None) is None


def test_a_uuid_grant_costs_no_lookup(monkeypatch):
    """The offline path stays offline — the admin call is the fallback, not the rule."""
    monkeypatch.setenv("INTEGRA_COMP_USER_IDS", UID)
    calls = _stub_admin_lookup(monkeypatch, {UID: EMAIL})
    assert comp_tier_for(UID, None) == DEFAULT_COMP_TIER
    assert calls == [], "a listed UUID must be decided before any network call"


def test_a_failed_lookup_is_not_cached(monkeypatch):
    """A transient outage must not pin 'not comped' for the whole TTL.

    Caching a failure here reads to the user as a grant that was revoked and
    came back on its own, which is far harder to diagnose than a slow request.
    """
    monkeypatch.setenv("INTEGRA_COMP_EMAILS", EMAIL)
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key")
    comp_access._email_cache.clear()

    outcomes = [_Boom(), _Response(200, {"email": EMAIL})]

    def _get(url, headers=None, timeout=None):
        outcome = outcomes.pop(0)
        if isinstance(outcome, _Boom):
            raise RuntimeError("connection reset")
        return outcome

    monkeypatch.setattr(requests, "get", _get)

    assert comp_tier_for(UID, None) is None
    assert comp_tier_for(UID, None) == DEFAULT_COMP_TIER


def test_a_resolved_answer_is_cached(monkeypatch):
    """Including a miss: a stranger's id must cost one admin call, not one per request."""
    monkeypatch.setenv("INTEGRA_COMP_EMAILS", EMAIL)
    calls = _stub_admin_lookup(monkeypatch, {STRANGER_UID: "stranger@else.io"})
    for _ in range(3):
        assert comp_tier_for(STRANGER_UID, None) is None
    assert len(calls) == 1
