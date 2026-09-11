"""Scheduled news fetcher — populates the archive in production.

Runs on a 10-minute interval. Each tick:

  1. Calls the same news pipeline the /api/news endpoints serve
  2. Writes every observed article to raw_documents (via archive_writer)
  3. Per-article sentiment scores land in sentiment_scores
  4. Topic keyword detection populates entity_mentions rows

Without this, the archive added by PR #12 stays empty in prod — the
write-through in main_simple_nlp's /api/news/feed only fires when a
client hits that endpoint, and the production main:app entry point
doesn't serve /api/news/feed at all.

Concurrency: a module-level lock prevents two ticks from overlapping
if the fetch takes longer than the interval.
"""

from __future__ import annotations

import asyncio
import logging
import threading
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

_running_lock = threading.Lock()
DEFAULT_MAX_ARTICLES = 50


def run() -> Dict[str, Any]:
    """One tick — fetch news, score, write archive. Safe to call from cron."""
    if not _running_lock.acquire(blocking=False):
        logger.info("news_fetcher: previous tick still running, skipping")
        return {"skipped": "still_running"}
    try:
        return asyncio.run(_fetch_and_archive())
    finally:
        _running_lock.release()


async def _fetch_and_archive() -> Dict[str, Any]:
    try:
        from data_sources import NewsDataSources
    except ImportError as exc:
        logger.warning("news_fetcher: data_sources not importable: %s", exc)
        return {"error": "data_sources unavailable"}

    articles: List[Dict[str, Any]] = []
    async with NewsDataSources() as ns:
        for fetcher_name in (
            "fetch_reuters_commodities",
            "fetch_yahoo_finance_commodities",
            "fetch_eia_reports",
            "fetch_iea_news",
            "fetch_oilprice_news",
        ):
            fetcher = getattr(ns, fetcher_name, None)
            if fetcher is None:
                continue
            try:
                result = await fetcher()
                if isinstance(result, list):
                    articles.extend(result)
            except Exception as exc:  # noqa: BLE001
                logger.warning("news_fetcher: %s failed: %s", fetcher_name, exc)

    if not articles:
        return {"articles_observed": 0}

    # RSS media fields cover Yahoo and almost nothing else — measured 2026-09-07,
    # oilprice/CNBC/Bloomberg/investing.com ship none — so most articles arrive
    # with an empty image_url and the client falls back to the brand mark on
    # every card.
    #
    # This runs HERE, at ingest, rather than on the request path where the
    # original og:image scrape lived. There it cost every user a round trip per
    # card; here it costs a background job that already takes seconds, the
    # result is persisted, and it is paid once per article rather than once per
    # view. Bounded on timeout, bytes, concurrency and total batch time, so a
    # hostile publisher cannot stall the tick.
    try:
        from services.feed_images import enrich_missing_images

        image_counters = await enrich_missing_images(articles)
    except Exception as exc:  # noqa: BLE001 — images must never block archiving
        logger.warning("news_fetcher: og:image enrichment skipped: %s", exc)
        image_counters = {"error": str(exc)}

    enhanced = _score(articles)

    try:
        from services._supabase import get_supabase_client
        from services.archive_writer import persist_articles

        supabase = get_supabase_client()
        write_result = persist_articles(supabase, enhanced)
    except Exception as exc:  # noqa: BLE001
        logger.warning("news_fetcher: archive write skipped: %s", exc)
        return {"articles_observed": len(enhanced), "error": str(exc)}

    return {
        "articles_observed": len(enhanced),
        "images": image_counters,
        **write_result,
    }


def _score(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Apply commodity sentiment scoring to each article.

    Mirrors the scoring loop inside main_simple_nlp's /api/news/feed
    handler but is decoupled from any request lifecycle.
    """
    try:
        from main_simple_nlp import (  # type: ignore
            analyze_market_sentiment,
            basic_sentiment_analysis,
            extract_commodity_tickers,
            extract_keywords,
            normalize_commodity,
        )
        # NOT `vader_analyzer` — that global is None at import time and only
        # assigned inside FastAPI's lifespan(). This job runs in the scheduler
        # process, so the from-import copied None, `if vader_analyzer:` failed,
        # and every LIVE article was scored by a 20-word keyword list. Same bug
        # as jobs/archive_scorer.py; this one was corrupting new data, not just
        # the backfill.
        from services.sentiment_engine import get_analyzer

        vader_analyzer = get_analyzer()
    except ImportError as exc:
        logger.warning("news_fetcher: sentiment functions not importable: %s", exc)
        # Return articles unscored — archive_writer will skip sentiment rows.
        return [
            {
                "source": a.get("source"),
                "title": a.get("title"),
                "summary": a.get("summary"),
                "url": a.get("url"),
                "time_published": a.get("published"),
                "categories": [a.get("category", "general")],
                # archive_writer reads `image_url` (line ~125). This loop
                # rebuilds the dict from scratch, so anything not named here is
                # dropped — which silently discarded every image captured at
                # fetch time, on both this path and the scored one below.
                "image_url": a.get("image_url") or "",
            }
            for a in articles
        ]

    scored: List[Dict[str, Any]] = []
    for article in articles:
        text = f"{article.get('title','')}. {article.get('summary','')}"
        commodity = normalize_commodity(None, text)
        if vader_analyzer:
            scores = vader_analyzer.polarity_scores(text)
            result = analyze_market_sentiment(text, commodity, scores=scores)
        else:
            result = basic_sentiment_analysis(text, commodity)
        scored.append({
            "title": article.get("title"),
            "summary": article.get("summary"),
            "source": article.get("source"),
            "source_url": article.get("url"),
            "time_published": article.get("published"),
            "sentiment": result["sentiment"],
            "sentiment_score": round(result["confidence"], 2),
            "categories": [article.get("category", "general")],
            "tickers": extract_commodity_tickers(text),
            "keywords": extract_keywords(text),
            "commodity": commodity,
            # See the note on the unscored path above: omit this and the image
            # captured at fetch time never reaches archive_writer.
            "image_url": article.get("image_url") or "",
        })
    return scored
