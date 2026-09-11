"""Mobile news feed endpoint.

The mobile app's primary news fetch is POST /api/news/feed (see
app/services/api.js -> fetchNewsAnalysis). That route only existed in
the legacy main_simple_nlp.py entry, which is not what production runs
(main:app is the deployed entrypoint). This router restores the feed
to the canonical app and wires per-article divergence enrichment so
NewsCard's footer can render.

Response shape is the "object" form the mobile client already handles:
    {
      "articles": [...enriched articles...],
      "sources_used": [...],
      "status": "success" | "fallback",
      "timestamp": ISO8601,
    }
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from services.supabase_jwt import optional_supabase_jwt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/news", tags=["news-feed"])


class NewsFeedRequest(BaseModel):
    # Schema is permissive (up to what basic_markets tier gets); actual
    # enforcement happens in tier_enforcement.clamp_max_articles based on
    # the authed user's tier. Anonymous → free_trial → clamped to 20.
    max_articles: Optional[int] = Field(20, ge=1, le=200)
    sources: Optional[List[str]] = None
    commodity_filter: Optional[str] = None
    # Explicit personalization from the client (works for anonymous users too,
    # e.g. device-local preferences before sign-in). Server-stored preferences
    # are used when these are absent and the request is authenticated.
    commodities: Optional[List[str]] = Field(None, max_length=20)
    keywords: Optional[List[str]] = Field(None, max_length=20)
    hours_back: Optional[int] = Field(24, ge=1, le=8760)  # up to 1yr for basic_markets
    enhanced_content: Optional[bool] = False
    max_enhanced: Optional[int] = Field(3, ge=0, le=10)
    alert_frequency: Optional[str] = "realtime"


DEFAULT_COMMODITIES = ["oil", "gold", "wheat"]
DEFAULT_REGIONS = ["US", "EU", "Asia"]

# Tiers allowed to receive divergence / prediction-market fields. This MUST
# match the client's gate in app/services/entitlementGate.ts:
#
#     divergence_alerts:      ['free_trial', 'basic_markets'],
#     polymarket_kalshi_view: ['free_trial', 'basic_markets'],
#     divergence_filter:      ['free_trial', 'basic_markets'],
#
# The strip below previously read `tier != "basic_markets"`, which removed the
# fields for free_trial — every user today — while the client had already opened
# the Divergence filter and Markets view to free_trial for evaluation. The
# effect was visible in the app: MOCK_DIVERGENCE_CARD in App.js is injected only
# while no live article carries divergenceStatus == 'DIVERGENCE', so it could
# never be displaced and the demo card was permanent — even though production
# divergence_monitor logs show fed_rates and iran_middle_east clearing the
# 20-point threshold against Polymarket.
#
# Module-level and an explicit allow-list rather than a `!=` against one tier,
# so tests/test_divergence_tier_gate.py can assert it against the client's gate.
#
# PUNCH-LIST BEFORE CHARGING (SYSTEM_MAP.md): remove 'free_trial' here AND from
# those three lines in entitlementGate.ts together. They were opened as a pair
# for the same evaluation window and must close as a pair — the cross-surface
# test fails if either side moves alone.
DIVERGENCE_TIERS = ("free_trial", "basic_markets")


def _stored_preferences(supabase, user_id: str) -> Optional[Dict[str, Any]]:
    """Fetch the user's saved alert_preferences row (mobile writes this table
    on onboarding + every preferences edit). Fail open: any error → None."""
    try:
        resp = (
            supabase.table("alert_preferences")
            .select("commodities,regions,keywords,website_urls,alert_threshold")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        rows = getattr(resp, "data", None) or []
        return rows[0] if rows else None
    except Exception as exc:  # noqa: BLE001
        logger.debug("alert_preferences lookup failed for %s: %s", user_id, exc)
        return None


def _clean_str_list(value: Any, cap: int = 20) -> List[str]:
    if not isinstance(value, list):
        return []
    out = []
    for v in value:
        if isinstance(v, str) and v.strip():
            out.append(v.strip())
        if len(out) >= cap:
            break
    return out


def _resolve_preferences(
    request: "NewsFeedRequest",
    stored: Optional[Dict[str, Any]],
    tier: str,
    rss_url_limit: float,
) -> Dict[str, Any]:
    """Merge precedence: explicit request fields > stored preferences > defaults.

    website_urls (custom RSS sources) come only from stored preferences and are
    capped by the tier's custom_rss_urls limit so free tiers can't smuggle in
    unlimited custom sources.
    """
    stored = stored or {}

    commodities = _clean_str_list(request.commodities)
    if not commodities and request.commodity_filter:
        commodities = [request.commodity_filter]
    if not commodities:
        commodities = _clean_str_list(stored.get("commodities")) or list(DEFAULT_COMMODITIES)

    keywords = _clean_str_list(request.keywords)
    if not keywords:
        keywords = _clean_str_list(stored.get("keywords"))

    regions = _clean_str_list(stored.get("regions")) or list(DEFAULT_REGIONS)

    website_urls = _clean_str_list(stored.get("website_urls"))
    if rss_url_limit != float("inf"):
        website_urls = website_urls[: int(rss_url_limit)]

    threshold = stored.get("alert_threshold") or "medium"
    if isinstance(threshold, str):
        threshold = threshold.lower()

    return {
        "commodities": commodities,
        "regions": regions,
        "keywords": keywords,
        "websiteURLs": website_urls,
        "alertThreshold": threshold,
        "_personalized": bool(
            request.commodities or request.keywords or stored
        ),
    }


async def _live_rss_fallback(
    request: "NewsFeedRequest", preferences: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Request-time RSS fetch — the old primary path, now the safety net.

    Only reached when the store is empty or unreachable (a fresh database, or
    the ingest cron wedged). It is kept because returning stale-but-real news
    beats returning nothing, but it is deliberately not the default: it takes
    ~28s, cannot reach Reuters from Railway, and emits unparsed dates.
    """
    try:
        from user_news_service import UserNewsService  # type: ignore
    except ImportError as exc:
        raise HTTPException(status_code=503, detail=f"news service unavailable: {exc}")
    service = UserNewsService()
    result = await service.get_user_based_news(preferences)
    return result.get("news") or result.get("articles") or []


