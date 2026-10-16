"""WAF ingest tick (every 30 min): tag the archive, parse NPA positions, pull MEMAN.

WAF news itself is fetched by jobs/news_fetcher (fetch_waf_news) and lands in
raw_documents like every other article. This job adds the WAF layer on top:

  1. Tag recently archived documents with the WAF taxonomy — from any source, so a
     Reuters line on Dangote is tagged as well as a Punch one.
  2. Parse NPA Daily Shipping Position reports among them into waf_port_positions.
  3. Ingest new MEMAN publications (RSS + bulletin PDF), score and archive them
     through the shared path, and tag them from their FULL text.

Backfill: `python -m jobs.waf_ingest --backfill-days 730` re-runs steps 1-2 over
the existing archive (published_at window).
"""

from __future__ import annotations

import argparse
import logging
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

_running_lock = threading.Lock()
TAG_LOOKBACK = timedelta(hours=3)


# Last tick's outcome, served by /health/waf. Errors are recorded here as well as
# logged: an ingest that raises every 30 minutes looked, from outside, exactly
# like a quiet news week (W41 shipped with 0 articles and no visible reason).
LAST_TICK: Dict[str, Any] = {}


def run() -> Dict[str, Any]:
    if not _running_lock.acquire(blocking=False):
        return {"skipped": "still_running"}
    started = datetime.now(timezone.utc)
    try:
        result = _tick()
        LAST_TICK.clear()
        LAST_TICK.update(started_at=started.isoformat(), ok="error" not in result, result=result)
        return result
    except Exception as exc:
        LAST_TICK.clear()
        LAST_TICK.update(started_at=started.isoformat(), ok=False, error=f"{type(exc).__name__}: {exc}")
        raise
    finally:
        _running_lock.release()


def _tick() -> Dict[str, Any]:
    from services._supabase import get_supabase_client

    supabase = get_supabase_client()
    if supabase is None:
        logger.error("waf_ingest: no Supabase client — nothing can be tagged or stored")
        return {"error": "no_supabase_client"}
    from waf import store

    docs, truncated = store.recent_documents(supabase, datetime.now(timezone.utc) - TAG_LOOKBACK)
    result = tag_documents(supabase, docs)
    result["truncated"] = truncated
    result["meman"] = ingest_meman(supabase)
    return result


def tag_documents(supabase: Any, docs: List[Dict[str, Any]]) -> Dict[str, int]:
    from waf import store
    from waf.sources import WAF_SOURCES
    from waf.taxonomy import is_waf_relevant, tag_text
    from waf.vessels import parse_npa_position

    counts = {"seen": len(docs), "tagged": 0, "port_positions": 0}
    for doc in docs:
        text = f"{doc.get('title') or ''}\n{doc.get('content') or ''}"
        tags = tag_text(text)
        if not (is_waf_relevant(tags) or (doc.get("source") in WAF_SOURCES and not tags.is_empty())):
            continue
        store.upsert_tags(supabase, doc["id"], tags)
        counts["tagged"] += 1
        if "port_position" in tags.topics:
            published = doc.get("published_at")
            report_date = datetime.fromisoformat(published).date() if published else None
            position = parse_npa_position(text, report_date=report_date, source_url=doc["url"])
            if position:
                store.upsert_port_position(supabase, position, doc["id"])
                counts["port_positions"] += 1
    return counts


def ingest_meman(supabase: Any) -> Dict[str, Any]:
    from jobs.news_fetcher import _score
    from services.archive_writer import persist_articles
    from waf import meman, store
    from waf.sources import MEMAN_SOURCE

    try:
        documents = meman.collect(store.known_urls(supabase, MEMAN_SOURCE))
    except Exception as exc:  # noqa: BLE001 — logged loudly; the news half of the tick still counts
        logger.error("waf_ingest: MEMAN collection failed: %s", exc)
        return {"error": str(exc)}
    if not documents:
        return {"new": 0}

    write = persist_articles(supabase, _score([d.as_article() for d in documents]))
    ids = store.document_ids(supabase, MEMAN_SOURCE, [d.url for d in documents])
    tagged = 0
    for doc in documents:
        if doc.url not in ids:
            continue
        if not doc.tags.countries:
            doc.tags.countries = ["NG"]  # MEMAN is a Nigerian association
        store.upsert_tags(supabase, ids[doc.url], doc.tags)
        tagged += 1
    ocr = [d.url for d in documents if d.pdf and d.pdf.pages_needing_ocr]
    if ocr:
        logger.warning("waf_ingest: %d MEMAN PDFs have scanned pages needing OCR: %s", len(ocr), ocr)
    return {"new": len(documents), "archived": write, "tagged": tagged, "needs_ocr": len(ocr),
            "supply_signals": sum(d.supply_signal for d in documents)}


def backfill(days: int) -> Dict[str, Any]:
    """Tag and parse the existing archive, one day at a time (bounded reads)."""
    from services._supabase import get_supabase_client
    from services.pagination import fetch_all

    supabase = get_supabase_client()
    end = datetime.now(timezone.utc)
    totals = {"seen": 0, "tagged": 0, "port_positions": 0}
    for offset in range(days):
        day_end = end - timedelta(days=offset)
        day_start = day_end - timedelta(days=1)
        docs, _ = fetch_all(
            lambda s, e: supabase.table("raw_documents")
            .select("id, source, url, title, content, published_at")
            .gte("published_at", day_start.isoformat()).lt("published_at", day_end.isoformat())
            .range(s, e)
        )
        for key, value in tag_documents(supabase, docs).items():
            totals[key] += value
    return totals


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backfill-days", type=int, default=0)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    print(backfill(args.backfill_days) if args.backfill_days else run())
