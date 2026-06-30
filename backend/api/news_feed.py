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

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/news", tags=["news-feed"])


class NewsFeedRequest(BaseModel):
    max_articles: Optional[int] = Field(20, ge=1, le=50)
    sources: Optional[List[str]] = None
    commodity_filter: Optional[str] = None
    hours_back: Optional[int] = Field(24, ge=1, le=168)
    enhanced_content: Optional[bool] = False
    max_enhanced: Optional[int] = Field(3, ge=0, le=10)
    alert_frequency: Optional[str] = "realtime"


@router.post("/feed")
async def get_news_feed(request: NewsFeedRequest) -> Dict[str, Any]:
    try:
        from user_news_service import UserNewsService  # type: ignore
    except ImportError as exc:
        raise HTTPException(status_code=503, detail=f"news service unavailable: {exc}")

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
    if request.max_articles:
        articles = articles[: request.max_articles]

    try:
        from services._supabase import get_supabase_client
        from services.news_enricher import enrich_articles_with_divergence

        enrich_articles_with_divergence(get_supabase_client(), articles)
    except Exception as exc:  # noqa: BLE001
        logger.debug("news_enricher skipped in /feed: %s", exc)

    return {
        "articles": articles,
        "sources_used": list({a.get("source") for a in articles if a.get("source")}),
        "status": "success" if articles else "fallback",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
