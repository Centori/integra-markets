"""API key CRUD endpoints for the in-dashboard key manager.

These endpoints are called by the logged-in user from the dashboard. They
manage the user's OWN set of keys (list, create, revoke). Customer apps use
the keys themselves to authenticate against other endpoints via the
``verify_api_key`` dependency in ``services/api_key_auth.py``.

Auth: ``user_id`` is derived from the caller's Supabase JWT (Authorization:
Bearer <access token>) via ``verify_supabase_jwt`` — never from the request
body or query string. This prevents a caller from minting/listing/revoking
keys for an arbitrary ``user_id`` they don't own.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from services.api_key_auth import generate_key
from services.entitlement import resolve as resolve_entitlement
from services.supabase_jwt import verify_supabase_jwt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/keys", tags=["api-keys"])

MAX_KEYS_PER_USER = 10


class CreateKeyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    # `scopes` is deliberately absent. Scopes are derived from the caller's
    # subscription (services/entitlement.scopes_for_tier). A field the server
    # ignores is worse than no field: the dashboard keeps sending it and
    # everyone assumes it works.


class CreateKeyResponse(BaseModel):
    id: str
    key: str  # The plaintext value; shown ONCE, never again.
    prefix: str
    name: str
    scopes: List[str]
    expires_at: Optional[str]
    created_at: str


class KeyRow(BaseModel):
    id: str
    name: str
    prefix: str
    scopes: List[str]
    last_used_at: Optional[str]
    created_at: str


@router.post("", response_model=CreateKeyResponse)
async def create_key(
    payload: CreateKeyRequest,
    auth: Dict[str, Any] = Depends(verify_supabase_jwt),
) -> CreateKeyResponse:
    from services._supabase import get_supabase_client

    user_id = auth["user_id"]
    supabase = get_supabase_client()
    if supabase is None:
        raise HTTPException(status_code=503, detail="storage unavailable")

    _enforce_key_quota(supabase, user_id)

    ent = resolve_entitlement(supabase, user_id)
    if not ent.scopes:
        raise HTTPException(
            status_code=403,
            detail=(
                "this account has no API entitlement. Start the free beta or "
                "subscribe at https://dashboard.integramarkets.app/api-tier"
            ),
        )

    # Beta keys carry a hard stop matching the beta window, so the window closes
    # even if nothing ever rewrites the subscription row.
    expires_at = _trial_key_expiry(supabase, user_id) if ent.tier == "api_trial" else None

    full_key, prefix, key_hash = generate_key()

    try:
        inserted = (
            supabase.table("api_keys")
            .insert({
                "user_id": user_id,
                "name": payload.name,
                "key_prefix": prefix,
                "key_hash": key_hash,
                "scopes": sorted(ent.scopes),  # display cache only
                "expires_at": expires_at,
            })
            .execute()
            .data
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("api_keys insert failed")
        raise HTTPException(status_code=500, detail=str(exc))
    if not inserted:
        raise HTTPException(status_code=500, detail="insert returned no rows")

    row = inserted[0]
    return CreateKeyResponse(
        id=row["id"],
        key=full_key,
        prefix=prefix,
        name=row["name"],
        scopes=sorted(ent.scopes),
        expires_at=row.get("expires_at"),
        created_at=row["created_at"],
    )


def _trial_key_expiry(supabase: Any, user_id: str) -> Optional[str]:
    """Beta keys expire when the beta does — never later.

    If the subscription row is unreadable, fall back to a bounded window rather
    than to no expiry: an unreadable row must not mint a permanent key.
    """
    import datetime as dt

    fallback = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=30)).isoformat()
    try:
        rows = (
            supabase.table("user_subscriptions")
            .select("trial_ends_at")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
            .data
            or []
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("trial expiry lookup failed for %s: %s", user_id, exc)
        return fallback
    if rows and rows[0].get("trial_ends_at"):
        return rows[0]["trial_ends_at"]
    return fallback


@router.get("", response_model=List[KeyRow])
async def list_keys(auth: Dict[str, Any] = Depends(verify_supabase_jwt)) -> List[KeyRow]:
    from services._supabase import get_supabase_client

    user_id = auth["user_id"]
    supabase = get_supabase_client()
    if supabase is None:
        raise HTTPException(status_code=503, detail="storage unavailable")
    try:
        rows = (
            supabase.table("api_keys")
            .select("id, name, key_prefix, scopes, last_used_at, created_at")
            .eq("user_id", user_id)
            .is_("revoked_at", "null")
            .order("created_at", desc=True)
            .execute()
            .data
            or []
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("api_keys list failed")
        raise HTTPException(status_code=500, detail=str(exc))
    return [
        KeyRow(
            id=r["id"],
            name=r["name"],
            prefix=r["key_prefix"],
            scopes=r.get("scopes") or [],
            last_used_at=r.get("last_used_at"),
            created_at=r["created_at"],
        )
        for r in rows
    ]


@router.delete("/{key_id}")
async def revoke_key(
    key_id: str,
    auth: Dict[str, Any] = Depends(verify_supabase_jwt),
) -> Dict[str, Any]:
    from services._supabase import get_supabase_client

    user_id = auth["user_id"]
    supabase = get_supabase_client()
    if supabase is None:
        raise HTTPException(status_code=503, detail="storage unavailable")
    try:
        updated = (
            supabase.table("api_keys")
            .update({"revoked_at": "now()"})
            .eq("id", key_id)
            .eq("user_id", user_id)
            .is_("revoked_at", "null")
            .execute()
            .data
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("api_keys revoke failed")
        raise HTTPException(status_code=500, detail=str(exc))
    if not updated:
        raise HTTPException(status_code=404, detail="key not found or already revoked")
    return {"status": "revoked", "id": key_id}


def _enforce_key_quota(supabase: Any, user_id: str) -> None:
    try:
        result = (
            supabase.table("api_keys")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .is_("revoked_at", "null")
            .execute()
        )
        active = getattr(result, "count", None) or 0
    except Exception as exc:  # noqa: BLE001
        logger.warning("quota check failed: %s", exc)
        return  # fail-open — quota is a soft guard, not a security boundary
    if active >= MAX_KEYS_PER_USER:
        raise HTTPException(
            status_code=429,
            detail=f"key quota reached ({MAX_KEYS_PER_USER}); revoke one first",
        )
