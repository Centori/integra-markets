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
    hours_back: Optional[int] = Field(24, ge=1, le=8760)  # up to 1yr for basic_markets
    enhanced_content: Optional[bool] = False
    max_enhanced: Optional[int] = Field(3, ge=0, le=10)
    alert_frequency: Optional[str] = "realtime"


@router.post("/feed")
async def get_news_feed(
    request: NewsFeedRequest,
    auth: Optional[Dict[str, Any]] = Depends(optional_supabase_jwt),
) -> Dict[str, Any]:
    try:
        from user_news_service import UserNewsService  # type: ignore
    except ImportError as exc:
        raise HTTPException(status_code=503, detail=f"news service unavailable: {exc}")

    # Server-side tier enforcement — anonymous / expired requests get
    # free_trial limits (1 day of history, 20 articles/session max).
    from services._supabase import get_supabase_client
    from services.tier_enforcement import (
        clamp_hours_back,
        clamp_max_articles,
        get_effective_tier,
    )

    supabase = get_supabase_client()
    if auth and auth.get("user_id"):
        tier = get_effective_tier(supabase, auth["user_id"])
    else:
        tier = "free_trial"

    clamped_hours = clamp_hours_back(tier, request.hours_back or 24)
    clamped_max = clamp_max_articles(tier, request.max_articles or 20)

    service = UserNewsService()
    preferences = {
        "commodities": [request.commodity_filter] if request.commodity_filter else ["oil", "gold", "wheat"],
        "regions": ["US", "EU", "Asia"],
        "keywords": [],
        "websiteURLs": [],
        "alertThreshold": "medium",
    }
    try:
        result = await service.get_user_based_news(preferences)
    except Exception as exc:  # noqa: BLE001
        logger.exception("user_news_service failed")
        raise HTTPException(status_code=500, detail=str(exc))

    articles: List[Dict[str, Any]] = result.get("news") or result.get("articles") or []
    # Apply tier-clamped article ceiling (not just whatever the client asked for).
    articles = articles[:clamped_max]

    try:
        from services.news_enricher import enrich_articles_with_divergence
        enrich_articles_with_divergence(supabase, articles)
    except Exception as exc:  # noqa: BLE001
        logger.debug("news_enricher skipped in /feed: %s", exc)

    # For non-basic_markets tiers, strip divergence fields from the response
    # so paid features never leak into free responses.
    if tier != "basic_markets":
        for art in articles:
            for k in ("divergenceStatus", "divergenceProvider", "divergenceDelta", "divergenceTopic"):
                art.pop(k, None)

    return {
        "articles": articles,
        "sources_used": list({a.get("source") for a in articles if a.get("source")}),
        "status": "success" if articles else "fallback",
        "tier": tier,
        "applied_limits": {
            "hours_back": clamped_hours,
            "max_articles": clamped_max,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
