"""Subscription state endpoints — powered by RevenueCat + Supabase mirror.

Three surfaces:
    GET  /api/subscriptions/entitlement   → current tier for the authed user
    POST /api/subscriptions/webhook       → RevenueCat pushes state changes here
    POST /api/subscriptions/link-web-tier → invoked from dashboard after Stripe
                                             checkout completes (for API tier)
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from services.supabase_jwt import verify_supabase_jwt
from services.tier_enforcement import get_effective_tier, limits_for

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])

# Optional shared-secret validation for RevenueCat webhook payloads.
# Set in Railway → env → REVENUECAT_WEBHOOK_AUTHORIZATION (matches the
# `Authorization` header value you set in RC dashboard → Integrations → Webhook).
_WEBHOOK_AUTH_TOKEN = os.getenv("REVENUECAT_WEBHOOK_AUTHORIZATION", "")


# ---------------------------------------------------------------------------
# GET current entitlement (called by mobile app on launch + after purchase)
# ---------------------------------------------------------------------------

@router.get("/entitlement")
async def get_entitlement(auth: Dict[str, Any] = Depends(verify_supabase_jwt)) -> dict:
    from services._supabase import get_supabase_client
    from services.trial_init import ensure_trial_started
    supabase = get_supabase_client()
    user_id = auth["user_id"]
    # First launch (or first-ever entitlement fetch) → ensure a trial exists.
    # Idempotent — existing users' rows are untouched.
    ensure_trial_started(supabase, user_id)
    tier = get_effective_tier(supabase, user_id)
    lim = limits_for(tier)
    # Return only what the client cares about (numbers, not internals).
    return {
        "tier": tier,
        # The trial clock. Previously the client had no way to know a trial was
        # running or when it ended, so it could not warn anyone — the app simply
        # became less capable on day 31 with no explanation, which reads as a
        # bug rather than as a prompt to subscribe.
        **_trial_window(supabase, user_id, tier),
        "limits": {
            "bookmarks": _finite(lim.bookmarks),
            "alerts": _finite(lim.alerts),
            "commodities": _finite(lim.commodities),
            "custom_rss_urls": _finite(lim.custom_rss_urls),
            "ai_overlay_per_day": _finite(lim.ai_overlay_per_day),
            "history_days": _finite(lim.history_days),
            "articles_per_session": _finite(lim.articles_per_session),
            "alert_types": list(lim.alert_types),
            "push_mode": lim.push_mode,
            "push_per_day": _finite(lim.push_per_day),
        },
    }


TRIAL_TIERS = ("free_trial", "api_trial")


def _trial_window(supabase: Any, user_id: str, tier: str) -> Dict[str, Any]:
    """The trial clock, for clients that need to warn before it runs out.

    `days_remaining` is rounded UP, so a trial with six hours left reports 1
    rather than 0 — "1 day left" is actionable, "0 days left" on a trial that
    is still running is not.

    Returns nulls rather than raising: a failure to read the clock must never
    break the entitlement call, which is what gates the whole app on launch.
    """
    empty = {"is_trial": False, "trial_ends_at": None, "days_remaining": None}
    if tier not in TRIAL_TIERS or supabase is None:
        return empty
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
        logger.warning("trial window lookup failed for %s: %s", user_id, exc)
        return empty
    if not rows or not rows[0].get("trial_ends_at"):
        return empty

    import datetime as _dt
    import math as _math

    raw = rows[0]["trial_ends_at"]
    try:
        ends = _dt.datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        logger.warning("unparseable trial_ends_at %r for %s", raw, user_id)
        return empty
    if ends.tzinfo is None:
        ends = ends.replace(tzinfo=_dt.timezone.utc)

    seconds_left = (ends - _dt.datetime.now(_dt.timezone.utc)).total_seconds()
    return {
        "is_trial": True,
        "trial_ends_at": ends.isoformat(),
        "days_remaining": max(0, _math.ceil(seconds_left / 86400.0)),
    }


def _finite(value: float) -> Optional[float]:
    """Convert math.inf → None so the JSON serializer doesn't choke."""
    import math
    if math.isinf(value):
        return None
    return value


# ---------------------------------------------------------------------------
# RevenueCat webhook — subscription state changes
# ---------------------------------------------------------------------------

class RevenueCatEvent(BaseModel):
    # RC wraps its payload under `event`
    event: Dict[str, Any] = Field(default_factory=dict)
    api_version: Optional[str] = None


