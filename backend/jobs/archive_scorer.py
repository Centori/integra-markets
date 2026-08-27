"""Score archived documents into entity_mentions.

Why this exists
---------------
The archive had three layers and only the top one was ever sold:

    raw_documents      14,264 rows, back to 2020-01-01
    historical_events   2,670 rows (GDELT) — read by nothing
    entity_mentions     7,213 rows — the ONLY table the sentiment-history
                        endpoints query

11,385 of those documents had never been scored, 9,176 of them published
before 2025. So six years of collected news presented as two months of
history, and no amount of further backfilling would have changed that: the
backfill sources write raw_documents, and nothing turned them into scored
rows. This job is the missing step.

It is deliberately a scheduled job rather than a one-shot script. wayback
keeps adding historical documents, so the backlog is continuous, not a
one-time migration — and a job gets the scheduler's logging and the
pipeline_health check for free.

Contract: matches the other jobs — run() -> dict, never raises. A failure
here must not take the scheduler down.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Documents per tick. The scorer is CPU-bound (VADER + keyword passes) and
# shares a container with the API, so this is kept modest: at 200/tick on a
# 10-minute interval the 11,385-document backlog clears in about 10 hours.
BATCH_SIZE = int(os.getenv("ARCHIVE_SCORER_BATCH", "200"))

# Set ARCHIVE_SCORER_ENABLED=0 to park the job without a deploy.
ENABLED = os.getenv("ARCHIVE_SCORER_ENABLED", "1") not in ("0", "false", "False")


def _load_scoring_fns():
    """Import the same scorers the live pipeline uses.

    Reusing them matters: if the archive were scored by a different code
    path, historical sentiment would not be comparable with live sentiment,
    and every chart spanning the join would show a phantom step change.
    """
    from main_simple_nlp import (  # type: ignore
        analyze_market_sentiment,
        basic_sentiment_analysis,
        normalize_commodity,
        vader_analyzer,
    )

    return analyze_market_sentiment, basic_sentiment_analysis, normalize_commodity, vader_analyzer


def _score_text(fns, text: str) -> Tuple[Optional[str], Optional[float], Optional[str]]:
    """Return (sentiment, confidence, commodity) for one document."""
    analyze, basic, normalize_commodity, vader = fns
    commodity = normalize_commodity(None, text)
    if vader:
        result = analyze(text, commodity, scores=vader.polarity_scores(text))
    else:
        result = basic(text, commodity)
    sentiment = result.get("sentiment")
    confidence = result.get("confidence")
    if sentiment not in ("bullish", "bearish", "neutral"):
        sentiment = None
    return sentiment, (float(confidence) if confidence is not None else None), commodity


def run() -> Dict[str, Any]:
    """One tick. Returns a machine-readable summary; never raises."""
    if not ENABLED:
        return {"ok": True, "skipped": "disabled"}

    try:
        from services._supabase import get_supabase_client
        from services.archive_writer import ACTIVE_MODEL_NAME, ACTIVE_MODEL_VERSION

        supabase = get_supabase_client()
    except Exception as exc:  # noqa: BLE001
        logger.warning("archive_scorer: supabase unavailable: %s", exc)
        return {"ok": False, "error": f"supabase: {exc}"}

    if supabase is None:
        return {"ok": False, "error": "no_supabase_client"}

    try:
        fns = _load_scoring_fns()
    except Exception as exc:  # noqa: BLE001
        # Same failure mode that left the summarizer silently absent for
        # weeks — log loudly rather than quietly scoring nothing.
        logger.error("archive_scorer: scoring functions not importable: %s", exc)
        return {"ok": False, "error": f"scorers: {exc}"}

    # 1. Pull the oldest unscored documents. The RPC does an anti-join, so a
    #    document inserted today with a 2020 publication date is picked up on
    #    the next tick rather than being stranded behind a cursor.
    try:
        docs = (
            supabase.rpc("unscored_documents", {"p_limit": BATCH_SIZE}).execute().data
        ) or []
    except Exception as exc:  # noqa: BLE001
        logger.error("archive_scorer: unscored_documents rpc failed: %s", exc)
        return {"ok": False, "error": f"rpc: {exc}"}

    if not docs:
        logger.info("archive_scorer: backlog empty")
        return {"ok": True, "scored": 0, "entities": 0, "backlog_empty": True}

    try:
        from services.topic_taxonomy import detect_topics
    except Exception:  # noqa: BLE001
        detect_topics = None  # type: ignore[assignment]
        logger.warning("archive_scorer: topic detection unavailable; commodity rows only")

    score_rows: List[Dict[str, Any]] = []
    entity_rows: List[Dict[str, Any]] = []
    # EVERY document we look at, scorable or not. These get scored_at stamped
    # so an unscorable document cannot sit at the head of the oldest-first
    # queue and pin the job forever.
    touched_ids: List[str] = []
    unscorable = 0

    for doc in docs:
        doc_id = doc.get("id")
        if not doc_id:
            continue
        touched_ids.append(doc_id)
        title = str(doc.get("title") or "")
        content = str(doc.get("content") or "")
        text = f"{title}. {content}".strip()
        if not text or text == ".":
            unscorable += 1
            continue

        sentiment, confidence, commodity = _score_text(fns, text)
        if sentiment is None or confidence is None:
            unscorable += 1
            continue

        published_at = doc.get("published_at")

        score_rows.append({
            "document_id": doc_id,
            "model_name": ACTIVE_MODEL_NAME,
            "model_version": ACTIVE_MODEL_VERSION,
            "sentiment": sentiment,
            "score": confidence,
            "confidence": confidence,
            "distribution": None,
        })

        # published_at is set EXPLICITLY here as well as by the DB trigger.
        # Belt and braces on purpose: this is the column that makes the whole
        # archive queryable, and the cost of it being wrong is another six
        # years of data landing on today's date.
        def _entity(entity: str, entity_type: str) -> Dict[str, Any]:
            return {
                "document_id": doc_id,
                "entity": entity,
                "entity_type": entity_type,
                "sentiment": sentiment,
                "score": confidence,
                "confidence": confidence,
                "model_version": ACTIVE_MODEL_VERSION,
                "published_at": published_at,
            }

        payload = doc.get("raw_payload") or {}
        commodity_tag = (payload.get("commodity") or commodity or "").strip().lower()
        if commodity_tag:
            entity_rows.append(_entity(commodity_tag, "commodity"))

        if detect_topics is not None:
            try:
                for topic_key in detect_topics(text, title=title):
                    entity_rows.append(_entity(topic_key, "topic"))
            except Exception as exc:  # noqa: BLE001
                logger.debug("archive_scorer: topic detection failed for %s: %s", doc_id, exc)

    # 2. Write. sentiment_scores first so a crash between the two leaves the
    #    document still unscored (entity_mentions is what the anti-join keys
    #    on), and the next tick retries it cleanly.
    written_scores = 0
    if score_rows:
        try:
            supabase.table("sentiment_scores").upsert(
                score_rows, on_conflict="document_id,model_name,model_version"
            ).execute()
            written_scores = len(score_rows)
        except Exception as exc:  # noqa: BLE001
            logger.error("archive_scorer: sentiment_scores upsert failed: %s", exc)
            return {"ok": False, "error": f"sentiment_scores: {exc}", "attempted": len(score_rows)}

    written_entities = 0
    if entity_rows:
        try:
            supabase.table("entity_mentions").upsert(
                entity_rows,
                on_conflict="document_id,entity,entity_type,model_version",
                ignore_duplicates=True,
            ).execute()
            written_entities = len(entity_rows)
        except Exception as exc:  # noqa: BLE001
            # Loud, not debug. entity_mentions silently rejecting every write
            # for weeks is the exact incident this codebase already survived.
            logger.error("archive_scorer: entity_mentions upsert failed: %s", exc)
            return {"ok": False, "error": f"entity_mentions: {exc}", "attempted": len(entity_rows)}

    # 3. Mark the whole batch attempted. This runs LAST so that a failure in
    #    either write above leaves the documents in the backlog to be retried,
    #    and it runs for unscorable documents too so the queue always advances.
    marked = 0
    if touched_ids:
        try:
            marked = supabase.rpc(
                "mark_documents_scored", {"p_ids": touched_ids}
            ).execute().data
        except Exception as exc:  # noqa: BLE001
            # Not fatal for this batch's data, but it IS fatal for progress:
            # without the stamp the same documents come back next tick.
            logger.error("archive_scorer: mark_documents_scored failed: %s", exc)
            return {
                "ok": False,
                "error": f"mark_scored: {exc}",
                "scored": written_scores,
                "entities": written_entities,
            }

    oldest = docs[0].get("published_at")
    newest = docs[-1].get("published_at")
    logger.info(
        "archive_scorer: scored %d docs (%d entity rows, %d unscorable, %s marked) covering %s → %s",
        written_scores, written_entities, unscorable, marked, oldest, newest,
    )

    return {
        "ok": True,
        "scored": written_scores,
        "entities": written_entities,
        "unscorable": unscorable,
        "marked": marked,
        "batch": len(docs),
        "oldest_published_at": oldest,
        "newest_published_at": newest,
    }
