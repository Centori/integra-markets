"""API key generation, hashing, and verification.

Format: ``ik_live_<22 cryptographically random urlsafe chars>``. The full key
value leaves the server exactly once (on create). Only the prefix (first 11
chars, unique-indexed) and ``sha256(key)`` are stored.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
import time
from typing import Any, Dict, Optional

from fastapi import Depends, Header, HTTPException, Request

logger = logging.getLogger(__name__)

KEY_PREFIX_VISIBLE_LENGTH = 11  # "ik_live_xxx"
PUBLIC_PREFIX = "ik_live_"
KEY_BODY_BYTES = 24  # 24 random bytes → ~32 urlsafe chars

# --- Scope model -----------------------------------------------------------
# Paid API tiers map to key scopes (mirrors the dashboard pricing):
#   "history" → $99/mo API tier: historical endpoints, capped at 90 days depth.
#   "archive" → $249/mo Archive tier: full historical depth. Implies "history".
# A key with neither scope still reaches the base (real-time) endpoints; the
# historical/archive data is the monetized surface and must be scope-gated.
HISTORY_SCOPE = "history"
ARCHIVE_SCOPE = "archive"
HISTORY_DEPTH_CAP_DAYS = 90  # max look-back for a history-scoped (non-archive) key

# A granted scope may implicitly confer others (archive is a superset).
_SCOPE_IMPLIES: Dict[str, set] = {
    ARCHIVE_SCOPE: {ARCHIVE_SCOPE, HISTORY_SCOPE},
}


def effective_scopes(auth_row: Dict[str, Any]) -> set:
    """Expand a key's stored scopes with everything they imply (archive ⊇ history)."""
    granted = set(auth_row.get("scopes") or [])
    expanded = set(granted)
    for scope in granted:
        expanded |= _SCOPE_IMPLIES.get(scope, set())
    return expanded


def assert_history_depth(auth_row: Dict[str, Any], lookback_days: float) -> None:
    """Raise 403 if a non-archive key requests more than the history depth cap.

    A ``history``-scoped ($99) key may look back at most ``HISTORY_DEPTH_CAP_DAYS``;
    deeper ranges require the ``archive`` ($249) scope. No-op for archive keys.
    """
    if lookback_days > HISTORY_DEPTH_CAP_DAYS and ARCHIVE_SCOPE not in effective_scopes(auth_row):
        raise HTTPException(
            status_code=403,
            detail=(
                f"history beyond {HISTORY_DEPTH_CAP_DAYS} days requires the "
                f"'{ARCHIVE_SCOPE}' scope (Archive tier)"
            ),
        )


def require_scopes(*required: str):
    """Dependency factory: verify the key AND assert it carries every required
    scope. Returns 403 (not 401) on a valid-but-under-privileged key so clients
    can distinguish 'bad key' from 'upgrade needed'.
    """

    async def _dep(auth: Dict[str, Any] = Depends(verify_api_key)) -> Dict[str, Any]:
        have = effective_scopes(auth)
        missing = [s for s in required if s not in have]
        if missing:
            raise HTTPException(
                status_code=403,
                detail=f"API key missing required scope(s): {', '.join(missing)}",
            )
        return auth

    return _dep


def generate_key() -> tuple[str, str, str]:
    """Returns (full_key, prefix, sha256_hex)."""
    full_key = PUBLIC_PREFIX + secrets.token_urlsafe(KEY_BODY_BYTES)
    prefix = full_key[:KEY_PREFIX_VISIBLE_LENGTH]
    key_hash = hashlib.sha256(full_key.encode("utf-8")).hexdigest()
    return full_key, prefix, key_hash


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    if not authorization.startswith("Bearer "):
        return None
    return authorization.removeprefix("Bearer ").strip()


async def verify_api_key(
    request: Request,
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    """FastAPI dependency: validate Authorization header against api_keys table.

    Returns the api_keys row on success. Raises 401 on failure.
    """
    from services._supabase import get_supabase_client

    key = _extract_bearer(authorization)
    if not key or not key.startswith(PUBLIC_PREFIX):
        raise HTTPException(status_code=401, detail="missing or malformed API key")

    supabase = get_supabase_client()
    if supabase is None:
        raise HTTPException(status_code=503, detail="auth backend unavailable")

    started = time.monotonic()
    row = _lookup_row(supabase, key)
    if row is None:
        raise HTTPException(status_code=401, detail="invalid API key")

    _record_usage_async(supabase, row, request, int((time.monotonic() - started) * 1000))
    return row


def _lookup_row(supabase: Any, key: str) -> Optional[Dict[str, Any]]:
    prefix = key[:KEY_PREFIX_VISIBLE_LENGTH]
    try:
        rows = (
            supabase.table("api_keys")
            .select("*")
            .eq("key_prefix", prefix)
            .is_("revoked_at", "null")
            .limit(1)
            .execute()
            .data
            or []
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("api_keys lookup failed: %s", exc)
        return None
    if not rows:
        return None
    if not hmac.compare_digest(hash_key(key), rows[0]["key_hash"]):
        return None
    return rows[0]


def _record_usage_async(supabase: Any, row: Dict[str, Any], request: Request, latency_ms: int) -> None:
    """Best-effort write; never raise from inside an authenticated request."""
    try:
        supabase.table("api_key_usage").insert({
            "key_id": row["id"],
            "endpoint": request.url.path,
            "method": request.method,
            "latency_ms": latency_ms,
        }).execute()
        supabase.table("api_keys").update({
            "last_used_at": "now()",
        }).eq("id", row["id"]).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning("api_key usage logging failed: %s", exc)
