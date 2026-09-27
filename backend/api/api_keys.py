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

from services import usage_alerts, usage_stats
from services.api_key_auth import generate_key
from services.entitlement import resolve as resolve_entitlement
from services.rate_limit import plan_spec
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

    # Email is passed so a comp grant listed by email — the only identifier a
    # person actually knows about themselves — unlocks key creation and not
    # merely the dashboard that offers it.
    ent = resolve_entitlement(supabase, user_id, auth.get("email"))
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


# ---------------------------------------------------------------------------
# Usage, limits and alerts
#
# These three back the dashboard tabs that said "Soon" while api_key_usage
# quietly accumulated every request since launch. Nothing new is measured here;
# what was missing was a way for the person paying to read it.
#
# All three derive user_id from the verified JWT. That is load-bearing for the
# usage RPCs in particular: they are `security definer` and filter on the
# p_user_id they are handed, so passing an id from the request would let any
# authenticated caller read another account's usage.
# ---------------------------------------------------------------------------


class AlertConfigRequest(BaseModel):
    enabled: bool = True
    thresholds: List[int] = Field(default_factory=lambda: list(usage_alerts.DEFAULT_THRESHOLDS))
    webhook_url: Optional[str] = None


def _client_or_503() -> Any:
    from services._supabase import get_supabase_client

    supabase = get_supabase_client()
    if supabase is None:
        raise HTTPException(status_code=503, detail="storage unavailable")
    return supabase


def _entitled(supabase: Any, auth: Dict[str, Any]) -> Any:
    """Resolve the caller's entitlement, refusing accounts with no API access.

    Usage and alerts are gated the same way key creation is. An account with no
    entitlement has no keys, so the pages would be empty anyway — a 403 that
    names the upgrade path is more use than an empty table.
    """
    ent = resolve_entitlement(supabase, auth["user_id"], auth.get("email"))
    if not ent.scopes:
        raise HTTPException(
            status_code=403,
            detail=(
                "this account has no API entitlement. Start the free beta or "
                "subscribe at https://dashboard.integramarkets.app/api-tier"
            ),
        )
    return ent


@router.get("/limits")
async def get_limits(auth: Dict[str, Any] = Depends(verify_supabase_jwt)) -> Dict[str, Any]:
    """The limits actually enforced for this account.

    Exists because the dashboard used to state them as hand-typed copy — "100k
    requests / month, 100 req/sec burst" — while the enforced monthly cap was
    50,000 and no per-second limiter existed at all. A paying customer was
    promised double their allowance and would have been refused at half of the
    advertised number with no explanation matching anything they had read.

    Serving the numbers from the constants that enforce them is the fix. Copy
    cannot drift from behaviour when nobody types it.
    """
    supabase = _client_or_503()
    ent = _entitled(supabase, auth)
    return {**plan_spec(ent.tier), "max_keys": MAX_KEYS_PER_USER}


@router.get("/usage")
async def get_usage(auth: Dict[str, Any] = Depends(verify_supabase_jwt)) -> Dict[str, Any]:
    """Usage for the current UTC calendar month, plus a 30-day daily series.

    The period is the calendar month because that is the period the limit is
    enforced over (services/rate_limit.period_start). A rolling window here
    beside a "remaining" figure computed from calendar months would disagree
    with itself by construction.
    """
    supabase = _client_or_503()
    ent = _entitled(supabase, auth)
    return usage_stats.summarise(supabase, auth["user_id"], ent.tier)


@router.get("/alerts")
async def get_alerts(auth: Dict[str, Any] = Depends(verify_supabase_jwt)) -> Dict[str, Any]:
    supabase = _client_or_503()
    _entitled(supabase, auth)
    config = usage_alerts.load(supabase, auth["user_id"])
    return {
        **config,
        "available_thresholds": list(usage_alerts.ALLOWED_THRESHOLDS),
        "max_thresholds": usage_alerts.MAX_THRESHOLDS,
        # Named so the UI can explain the channel rather than implying email.
        "delivery": "webhook",
    }


@router.put("/alerts")
async def put_alerts(
    payload: AlertConfigRequest,
    auth: Dict[str, Any] = Depends(verify_supabase_jwt),
) -> Dict[str, Any]:
    supabase = _client_or_503()
    _entitled(supabase, auth)

    # Validated here rather than in the model so the 400 carries the message
    # usage_alerts writes for a person, instead of a pydantic schema dump.
    try:
        thresholds = usage_alerts.normalise_thresholds(payload.thresholds)
        webhook = usage_alerts.validate_webhook_url(payload.webhook_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        saved = usage_alerts.save(
            supabase, auth["user_id"], payload.enabled, thresholds, webhook
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("usage alert save failed")
        raise HTTPException(status_code=500, detail=str(exc))
    return {**saved, "available_thresholds": list(usage_alerts.ALLOWED_THRESHOLDS)}
