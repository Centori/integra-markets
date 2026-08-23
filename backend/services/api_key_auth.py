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
# Scopes are DERIVED SERVER-SIDE from the caller's live subscription, in
# services/entitlement.py. The `api_keys.scopes` column is a display cache for
# the dashboard and is never an authorization input: a key minted while the
# owner was subscribed must stop working when that subscription lapses, and
# freezing scopes at mint time made that structurally impossible.
from services.entitlement import (  # noqa: E402  (kept beside the scope model it replaces)
    ARCHIVE_SCOPE,
    HISTORY_DEPTH_CAP_DAYS,
    HISTORY_SCOPE,
    resolve as resolve_entitlement,
)


def effective_scopes(auth_row: Dict[str, Any]) -> set:
    """The caller's live scopes, resolved during verify_api_key.

    Returns the empty set if no entitlement was attached, so a caller that
    somehow bypasses verify_api_key is unprivileged rather than unrestricted.
    """
    ent = auth_row.get("_entitlement")
    return set(ent.scopes) if ent is not None else set()


def assert_history_depth(auth_row: Dict[str, Any], lookback_days: float) -> None:
    """Raise 403 if the OLDEST point requested is beyond the key's depth cap.

    ``lookback_days`` must be the AGE of the earliest requested timestamp
    (now - start), not the WIDTH of the window (end - start). Width let
    ``from=2015-01-01&to=2015-03-01`` — 59 days wide — pass a 90-day cap and
    reach eleven-year-old data.
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

    # The key's own lifetime, independent of the subscription, so a beta key can
    # carry a hard stop even if the tier outlives it.
    expires_at = row.get("expires_at")
    if expires_at and _is_past(expires_at):
        raise HTTPException(
            status_code=401,
            detail="API key expired; generate a new one in the dashboard",
        )

    # Authorization from live subscription state, not from the stored row.
    ent = resolve_entitlement(supabase, row.get("user_id"))
    if ent.is_expired_tier or not ent.scopes:
        raise HTTPException(
            status_code=403,
            detail=(
                "no active API entitlement for this account. If your beta "
                "window or subscription ended, renew at "
                "https://dashboard.integramarkets.app/api-tier"
            ),
        )
    row["_entitlement"] = ent
    row["_tier"] = ent.tier

    _record_usage_async(supabase, row, request, int((time.monotonic() - started) * 1000))
    return row


def _is_past(value: Any) -> bool:
    """True if `value` is a timestamp in the past. Unparseable → True.

    An expiry check that cannot read its own input must fail closed; treating a
    malformed timestamp as "not expired" would make a corrupt row a permanent key.
    """
    import datetime as _dt

    if isinstance(value, _dt.datetime):
        ts = value
    else:
        try:
            ts = _dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            logger.error("api key expires_at unparseable: %r", value)
            return True
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=_dt.timezone.utc)
    return ts < _dt.datetime.now(_dt.timezone.utc)


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
