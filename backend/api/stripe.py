"""Stripe integration for the web `api` tier.

Web-only surface — the mobile app uses Apple IAP (via RevenueCat). Stripe
handles the API tier subscribers who buy programmatic access through the
dashboard at dashboard.integramarkets.app/api-tier.

Env vars (all in Railway):
    STRIPE_SECRET_KEY               starts with `sk_live_` or `sk_test_`
    STRIPE_WEBHOOK_SECRET           starts with `whsec_`
    STRIPE_API_BASIC_PRICE_ID       starts with `price_`  ($99/mo, 90-day rolling)
    STRIPE_API_HISTORY_PRICE_ID     starts with `price_`  ($249/mo, full archive)
    STRIPE_API_TIER_PRICE_ID        DEPRECATED — falls back for api_basic if the
                                     newer var isn't set. Remove after cutover.
    STRIPE_SUCCESS_URL              default: https://dashboard.integramarkets.app/api-tier?success=1
    STRIPE_CANCEL_URL               default: https://dashboard.integramarkets.app/api-tier?canceled=1
"""

from __future__ import annotations

import datetime as dt
import logging
import os
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel

from services.supabase_jwt import verify_supabase_jwt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stripe", tags=["stripe"])


def _stripe():
    """Lazy import so the app can boot without the stripe SDK installed."""
    import stripe  # type: ignore
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
    return stripe


# ---------------------------------------------------------------------------
# POST /api/stripe/checkout — creates a Checkout Session for the API tier
# ---------------------------------------------------------------------------

class CheckoutRequest(BaseModel):
    # Accepts new SKU names (api_basic, api_history) and the legacy "api" alias.
    # The alias maps to api_basic — same $99/mo product.
    tier: str = "api_basic"


_TIER_TO_PRICE_ENV = {
    "api_basic": "STRIPE_API_BASIC_PRICE_ID",
    "api": "STRIPE_API_BASIC_PRICE_ID",  # legacy alias
    "api_history": "STRIPE_API_HISTORY_PRICE_ID",
}


def _resolve_price_id(tier: str) -> Optional[str]:
    """Look up the Stripe Price ID for a tier. Falls back to the deprecated
    STRIPE_API_TIER_PRICE_ID for api_basic when the newer var isn't set — this
    is the migration path off the pre-split single-price setup.
    """
    env_var = _TIER_TO_PRICE_ENV.get(tier)
    if env_var is None:
        return None
    price_id = os.environ.get(env_var)
    if price_id:
        return price_id
    # Legacy fallback: pre-split deployments only have STRIPE_API_TIER_PRICE_ID.
    if tier in ("api_basic", "api"):
        return os.environ.get("STRIPE_API_TIER_PRICE_ID")
    return None


@router.post("/checkout")
async def create_checkout(
    payload: CheckoutRequest,
    auth: Dict[str, Any] = Depends(verify_supabase_jwt),
) -> dict:
    """Returns a Stripe-hosted checkout URL the dashboard should redirect to."""
    if payload.tier not in _TIER_TO_PRICE_ENV:
        raise HTTPException(status_code=400, detail=f"unknown tier '{payload.tier}'")

    price_id = _resolve_price_id(payload.tier)
    if not price_id:
        env_var = _TIER_TO_PRICE_ENV[payload.tier]
        raise HTTPException(
            status_code=503,
            detail=f"{env_var} not configured (set the Stripe Price ID in Railway)",
        )

    success_url = os.environ.get(
        "STRIPE_SUCCESS_URL", "https://dashboard.integramarkets.app/api-tier?success=1"
    )
    cancel_url = os.environ.get(
        "STRIPE_CANCEL_URL", "https://dashboard.integramarkets.app/api-tier?canceled=1"
    )

    try:
        stripe = _stripe()
    except ImportError:
        raise HTTPException(status_code=503, detail="stripe SDK not installed on backend")

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            # `client_reference_id` is echoed back on the webhook so we can
            # map the Stripe subscription to a Supabase user without needing
            # a pre-existing Stripe customer.
            client_reference_id=auth["user_id"],
            customer_email=auth.get("email"),
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "supabase_user_id": auth["user_id"],
                "tier": payload.tier,
            },
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("stripe checkout session create failed")
        raise HTTPException(status_code=500, detail=str(exc))

    return {"url": session.url, "session_id": session.id}


