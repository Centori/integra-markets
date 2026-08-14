"""POST /api/summarize/article — on-demand full summary for one article.

Why this exists as its own router
---------------------------------
The mobile analysis overlay's "refresh summary" button
(app/components/AIAnalysisOverlay.tsx -> dashboardApi.getArticleSummary)
calls /api/summarize/article. That route only ever existed in
main_simple_nlp.py, which `main:app` (the deployed entrypoint) does not mount,
so the button has been returning 404 in production.

A stale local checkout carried a "legacy compatibility bridge" that copied
*every* main_simple_nlp route onto main:app. That was rejected here: an audit
of the shipping client showed only TWO of the twelve legacy endpoints
referenced in app/services/api.js are reachable from the app entry point —
/api/news/feed (already served) and this one. The other ten are called solely
from dead modules (RightSidebar, TodayDashboard, newsAnalysisService,
EnhancedNewsExample, apiDebug), so bridging them would ship ~20 unused routes
and main_simple_nlp's import side-effects to fix a single button.

Response contract (must not change without updating the client)
---------------------------------------------------------------
app/services/api.js `getArticleSummary` maps our `summary` -> `full_summary`
and treats `{"unavailable": true}` as a distinct "couldn't summarize" state
rather than an error, so the overlay can degrade gracefully.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/summarize", tags=["summarize"])

try:
    from article_summarizer import ArticleSummarizer
    _summarizer: Optional[ArticleSummarizer] = ArticleSummarizer()
except Exception as exc:  # noqa: BLE001 — never block boot on an optional dep
    _summarizer = None
    logger.warning("ArticleSummarizer unavailable, /api/summarize will degrade: %s", exc)

# Reuse the feed's boilerplate guard so a scraped publisher disclaimer can
# never reach the overlay either — this is the same text that appeared on
# every card on build 88.
try:
    from user_news_service import clean_summary_text, is_usable_summary
except Exception:  # pragma: no cover - import-order safety
    def clean_summary_text(raw: str) -> str:  # type: ignore[misc]
        return (raw or "").strip()

    def is_usable_summary(text: str, title: str = "") -> bool:  # type: ignore[misc]
        return bool(text and len(text) >= 60)


class SummarizeRequest(BaseModel):
    url: str = Field(..., description="Absolute article URL")
    title: Optional[str] = Field(None, description="Headline, used to reject title-echo summaries")
    sentences: int = Field(5, ge=1, le=12)


@router.post("/article")
async def summarize_article(request: SummarizeRequest) -> Dict[str, Any]:
    """Return a longer summary for one article, or a graceful `unavailable`."""
    if _summarizer is None:
        return {"unavailable": True, "message": "summarizer not available on this deployment"}

    url = (request.url or "").strip()
    if not url.startswith(("http://", "https://")):
        return {"unavailable": True, "message": "a valid absolute article URL is required"}

    try:
        result = _summarizer.summarize_url(url, sentences=request.sentences, method="auto")
    except Exception as exc:  # noqa: BLE001
        logger.warning("summarize_url failed for %s: %s", url, exc)
        return {"unavailable": True, "message": "could not fetch this article"}

    if not isinstance(result, dict) or "error" in result:
        detail = result.get("error") if isinstance(result, dict) else "unknown error"
        logger.info("summarize_url returned an error for %s: %s", url, detail)
        return {"unavailable": True, "message": "could not summarize this article"}

    sentences = result.get("summary") or []
    text = clean_summary_text(" ".join(sentences) if isinstance(sentences, list) else str(sentences))

    if not is_usable_summary(text, request.title or ""):
        # Publisher boilerplate, a paywall notice, or nothing but the headline.
        logger.info("Discarded unusable summary for %s", url)
        return {"unavailable": True, "message": "no usable summary for this article"}

    return {
        "summary": text,
        "keywords": (result.get("keywords") or [])[:5],
        "method": result.get("method"),
        "url": url,
    }
