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

from services.comp_access import DEFAULT_COMP_TIER, comp_tier_for, is_comped
from services.entitlement import resolve as resolve_entitlement
from services.tier_enforcement import get_effective_tier

UID = "11111111-2222-3333-4444-555555555555"
EMAIL = "owner@example.com"


@pytest.fixture(autouse=True)
def _clear_env(monkeypatch):
    for var in ("INTEGRA_COMP_EMAILS", "INTEGRA_COMP_USER_IDS", "INTEGRA_COMP_TIER"):
        monkeypatch.delenv(var, raising=False)


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
