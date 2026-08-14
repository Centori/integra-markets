"""Scheduled data-freshness check — makes silent pipeline failures loud.

Why this exists
---------------
On 2026-08-14 four independent breakages were found only because a user
noticed every news card showed the same legal disclaimer. Each had been
failing for days or weeks while every liveness signal stayed green:

  * entity_mentions upserts returned HTTP 400 on every tick (unique index
    wrapped model_version in COALESCE, which PostgREST can't match to an
    ON CONFLICT clause) -> the divergence engine had no fresh input, but the
    scheduler still logged "tick ok".
  * feedparser.parse(url) was served empty by oilprice.com/eia.gov from
    datacenter IPs and sets .bozo rather than raising -> the feed silently
    collapsed to a single source.
  * article_summarizer.py was absent from main, so SUMMARIZER_AVAILABLE was
    False and the scraping path never ran.
  * A retired EIA URL 404'd three times per tick.

`/health` returned 200 throughout. Liveness checks answer "is the process
up", not "is data still flowing" — this job asserts the latter.

Contract: matches the other jobs (run() -> dict, logged by the scheduler).
Findings are logged at ERROR so they surface in Railway logs and alerting;
the returned dict is the machine-readable form.

This job never raises: a broken health check must not take the scheduler
down with it.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

# A tick is 10 min; allow generous slack so a single slow fetch isn't an alarm.
ENTITY_MENTIONS_MAX_AGE_MIN = int(os.getenv("HEALTH_ENTITY_MAX_AGE_MIN", "90"))
RAW_DOCUMENTS_MAX_AGE_MIN = int(os.getenv("HEALTH_DOCS_MAX_AGE_MIN", "90"))

# The feed collapsed to one source and nobody noticed for weeks.
MIN_FEED_SOURCES = int(os.getenv("HEALTH_MIN_FEED_SOURCES", "2"))

# "summary == title" for every article is the signature of a summarizer that
# is silently unavailable.
MIN_REAL_SUMMARY_RATIO = float(os.getenv("HEALTH_MIN_REAL_SUMMARY_RATIO", "0.15"))


def run() -> Dict[str, Any]:
    """One tick. Returns {"ok": bool, "checks": {...}, "failures": [...]}."""
    checks: Dict[str, Any] = {}
    failures: List[str] = []

    for name, fn in (
        ("entity_mentions_fresh", _check_entity_mentions),
        ("raw_documents_fresh", _check_raw_documents),
        ("feed_quality", _check_feed_quality),
    ):
        try:
            ok, detail = fn()
        except Exception as exc:  # noqa: BLE001 — never take the scheduler down
            ok, detail = False, {"error": f"{type(exc).__name__}: {exc}"}
        checks[name] = detail
        if not ok:
            failures.append(name)

    if failures:
        logger.error("pipeline_health: FAILING %s | %s", failures, checks)
    else:
        logger.info("pipeline_health: ok | %s", checks)

    return {"ok": not failures, "failures": failures, "checks": checks}


def _supabase():
    from services._supabase import get_supabase_client

    client = get_supabase_client()
    if client is None:
        # Real condition worth alerting on in prod (missing SUPABASE_URL/KEY);
        # locally it just means the check can't run. Either way, say so
        # plainly rather than surfacing an AttributeError from the caller.
        raise RuntimeError("supabase client unavailable (SUPABASE_URL/KEY not configured)")
    return client


def _age_minutes(iso_value: str) -> float:
    parsed = datetime.fromisoformat(str(iso_value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - parsed).total_seconds() / 60.0


def _latest_timestamp(table: str, column: str):
    resp = (
        _supabase()
        .table(table)
        .select(column)
        .order(column, desc=True)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    return rows[0][column] if rows else None


def _check_entity_mentions():
    """The divergence engine's input. Was dead for weeks behind a 400."""
    newest = _latest_timestamp("entity_mentions", "extracted_at")
    if not newest:
        return False, {"newest": None, "reason": "table empty"}
    age = _age_minutes(newest)
    return age <= ENTITY_MENTIONS_MAX_AGE_MIN, {
        "newest": newest,
        "age_min": round(age, 1),
        "max_age_min": ENTITY_MENTIONS_MAX_AGE_MIN,
    }


def _check_raw_documents():
    """Ingest itself. If this stalls, everything downstream is stale."""
    newest = _latest_timestamp("raw_documents", "published_at")
    if not newest:
        return False, {"newest": None, "reason": "table empty"}
    age = _age_minutes(newest)
    return age <= RAW_DOCUMENTS_MAX_AGE_MIN, {
        "newest": newest,
        "age_min": round(age, 1),
        "max_age_min": RAW_DOCUMENTS_MAX_AGE_MIN,
    }


def _check_feed_quality():
    """Source diversity + summary quality, straight off the live pipeline.

    Catches the two failures that produced identical-looking cards: the feed
    collapsing to one publisher, and every summary degrading to its headline.
    """
    import asyncio

    from user_news_service import UserNewsService, is_usable_summary

    async def _fetch():
        service = UserNewsService()
        return await service.get_user_based_news(
            {
                "commodities": ["oil", "gold", "wheat"],
                "regions": [],
                "keywords": [],
                "websiteURLs": [],
            }
        )

    result = asyncio.run(_fetch())
    articles = result.get("news") or result.get("articles") or []
    if not articles:
        return False, {"articles": 0, "reason": "feed returned nothing"}

    sources = {a.get("source") for a in articles if a.get("source")}
    real = sum(
        1 for a in articles if is_usable_summary(a.get("summary", ""), a.get("title", ""))
    )
    ratio = real / len(articles)

    detail = {
        "articles": len(articles),
        "sources": sorted(s for s in sources if s),
        "source_count": len(sources),
        "real_summaries": real,
        "real_summary_ratio": round(ratio, 2),
    }
    ok = len(sources) >= MIN_FEED_SOURCES and ratio >= MIN_REAL_SUMMARY_RATIO
    if not ok:
        detail["reason"] = (
            f"need >={MIN_FEED_SOURCES} sources and >={MIN_REAL_SUMMARY_RATIO} "
            f"real-summary ratio"
        )
    return ok, detail
