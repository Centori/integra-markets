"""Write-through layer for the historical sentiment archive.

Every news article observed by the live pipeline lands in
`raw_documents`; every sentiment score lands in `sentiment_scores`
tagged with the model version that produced it. Re-runs are
idempotent (unique constraints on `(source, url_hash)` and
`(document_id, model_name, model_version)`).

The fine-tuned commodity model can re-score the entire archive later
by passing a new `model_version` — old scores stay in place for
comparison.
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional

from services.feed_dates import parse_published_iso

logger = logging.getLogger(__name__)

# Bump this whenever the scoring pipeline changes (constants, lexicon,
# threshold, model swap). PRs touching `analyze_market_sentiment`,
# `SENTIMENT_RULE_COEF`, or the lexicon loaders must update this.
ACTIVE_MODEL_NAME = "vader_v2_commodity"
# 2026-09-02: the previous version, "2026-06-23", is a LIE for 96% of the rows
# carrying it. The scoring jobs imported a `vader_analyzer` global that was
# None at import time, so 60,225 of 62,771 rows were produced by
# basic_sentiment_analysis (a 20-word keyword list) while stamped
# vader_v2_commodity. This version marks rows genuinely scored by the
# lexicon-enriched engine, with commodity-name polarity neutralised
# (see services/sentiment_engine.py and services/lexicons/domain_neutral.py).
# Keeping the old string distinguishable is the point: do not reuse it.
ACTIVE_MODEL_VERSION = "2026-09-02"


def _url_hash(url: str) -> str:
    return hashlib.sha256(url.strip().lower().encode("utf-8")).hexdigest()


def _to_iso(value: Any) -> Optional[str]:
    """Normalise any publication-date form to an ISO 8601 UTC string, or None.

    Previously strings were passed through untouched, so a raw RSS date like
    'Fri, 31 Jul 2026  09:00:00 EST' was handed to Postgres verbatim for a
    timestamptz column. Routing everything through the one parser means the
    column only ever receives ISO 8601, and unreadable dates surface as None
    instead of as a fabricated timestamp.
    """
    return parse_published_iso(value)


def normalize_sentiment(label: Any) -> Optional[str]:
    """Coerce a scorer's label to the lowercase form entity_mentions accepts.

    `analyze_market_sentiment` returns UPPERCASE ("BULLISH"), while both
    `sentiment_scores.sentiment` and `entity_mentions.sentiment` carry a CHECK
    constraint for the lowercase form. Public because archive_scorer must
    apply exactly the same rule — it originally reimplemented the membership
    test without the .lower() and silently discarded every score it computed.
    """
    if not label:
        return None
    s = str(label).lower()
    if s in ("bullish", "bearish", "neutral"):
        return s
    return None


# Back-compat alias for in-module callers.
_normalize_sentiment = normalize_sentiment


def persist_articles(
    supabase,
    articles: Iterable[Dict[str, Any]],
    *,
    model_name: str = ACTIVE_MODEL_NAME,
    model_version: str = ACTIVE_MODEL_VERSION,
) -> Dict[str, int]:
    """Persist articles and their sentiment scores in two batched upserts.

    Returns counts of rows the write-through *attempted* to land. Actual
    inserts may be lower due to dedup on `(source, url_hash)`.

    Failure here must never break the API response — callers should
    invoke this inside try/except and log on error.
    """
    if supabase is None:
        return {"documents": 0, "scores": 0, "skipped": "no_supabase_client"}

    docs_to_insert: List[Dict[str, Any]] = []
    url_to_score: Dict[str, Dict[str, Any]] = {}

    for article in articles:
        url = (article.get("source_url") or article.get("url") or "").strip()
        if not url:
            continue

        url_hash = _url_hash(url)
        published = _to_iso(article.get("time_published") or article.get("published"))

        doc = {
            "source": article.get("source") or "unknown",
            "source_type": "news",
            "url": url,
            "url_hash": url_hash,
            "title": article.get("title"),
            "content": article.get("summary"),
            "raw_payload": {
                "categories": article.get("categories"),
                "tickers": article.get("tickers"),
                "keywords": article.get("keywords"),
                "commodity": article.get("commodity"),
                "enhanced": article.get("enhanced", False),
                "word_count": article.get("word_count"),
                "enhancement_method": article.get("enhancement_method"),
                # Recorded so an unreadable upstream date is visible in the
                # data rather than indistinguishable from a real one.
                "published_estimated": published is None,
            },
        }
        # Only set published_at when we actually know it. Omitting the key
        # means PostgREST's ON CONFLICT DO UPDATE leaves the column alone on
        # re-ingestion, so a date-less article gets now() once at first sight
        # (via the column default) and then ages normally, instead of being
        # re-stamped to the current time on every ten-minute tick and living
        # permanently at the top of the feed.
        if published:
            doc["published_at"] = published
        docs_to_insert.append(doc)

        sentiment = _normalize_sentiment(article.get("sentiment"))
        if sentiment is None:
            continue

        score_value = article.get("sentiment_score")
        if score_value is None:
            continue

        url_to_score[(article.get("source") or "unknown", url_hash)] = {
            "sentiment": sentiment,
            "score": float(score_value),
            "confidence": float(score_value),
            "distribution": None,
        }

    if not docs_to_insert:
        return {"documents": 0, "scores": 0}

    # Step 1: upsert documents, returning their ids.
    #
    # Two batches, because PostgREST rejects a batch whose objects do not all
    # carry the same keys ("All object keys must match"). Rows with a known
    # publication date send published_at; rows without omit it so the column
    # default fills it on insert and re-ingestion does not overwrite it.
    dated = [d for d in docs_to_insert if "published_at" in d]
    undated = [d for d in docs_to_insert if "published_at" not in d]
    if undated:
        logger.info(
            "archive_writer: %d/%d articles had no readable publication date; "
            "their published_at is left to the column default",
            len(undated), len(docs_to_insert),
        )

    doc_rows: List[Dict[str, Any]] = []
    for batch in (dated, undated):
        if not batch:
            continue
        try:
            doc_response = (
                supabase.table("raw_documents")
                .upsert(batch, on_conflict="source,url_hash")
                .execute()
            )
            doc_rows.extend(doc_response.data or [])
        except Exception as exc:  # noqa: BLE001
            logger.warning("archive_writer: raw_documents upsert failed: %s", exc)
            if batch is dated:
                return {"documents": 0, "scores": 0, "error": str(exc)}

    # Step 2: build sentiment rows keyed by the document ids returned above.
    score_rows: List[Dict[str, Any]] = []
    for row in doc_rows:
        key = (row.get("source"), row.get("url_hash"))
        score = url_to_score.get(key)
        if not score:
            continue
        score_rows.append({
            "document_id": row["id"],
            "model_name": model_name,
            "model_version": model_version,
            "sentiment": score["sentiment"],
            "score": score["score"],
            "confidence": score["confidence"],
            "distribution": score["distribution"],
        })

    if not score_rows:
        return {"documents": len(doc_rows), "scores": 0}

    try:
        (
            supabase.table("sentiment_scores")
            .upsert(score_rows, on_conflict="document_id,model_name,model_version")
            .execute()
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("archive_writer: sentiment_scores upsert failed: %s", exc)
        return {"documents": len(doc_rows), "scores": 0, "error": str(exc)}

    # Step 3: populate entity_mentions for BOTH commodity AND topic detections.
    #
    # Commodity rows: when raw_payload.commodity is set, one row per (doc, commodity).
    # Topic rows: run the topic_taxonomy keyword detector on each article's
    # title+content and emit one row per matching topic. The divergence service
    # reads topic rows; the public sentiment endpoints read commodity rows.
    #
    # Wrapped so detection failures cannot block the sentiment-archive write above.
    entity_rows: List[Dict[str, Any]] = []
    score_by_doc = {row["document_id"]: row for row in score_rows}

    # 3a. Commodity entity rows.
    for doc_row in doc_rows:
        doc_id = doc_row.get("id")
        payload = doc_row.get("raw_payload") or {}
        commodity = (payload.get("commodity") or "").strip().lower()
        if not commodity or not doc_id:
            continue
        score = score_by_doc.get(doc_id)
        entity_rows.append({
            "document_id": doc_id,
            "entity": commodity,
            "entity_type": "commodity",
            "sentiment": (score or {}).get("sentiment"),
            "score": (score or {}).get("score"),
            "confidence": (score or {}).get("confidence"),
            "model_version": model_version,
        })

    # 3b. Topic entity rows (keyword-based detection over title+summary).
    try:
        from services.topic_taxonomy import detect_topics

        article_by_url_hash: Dict[str, Dict[str, Any]] = {}
        for article in articles:
            url = (article.get("source_url") or article.get("url") or "").strip()
            if url:
                article_by_url_hash[_url_hash(url)] = article

        for doc_row in doc_rows:
            doc_id = doc_row.get("id")
            url_hash = doc_row.get("url_hash")
            if not doc_id or not url_hash:
                continue
            article = article_by_url_hash.get(url_hash) or {}
            article_title = str(article.get("title") or "")
            text_for_match = " ".join([
                article_title,
                str(article.get("summary") or ""),
            ])
            # Title-aware, matching news_enricher exactly — otherwise the
            # sentiment rows feeding divergence would be tagged under a
            # different rule than the badge that reads them.
            detected = detect_topics(text_for_match, title=article_title)
            score = score_by_doc.get(doc_id)
            for topic_key in detected:
                entity_rows.append({
                    "document_id": doc_id,
                    "entity": topic_key,
                    "entity_type": "topic",
                    "sentiment": (score or {}).get("sentiment"),
                    "score": (score or {}).get("score"),
                    "confidence": (score or {}).get("confidence"),
                    "model_version": model_version,
                })
    except Exception as exc:  # noqa: BLE001
        logger.debug("archive_writer: topic detection skipped: %s", exc)

    if entity_rows:
        try:
            # UPSERT, not insert. news_fetcher re-scans the same articles every
            # 10 minutes, so a plain insert re-added identical (document, entity)
            # rows on every tick — production reached 72x duplication (one doc
            # counted 525 times). divergence._aggregate_sentiment averages over
            # these rows, so duplicates silently weighted stale articles far
            # above fresh ones. Unique index:
            #   entity_mentions (document_id, entity, entity_type, coalesce(model_version,''))
            (
                supabase.table("entity_mentions")
                # See jobs/archive_scorer.py for the full rationale: model_version
                # in the conflict key means a model bump duplicates the archive,
                # and DO NOTHING makes a re-score a silent no-op. This is the
                # live ingest path, so it duplicated on every tick.
                .upsert(
                    entity_rows,
                    on_conflict="document_id,entity,entity_type",
                    ignore_duplicates=False,
                )
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            # Non-fatal: scores are already persisted; the next tick retries.
            logger.debug("archive_writer: entity_mentions upsert skipped: %s", exc)

    return {
        "documents": len(doc_rows),
        "scores": len(score_rows),
        "entities": len(entity_rows),
    }


def persist_prediction_market_snapshot(
    supabase,
    *,
    market_id: str,
    market_provider: str,
    snapshot_at: datetime,
    market_yes_price: Optional[float],
    related_sentiment: Optional[float],
    article_count: int = 0,
    model_version: str = ACTIVE_MODEL_VERSION,
) -> bool:
    """Record a point-in-time market price alongside contemporaneous sentiment.

    This is what powers the prediction-market overlay product. Idempotent
    on (market_id, snapshot_at, sentiment_model_version).
    """
    if supabase is None:
        return False
    try:
        (
            supabase.table("market_sentiment_overlay")
            .upsert(
                {
                    "market_id": market_id,
                    "market_provider": market_provider,
                    "snapshot_at": _to_iso(snapshot_at),
                    "market_yes_price": market_yes_price,
                    "related_sentiment": related_sentiment,
                    "sentiment_model_version": model_version,
                    "article_count": article_count,
                },
                on_conflict="market_id,snapshot_at,sentiment_model_version",
            )
            .execute()
        )
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("archive_writer: market overlay upsert failed: %s", exc)
        return False