# ---------------------------------------------------------------------------
# POST /api/stripe/webhook — Stripe pushes subscription state changes here
# ---------------------------------------------------------------------------

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(default=None, alias="Stripe-Signature"),
) -> dict:
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="STRIPE_WEBHOOK_SECRET not configured")

    payload = await request.body()

    try:
        stripe = _stripe()
        event = stripe.Webhook.construct_event(payload, stripe_signature, webhook_secret)
    except ImportError:
        raise HTTPException(status_code=503, detail="stripe SDK not installed on backend")
    except Exception as exc:  # noqa: BLE001
        logger.warning("stripe webhook signature verification failed: %s", exc)
        raise HTTPException(status_code=400, detail="invalid signature")

    event_type = event.get("type")
    data = event.get("data", {}).get("object", {})

    from services._supabase import get_supabase_client
    supabase = get_supabase_client()
    if supabase is None:
        raise HTTPException(status_code=503, detail="supabase unavailable")

    # Only handle events that matter for tier state. Ignore everything else.
    if event_type == "checkout.session.completed":
        metadata = data.get("metadata") or {}
        user_id = data.get("client_reference_id") or metadata.get("supabase_user_id")
        if not user_id:
            logger.warning("stripe webhook: checkout.session.completed missing user_id")
            return {"ok": True, "skipped": "no user_id"}
        # Metadata.tier came from _create_checkout_ above. Normalize the legacy
        # "api" alias so we always write api_basic / api_history to the DB.
        raw_tier = metadata.get("tier", "api_basic")
        purchased_tier = "api_basic" if raw_tier == "api" else raw_tier
        row = {
            "user_id": user_id,
            "tier": purchased_tier,
            "source": "stripe",
            "stripe_customer_id": data.get("customer"),
            "first_purchase_at": _now_iso(),
            "last_synced_at": _now_iso(),
        }
        supabase.table("user_subscriptions").upsert(row, on_conflict="user_id").execute()
        return {"ok": True, "tier": purchased_tier, "event": event_type}

    if event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        customer_id = data.get("customer")
        status = data.get("status")
        period_end = data.get("current_period_end")  # epoch seconds
        period_end_iso = None
        if period_end:
            try:
                period_end_iso = dt.datetime.fromtimestamp(
                    period_end, tz=dt.timezone.utc
                ).isoformat()
            except Exception:  # noqa: BLE001
                pass

        # Look up the user by stripe_customer_id. Preserve their current tier
        # so an api_history subscriber isn't downgraded to api_basic on routine
        # subscription-updated events.
        try:
            rows = (
                supabase.table("user_subscriptions")
                .select("user_id, tier")
                .eq("stripe_customer_id", customer_id)
                .execute()
                .data
                or []
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("stripe webhook lookup failed: %s", exc)
            return {"ok": True, "skipped": "lookup failed"}

        if not rows:
            return {"ok": True, "skipped": f"no user for customer {customer_id}"}
        user_id = rows[0]["user_id"]
        current_tier = rows[0].get("tier") or "api_basic"
        # Normalize legacy alias so we never re-write "api" to the DB.
        if current_tier == "api":
            current_tier = "api_basic"

        is_expired = event_type == "customer.subscription.deleted" or status in (
            "canceled", "unpaid", "incomplete_expired",
        )
        new_tier = "expired" if is_expired else current_tier

        supabase.table("user_subscriptions").upsert(
            {
                "user_id": user_id,
                "tier": new_tier,
                "source": "stripe",
                "stripe_customer_id": customer_id,
                "period_ends_at": period_end_iso,
                "last_synced_at": _now_iso(),
            },
            on_conflict="user_id",
        ).execute()
        return {"ok": True, "tier": new_tier, "event": event_type}

    # Anything else — log and ack so Stripe doesn't retry
    logger.info("stripe webhook: unhandled event type %s", event_type)
    return {"ok": True, "skipped": f"unhandled event {event_type}"}


def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()