@router.post("/webhook")
async def revenuecat_webhook(
    payload: RevenueCatEvent,
    authorization: Optional[str] = Header(default=None),
) -> dict:
    # Simple shared-secret check. RevenueCat lets you set an `Authorization`
    # header value in their dashboard — verify it matches what we expect.
    if _WEBHOOK_AUTH_TOKEN:
        if not authorization or not hmac.compare_digest(authorization, _WEBHOOK_AUTH_TOKEN):
            raise HTTPException(status_code=401, detail="invalid webhook auth")

    event = payload.event or {}
    event_type = event.get("type")
    app_user_id = event.get("app_user_id")
    if not app_user_id:
        logger.warning("revenuecat webhook: missing app_user_id in event %s", event_type)
        return {"ok": True, "skipped": "no app_user_id"}

    entitlements: list = event.get("entitlement_ids") or []
    if "basic_markets" in entitlements:
        new_tier = "basic_markets"
    elif "basic" in entitlements:
        new_tier = "basic"
    elif event_type in ("CANCELLATION", "EXPIRATION", "BILLING_ISSUE"):
        new_tier = "expired"
    else:
        # Unknown event type — leave tier as-is (defensive)
        logger.info("revenuecat webhook: unhandled event type %s", event_type)
        return {"ok": True, "skipped": f"unhandled event {event_type}"}

    period_ends_at = event.get("expiration_at_ms")
    period_ends_iso = None
    if period_ends_at:
        import datetime as _dt
        try:
            period_ends_iso = (
                _dt.datetime.fromtimestamp(period_ends_at / 1000, tz=_dt.timezone.utc)
                .isoformat()
            )
        except Exception:  # noqa: BLE001
            period_ends_iso = None

    from services._supabase import get_supabase_client
    supabase = get_supabase_client()
    if supabase is None:
        raise HTTPException(status_code=503, detail="supabase unavailable")

    row = {
        "user_id": app_user_id,
        "tier": new_tier,
        "source": "revenuecat",
        "revenuecat_user_id": app_user_id,
        "period_ends_at": period_ends_iso,
        "last_synced_at": _now_iso(),
    }
    if event_type in ("INITIAL_PURCHASE", "TRIAL_CONVERTED"):
        row["first_purchase_at"] = _now_iso()

    try:
        supabase.table("user_subscriptions").upsert(row, on_conflict="user_id").execute()
    except Exception as exc:  # noqa: BLE001
        logger.exception("revenuecat webhook upsert failed")
        raise HTTPException(status_code=500, detail=f"upsert failed: {exc}")

    # Drop the cached entitlement so an upgrade or cancellation takes effect
    # immediately rather than after ENTITLEMENT_TTL_SECONDS.
    from services.entitlement import invalidate
    invalidate(app_user_id)

    return {"ok": True, "tier": new_tier}


# ---------------------------------------------------------------------------
# Link web tier (called from dashboard after Stripe checkout succeeds)
# ---------------------------------------------------------------------------

class LinkWebTierRequest(BaseModel):
    stripe_customer_id: str
    # `tier` removed. It used to come from the request body, which let any
    # signed-in user self-grant any tier. Stripe is what sold the subscription,
    # so the Stripe webhook is what sets the tier; this endpoint only
    # establishes the link so that webhook can find the user.


@router.post("/link-web-tier")
async def link_web_tier(
    payload: LinkWebTierRequest,
    auth: Dict[str, Any] = Depends(verify_supabase_jwt),
) -> dict:
    from services._supabase import get_supabase_client
    from services.entitlement import invalidate

    supabase = get_supabase_client()
    if supabase is None:
        raise HTTPException(status_code=503, detail="supabase unavailable")

    user_id = auth["user_id"]

    # Refuse to bind a customer id already linked to a different account —
    # otherwise anyone who learns a customer id inherits that subscription.
    try:
        existing = (
            supabase.table("user_subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", payload.stripe_customer_id)
            .execute()
            .data
            or []
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("link_web_tier lookup failed")
        raise HTTPException(status_code=503, detail=f"lookup failed: {exc}")
    if existing and existing[0]["user_id"] != user_id:
        logger.error(
            "link_web_tier: customer %s already linked to %s, refused for %s",
            payload.stripe_customer_id, existing[0]["user_id"], user_id,
        )
        raise HTTPException(status_code=409, detail="customer already linked")

    row = {
        "user_id": user_id,
        "source": "stripe",
        "stripe_customer_id": payload.stripe_customer_id,
        "last_synced_at": _now_iso(),
    }
    try:
        supabase.table("user_subscriptions").upsert(row, on_conflict="user_id").execute()
    except Exception as exc:  # noqa: BLE001
        logger.exception("link_web_tier upsert failed")
        raise HTTPException(status_code=500, detail=f"upsert failed: {exc}")
    invalidate(user_id)
    return {"ok": True}


def _now_iso() -> str:
    import datetime as _dt
    return _dt.datetime.now(_dt.timezone.utc).isoformat()
