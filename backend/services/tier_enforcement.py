"""Server-side subscription tier enforcement.

Mirrors the LIMITS matrix from app/services/entitlementGate.ts. The mobile
client checks limits for UX (grey-out buttons, show "X of Y used"), but the
authoritative check happens here — a client that spoofs its tier still can't
bypass server-side limit checks.

Numbers must stay in sync with entitlementGate.ts. When adjusting limits:
    1. Edit both files (JS + Python)
    2. `eas update` for the JS side
    3. `railway up --service backend` for the Python side
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Sentinel — matches JS's Infinity handling
UNLIMITED = math.inf


@dataclass(frozen=True)
class TierLimits:
    bookmarks: float
    alerts: float
    commodities: float
    custom_rss_urls: float
    ai_overlay_per_day: float
    history_days: float
    articles_per_session: float
    alert_types: tuple[str, ...]
    push_mode: str  # "batched" | "realtime"
    push_per_day: float
    # Bulk/CSV export ("download to Excel") — the conversion lever on the API
    # trial. False on the 30-day trial; True on the paid API tiers. Defaults
    # False so any tier that doesn't opt in cannot export.
    exports_enabled: bool = False


LIMITS: dict[str, TierLimits] = {
    # Post-trial resting state — what the App Store listing calls FREE
    # ("curated commodity news feed, AI sentiment on every story"). Deliberately
    # usable. A lapsed trial resolves here, NOT to `expired`, which is all zeros
    # and would brick the app on day 31.
    "free": TierLimits(
        bookmarks=5,
        alerts=3,
        commodities=2,
        custom_rss_urls=0,
        ai_overlay_per_day=5,
        history_days=7,
        articles_per_session=20,
        alert_types=("news",),
        push_mode="batched",
        push_per_day=5,
    ),
    # The 30-day trial grants FULL Pro (== basic_markets). A trial of a lesser
    # product does not convert, and push alerts in particular were excluded
    # from the trial — disabling the strongest retention mechanism in exactly
    # the window meant to prove value.
    "free_trial": TierLimits(
        bookmarks=UNLIMITED,
        alerts=UNLIMITED,
        commodities=UNLIMITED,
        custom_rss_urls=10,
        ai_overlay_per_day=UNLIMITED,
        history_days=UNLIMITED,
        articles_per_session=100,
        alert_types=("news", "sentiment", "divergence"),
        push_mode="realtime",
        push_per_day=UNLIMITED,
    ),
    "basic": TierLimits(
        bookmarks=50,
        alerts=10,
        commodities=5,
        custom_rss_urls=3,
        ai_overlay_per_day=UNLIMITED,
        history_days=30,
        articles_per_session=50,
        alert_types=("news", "sentiment"),
        push_mode="batched",
        push_per_day=UNLIMITED,
    ),
    "basic_markets": TierLimits(
        bookmarks=UNLIMITED,
        alerts=UNLIMITED,
        commodities=UNLIMITED,
        custom_rss_urls=10,
        ai_overlay_per_day=UNLIMITED,
        history_days=UNLIMITED,
        articles_per_session=100,
        alert_types=("news", "sentiment", "divergence"),
        push_mode="realtime",
        push_per_day=UNLIMITED,
    ),
    "expired": TierLimits(
        bookmarks=0,
        alerts=0,
        commodities=0,
        custom_rss_urls=0,
        ai_overlay_per_day=0,
        history_days=0,
        articles_per_session=5,
        alert_types=(),
        push_mode="batched",
        push_per_day=0,
    ),
    # API tiers (web-only, purchased via Stripe). The ladder:
    #   api_trial   → 30-day free evaluation: API reads, 30-day window, NO export.
    #   api_basic   → $99/mo: API + export, 30-day rolling window (no deep archive).
    #   api_history → $179/mo: everything + FULL archive (backfill/*).
    # Mobile-feature limits stay UNLIMITED so an API subscriber who also installs
    # the app isn't clamped; whether a given API tier actually UNLOCKS mobile Pro
    # is decided client-side (subscriptionService.fetchBackendTier maps only
    # api_history → basic_markets today).
    "api_trial": TierLimits(
        bookmarks=UNLIMITED,
        alerts=UNLIMITED,
        commodities=UNLIMITED,
        custom_rss_urls=UNLIMITED,
        ai_overlay_per_day=UNLIMITED,
        history_days=30,
        articles_per_session=UNLIMITED,
        alert_types=("news", "sentiment", "divergence"),
        push_mode="realtime",
        push_per_day=UNLIMITED,
        exports_enabled=False,  # the trial's conversion lever
    ),
    "api_basic": TierLimits(
        bookmarks=UNLIMITED,
        alerts=UNLIMITED,
        commodities=UNLIMITED,
        custom_rss_urls=UNLIMITED,
        ai_overlay_per_day=UNLIMITED,
        history_days=30,
        articles_per_session=UNLIMITED,
        alert_types=("news", "sentiment", "divergence"),
        push_mode="realtime",
        push_per_day=UNLIMITED,
        exports_enabled=True,
    ),
    "api_history": TierLimits(
        bookmarks=UNLIMITED,
        alerts=UNLIMITED,
        commodities=UNLIMITED,
        custom_rss_urls=UNLIMITED,
        ai_overlay_per_day=UNLIMITED,
        history_days=UNLIMITED,
        articles_per_session=UNLIMITED,
        alert_types=("news", "sentiment", "divergence"),
        push_mode="realtime",
        push_per_day=UNLIMITED,
        exports_enabled=True,
    ),
}

# Backwards-compat: existing users on the pre-split "api" tier are treated as
# api_basic. Rows in `user_subscriptions.tier` won't be rewritten — the effective
# tier resolver just aliases at read time.
_TIER_ALIASES = {"api": "api_basic"}


def can_query_historical(tier: str) -> bool:
    """True when the tier is allowed to hit /v1/historical/* endpoints."""
    return tier == "api_history"


def get_effective_tier(supabase, user_id: str) -> str:
    """Reads `public.effective_tier(user_id)` — the DB function that accounts
    for trial + subscription expiration. Falls back to 'free_trial' if
    supabase is unavailable or the row doesn't exist.
    """
    # Every fallback below is `free`, never `free_trial`: free_trial now grants
    # full Pro, so failing open to it would hand Pro to every caller during a
    # Supabase outage.
    if supabase is None:
        return "free"
    try:
        result = supabase.rpc("effective_tier", {"p_user_id": user_id}).execute()
        tier = getattr(result, "data", None)
        if isinstance(tier, str):
            return tier
        # Some client versions return a list of scalars
        if isinstance(tier, list) and tier:
            return tier[0] if isinstance(tier[0], str) else "free"
    except Exception as exc:  # noqa: BLE001
        logger.warning("tier_enforcement: effective_tier lookup failed: %s", exc)
    return "free"


def limits_for(tier: str) -> TierLimits:
    canonical = _TIER_ALIASES.get(tier, tier)
    # Unknown tier → `free`, not `free_trial`. free_trial now grants full Pro,
    # so falling back to it would hand Pro to anyone whose tier string we
    # failed to recognise. The fallback must be the least-privileged usable tier.
    return LIMITS.get(canonical, LIMITS["free"])


def exports_allowed(tier: str) -> bool:
    """True if the tier may bulk/CSV export ("download to Excel"). Gate the
    export endpoints on this so the 30-day api_trial can read but not extract.
    """
    return limits_for(tier).exports_enabled


def clamp_hours_back(tier: str, requested_hours: int) -> int:
    """Enforces the tier's `history_days` on any endpoint that accepts a
    `hours_back` param. Called by /api/news/feed etc."""
    max_days = limits_for(tier).history_days
    if max_days == UNLIMITED:
        return requested_hours
    max_hours = int(max_days * 24)
    return min(requested_hours, max_hours)


def clamp_max_articles(tier: str, requested: int) -> int:
    max_articles = limits_for(tier).articles_per_session
    if max_articles == UNLIMITED:
        return requested
    return min(requested, int(max_articles))


def can_add_bookmark(tier: str, current_count: int) -> bool:
    return current_count < limits_for(tier).bookmarks


def can_add_alert(tier: str, current_count: int, alert_type: str) -> bool:
    lim = limits_for(tier)
    if alert_type not in lim.alert_types:
        return False
    return current_count < lim.alerts


def can_use_ai_overlay(tier: str, uses_today: int) -> bool:
    return uses_today < limits_for(tier).ai_overlay_per_day


def is_realtime_push_allowed(tier: str) -> bool:
    return limits_for(tier).push_mode == "realtime"