@router.post("/feed")
async def get_news_feed(
    request: NewsFeedRequest,
    auth: Optional[Dict[str, Any]] = Depends(optional_supabase_jwt),
) -> Dict[str, Any]:
    # Server-side tier enforcement — anonymous / expired requests get
    # free_trial limits (1 day of history, 20 articles/session max).
    from services._supabase import get_supabase_client
    from services.tier_enforcement import (
        clamp_hours_back,
        clamp_max_articles,
        get_effective_tier,
        limits_for,
    )

    supabase = get_supabase_client()
    user_id = auth.get("user_id") if auth else None
    if user_id:
        tier = get_effective_tier(supabase, user_id)
    else:
        tier = "free_trial"

    clamped_hours = clamp_hours_back(tier, request.hours_back or 24)
    clamped_max = clamp_max_articles(tier, request.max_articles or 20)

    # Personalization: authed users get their saved alert_preferences
    # (commodities, keywords, regions, custom RSS capped by tier); explicit
    # request fields win; anonymous users fall back to defaults.
    stored = _stored_preferences(supabase, user_id) if user_id else None
    preferences = _resolve_preferences(
        request, stored, tier, limits_for(tier).custom_rss_urls
    )
    personalized = preferences.pop("_personalized", False)

    # Primary path: read the store the ingest cron writes and that
    # /api/news/latest — the endpoint the notification poller uses — also
    # reads. Sharing one corpus is what makes a notification's story
    # guaranteed to be present in the feed.
    from services.feed_store import fetch_feed

    feed_source = "store"
    window_hours = clamped_hours
    try:
        store_result = fetch_feed(
            supabase,
            hours_back=clamped_hours,
            max_articles=clamped_max,
            commodities=preferences.get("commodities"),
            keywords=preferences.get("keywords"),
        )
        articles: List[Dict[str, Any]] = store_result["articles"]
        window_hours = store_result["window_hours"]
    except Exception as exc:  # noqa: BLE001
        logger.exception("feed_store read failed, falling back to live RSS: %s", exc)
        articles = []

    if not articles:
        logger.warning(
            "feed_store returned nothing for tier=%s window=%sh — using live RSS fallback",
            tier, clamped_hours,
        )
        feed_source = "live_rss"
        try:
            articles = await _live_rss_fallback(request, preferences)
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.exception("live RSS fallback also failed")
            raise HTTPException(status_code=500, detail=str(exc))
        articles = articles[:clamped_max]

    try:
        from services.news_enricher import enrich_articles_with_divergence
        enrich_articles_with_divergence(supabase, articles)
    except Exception as exc:  # noqa: BLE001
        logger.debug("news_enricher skipped in /feed: %s", exc)

    # Strip paid prediction-market fields for tiers outside DIVERGENCE_TIERS
    # (defined at module level, alongside the reasoning and the punch-list note).
    if tier not in DIVERGENCE_TIERS:
        for art in articles:
            for k in (
                "divergenceStatus", "divergenceProvider", "divergenceDelta", "divergenceTopic",
                "divergenceMarketQuestion", "divergenceMarketUrl", "divergenceMarketId",
                "crossMarketStatus", "crossMarketDelta", "crossMarketTopic",
                "polymarketImplied", "kalshiImplied",
            ):
                art.pop(k, None)

    return {
        "articles": articles,
        "sources_used": list({a.get("source") for a in articles if a.get("source")}),
        "status": "success" if articles else "fallback",
        "tier": tier,
        "personalized": personalized,
        # Which path served this response. Lets the pipeline_health job spot a
        # wedged ingest cron: sustained "live_rss" means the store went stale.
        "feed_source": feed_source,
        "applied_limits": {
            "hours_back": clamped_hours,
            "max_articles": clamped_max,
            # The window actually used. Equal to hours_back unless too few
            # articles existed in it and the reader widened (never past the
            # tier's own allowance).
            "window_hours": window_hours,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
