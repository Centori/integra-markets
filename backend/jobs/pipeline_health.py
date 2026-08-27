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
        ("archive_backfill_progress", _check_backfill_progress),
        ("archive_scoring_progress", _check_scoring_progress),
        ("archive_depth", _check_archive_depth),
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


# =====================================================================
# Archive / backfill checks
#
# The live-pipeline checks above ask "is fresh data arriving". These ask
# "is the HISTORICAL archive actually being built" — a different question
# that had no coverage at all, and which failed silently for months:
#
#   * wayback re-walked 2020→2026 every run without reading its cursor,
#     re-upserting documents that already existed. Its rows_ingested
#     counters climbed into the thousands while raw_documents gained 446
#     documents in a week, of which 2 were historical.
#   * GDELT's cursor crawled at 5 days of range per day of wall-clock,
#     putting completion in late 2027, and nothing reported that.
#   * 11,385 collected documents had never been scored into
#     entity_mentions, so a six-year archive answered every history query
#     with two months of data.
#
# Each of those looked healthy from the outside. These checks make them
# say so out loud.
# =====================================================================

# GDELT walks 3 days of range per run on a 15-minute cron. If its cursor
# hasn't moved in this long, the walk has stopped.
BACKFILL_CURSOR_MAX_AGE_H = float(os.getenv("HEALTH_BACKFILL_CURSOR_MAX_AGE_H", "6"))

# The scoring backlog must be draining. Alert if it's been static across
# this many consecutive checks' worth of time without reaching zero.
SCORING_BACKLOG_MAX_AGE_H = float(os.getenv("HEALTH_SCORING_MAX_AGE_H", "3"))

# How many days of scored history the archive should span. This is the
# check that would have caught the original defect: storage was six years
# wide while every query returned two months.
ARCHIVE_MIN_SPAN_DAYS = int(os.getenv("HEALTH_ARCHIVE_MIN_SPAN_DAYS", "180"))

# Documents marked processed that yielded no entity_mentions. A handful is
# normal (genuinely empty documents); hundreds means the scorer is discarding
# its own output. Tuned above the ~200 one bad batch produces.
MARKED_UNSCORED_MAX = int(os.getenv("HEALTH_MARKED_UNSCORED_MAX", "500"))


def _check_backfill_progress():
    """Are the backfill cursors still advancing?

    Reports every source's cursor so a single stalled source is visible
    rather than averaged away. Fails if the most recently touched cursor
    is older than the threshold — meaning the runner itself has stopped.
    """
    rows = (
        _supabase()
        .table("backfill_cursors")
        .select("source, cursor_kind, cursor_value, last_run_at")
        .order("last_run_at", desc=True)
        .limit(50)
        .execute()
    ).data or []

    if not rows:
        return False, {"reason": "no backfill cursors — runner has never checkpointed"}

    newest = rows[0].get("last_run_at")
    age_h = _age_minutes(newest) / 60.0
    detail = {
        "newest_run": newest,
        "age_hours": round(age_h, 2),
        "max_age_hours": BACKFILL_CURSOR_MAX_AGE_H,
        "cursors": {f"{r['source']}:{r['cursor_kind']}": r.get("cursor_value") for r in rows},
    }
    return age_h <= BACKFILL_CURSOR_MAX_AGE_H, detail


def _check_scoring_progress():
    """Is the archive scorer draining its backlog?

    An empty backlog is the healthy steady state. A non-empty backlog is
    only healthy if entity_mentions is still gaining rows — otherwise the
    scorer is running and achieving nothing, which is exactly how the
    unscorable-document stall would have presented.
    """
    client = _supabase()
    try:
        backlog = client.rpc("unscored_document_count", {}).execute().data
    except Exception as exc:  # noqa: BLE001
        return False, {"error": f"unscored_document_count rpc failed: {exc}",
                       "hint": "migration 20260827_raw_documents_scored_at not applied?"}

    backlog = int(backlog or 0)

    # Documents the scorer marked processed that produced no entity rows.
    #
    # This is the check that catches "the job runs and achieves nothing".
    # It exists because exactly that shipped: the scorer compared the
    # scorers' UPPERCASE label against a lowercase tuple, discarded every
    # score it computed, and marked 200 documents processed while reporting
    # ok. Freshness alone could not see it — news_fetcher keeps
    # entity_mentions fresh regardless of what the scorer does.
    try:
        empty = client.rpc("marked_but_unscored_count", {}).execute().data
        empty = int(empty or 0)
    except Exception:  # noqa: BLE001 — older DB without the helper
        empty = None

    detail: Dict[str, Any] = {"backlog": backlog, "marked_but_unscored": empty}

    if empty is not None and empty > MARKED_UNSCORED_MAX:
        detail["reason"] = (
            f"{empty} documents marked processed produced no entity_mentions "
            f"(> {MARKED_UNSCORED_MAX}) — the scorer is running but scoring nothing"
        )
        return False, detail

    if backlog == 0:
        detail["state"] = "drained"
        return True, detail

    # Backlog is non-empty — require recent scoring activity.
    newest_scored = _latest_timestamp("entity_mentions", "extracted_at")
    if not newest_scored:
        detail["reason"] = "backlog non-empty and nothing ever scored"
        return False, detail

    age_h = _age_minutes(newest_scored) / 60.0
    detail.update({
        "last_scored": newest_scored,
        "age_hours": round(age_h, 2),
        "max_age_hours": SCORING_BACKLOG_MAX_AGE_H,
    })
    return age_h <= SCORING_BACKLOG_MAX_AGE_H, detail


def _check_archive_depth():
    """Does the scored archive actually span a useful history?

    Queries the same axis the history endpoints use (published_at). If a
    future change re-points those queries at extracted_at, or the trigger
    is dropped, this collapses to a couple of days and says so — instead
    of the archive quietly becoming unsellable again.
    """
    client = _supabase()
    oldest = (
        client.table("entity_mentions")
        .select("published_at")
        .order("published_at", desc=False)
        .limit(1)
        .execute()
    ).data or []
    newest = (
        client.table("entity_mentions")
        .select("published_at")
        .order("published_at", desc=True)
        .limit(1)
        .execute()
    ).data or []

    if not oldest or not newest:
        return False, {"reason": "entity_mentions empty"}

    o = datetime.fromisoformat(str(oldest[0]["published_at"]).replace("Z", "+00:00"))
    n = datetime.fromisoformat(str(newest[0]["published_at"]).replace("Z", "+00:00"))
    span_days = (n - o).days

    return span_days >= ARCHIVE_MIN_SPAN_DAYS, {
        "oldest": oldest[0]["published_at"],
        "newest": newest[0]["published_at"],
        "span_days": span_days,
        "min_span_days": ARCHIVE_MIN_SPAN_DAYS,
    }
