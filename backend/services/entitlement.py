"""Single source of truth for "what is this caller allowed to do, right now".

Replaces two separate, drifting notions of entitlement:

  * ``api_keys.scopes``   — frozen at mint time, client-supplied, never revisited
  * ``effective_tier()``  — consulted by some endpoints, ignored by the key path

Both are now derived from the same place on every request. A key's stored
``scopes`` column is kept only so the dashboard can display something; it is
never an authorization input.

Cost note: this adds one Supabase RPC per API request. A short TTL cache keyed
by user_id absorbs bursts (an MCP session issues many calls per minute); the
TTL bounds how long a cancellation can lag, so keep it small.
"""

from __future__ import annotations

import logging
import os
import threading
import time
from typing import Any, Dict, Optional, Set

logger = logging.getLogger(__name__)

HISTORY_SCOPE = "history"
ARCHIVE_SCOPE = "archive"

# How far back a non-archive key may look. The $99 tier and the 30-day open
# beta both sit inside real queryable depth (~57 days measured 2026-08-14).
HISTORY_DEPTH_CAP_DAYS = int(os.environ.get("INTEGRA_HISTORY_DEPTH_CAP_DAYS", "30"))

# Seconds an entitlement decision may be reused. Bounds revocation lag.
ENTITLEMENT_TTL_SECONDS = int(os.environ.get("INTEGRA_ENTITLEMENT_TTL_SECONDS", "60"))

# Mirrors public.scopes_for_tier() in the migration. Kept here as the fallback
# for when the RPC is unavailable, and as the definition the tests assert on.
_TIER_SCOPES: Dict[str, frozenset] = {
    "api_history": frozenset({HISTORY_SCOPE, ARCHIVE_SCOPE}),
    "api_basic": frozenset({HISTORY_SCOPE}),
    "api": frozenset({HISTORY_SCOPE}),        # legacy alias for api_basic
    "api_trial": frozenset({HISTORY_SCOPE}),  # open beta: read, no export
}

# Tiers permitted to bulk/CSV export. The beta's conversion lever.
_EXPORT_TIERS = frozenset({"api_basic", "api_history", "api"})


class Entitlement:
    """An immutable decision about one user at one moment."""

    __slots__ = ("tier", "scopes", "resolved_at")

    def __init__(self, tier: str, scopes: Set[str], resolved_at: float) -> None:
        self.tier = tier
        self.scopes = frozenset(scopes)
        self.resolved_at = resolved_at

    @property
    def is_expired_tier(self) -> bool:
        return self.tier == "expired"

    def has(self, *required: str) -> bool:
        return all(s in self.scopes for s in required)

    def can_export(self) -> bool:
        return self.tier in _EXPORT_TIERS


def scopes_for_tier(tier: Optional[str]) -> Set[str]:
    """Server-side scope derivation. The ONLY function that decides scopes."""
    return set(_TIER_SCOPES.get(tier or "", frozenset()))


# --- cache -----------------------------------------------------------------

_cache: Dict[str, Entitlement] = {}
_cache_lock = threading.Lock()


def invalidate(user_id: str) -> None:
    """Drop a cached decision. Call from webhooks so a cancellation or an
    upgrade takes effect immediately instead of after the TTL."""
    with _cache_lock:
        _cache.pop(user_id, None)


def _cached(user_id: str) -> Optional[Entitlement]:
    with _cache_lock:
        ent = _cache.get(user_id)
    if ent is None:
        return None
    if time.monotonic() - ent.resolved_at > ENTITLEMENT_TTL_SECONDS:
        return None
    return ent


def _store(user_id: str, ent: Entitlement) -> None:
    with _cache_lock:
        # Bound memory; this is a per-process cache, not a shared one.
        if len(_cache) > 10_000:
            _cache.clear()
        _cache[user_id] = ent


# --- resolution ------------------------------------------------------------

def _looks_like_uuid(value: str) -> bool:
    """api_keys.user_id is TEXT while user_subscriptions.user_id is UUID.
    Passing a non-UUID string to the RPC raises 22P02, which the old code
    swallowed into a silent 'free_trial' downgrade. Detect it and say so."""
    if len(value) != 36:
        return False
    parts = value.split("-")
    if len(parts) != 5 or [len(p) for p in parts] != [8, 4, 4, 4, 12]:
        return False
    try:
        int(value.replace("-", ""), 16)
    except ValueError:
        return False
    return True


def resolve(supabase: Any, user_id: Optional[str]) -> Entitlement:
    """Resolve a user's live entitlement.

    Fails CLOSED: any error yields the zero-privilege entitlement rather than
    a permissive default. The previous behaviour ('free_trial' on error) was
    permissive for mobile limits but produced *silently wrong data* on the API
    surface — a paying customer clamped to 24h with a 200 response.
    """
    now = time.monotonic()
    if not user_id:
        return Entitlement("expired", set(), now)

    hit = _cached(user_id)
    if hit is not None:
        return hit

    if supabase is None:
        logger.warning("entitlement: supabase unavailable for %s", user_id)
        return Entitlement("expired", set(), now)

    if not _looks_like_uuid(user_id):
        # Do not silently downgrade — this is a data-integrity bug, not a
        # free user. Surface it in logs with the key owner's id.
        logger.error("entitlement: non-UUID user_id %r on api key row", user_id)
        return Entitlement("expired", set(), now)

    tier = "expired"
    try:
        result = supabase.rpc("entitlement_for", {"p_user_id": user_id}).execute()
        data = getattr(result, "data", None)
        if isinstance(data, list) and data:
            data = data[0]
        if isinstance(data, dict) and isinstance(data.get("tier"), str):
            tier = data["tier"]
            scopes = set(data.get("scopes") or [])
            ent = Entitlement(tier, scopes, now)
            _store(user_id, ent)
            return ent
        logger.warning("entitlement: unexpected RPC shape for %s: %r", user_id, data)
    except Exception as exc:  # noqa: BLE001
        logger.warning("entitlement: RPC failed for %s: %s", user_id, exc)
        return Entitlement("expired", set(), now)

    # RPC returned something unusable — derive locally from whatever tier we got.
    ent = Entitlement(tier, scopes_for_tier(tier), now)
    _store(user_id, ent)
    return ent
