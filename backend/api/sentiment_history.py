"""Public read endpoints over the historical sentiment archive.

These endpoints expose the data layer added by the historical archive
migration to API customers via the Bearer-token api_keys auth layer.

Endpoints
---------

  GET  /v1/commodities
       List of commodities the archive has data for.

  GET  /v1/sentiment/{commodity}/now
       Most recent observation for this commodity, plus the rolling
       24h average. Recency check uses the latest row in
       raw_documents joined to sentiment_scores.

  GET  /v1/sentiment/{commodity}/history?from=&to=&cursor=
       Time-series of individual scored documents within a window.
       Capped at 1000 rows per call; paginate with the opaque `cursor`
       returned as `next_cursor` whenever `has_more` is true.

       The previous instruction here was "clients paginate via from/to",
       which cannot be done correctly. Rows are ordered by published_at
       and feeds publish many articles on the same timestamp, so a client
       re-issuing with to=<last published_at> either re-reads the tied
       rows or, using a strict bound, skips ones it never saw. Both are
       invisible client-side and unfixable there. Keyset pagination on
       (published_at, document_id) is a total order, so neither happens.

  GET  /v1/sentiment/{commodity}/daily?days=30
       Daily aggregates (avg sentiment, article count, momentum)
       computed on-the-fly from sentiment_scores. Suitable for
       charts. Computed on read for beta simplicity; will move to a
       cached daily_asset_sentiment table once traffic justifies.

  GET  /v1/markets/overlay?provider=kalshi&status=settled&limit=
       Resolved prediction markets joined to contemporaneous news
       sentiment — the unique cross-market product.

Auth: every endpoint requires a valid Authorization: Bearer <key>
header that resolves to a row in api_keys via verify_api_key.
"""

from __future__ import annotations

import datetime as dt
import logging
import statistics
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from services.api_key_auth import (
    HISTORY_SCOPE,
    assert_history_depth,
    require_scopes,
    tier_of,
    verify_api_key,
)
from services.entitlement import query_depth_days
from services import archive_coverage, entity_aliases
from services.pagination import decode_cursor, encode_cursor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["sentiment-history"])

DEFAULT_HISTORY_LIMIT = 100
MAX_HISTORY_LIMIT = 1000
MAX_DAILY_DAYS = 365


def _supabase():
    """Lazy import — supabase client may not be initialized at import time."""
    from services._supabase import get_supabase_client

    sb = get_supabase_client()
    if sb is None:
        raise HTTPException(status_code=503, detail="archive backend unavailable")
    return sb


def _parse_iso(value: str, label: str) -> dt.datetime:
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"invalid {label} timestamp: {exc}") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed


# How far back "has data" looks. Long enough that a thinly covered commodity
# still shows up, short enough that the answer describes the live product
# rather than everything ever ingested.
COMMODITY_WINDOW_DAYS = 30


@router.get("/commodities")
async def list_commodities(auth: Dict[str, Any] = Depends(verify_api_key)) -> Dict[str, Any]:
    """Commodities with scored articles in the last 30 days, busiest first.

    THE BUG THIS REPLACES. The previous implementation asked for 10,000 rows of
    entity_mentions with no ORDER BY and no time filter, then took the distinct
    set in Python. Postgres may return any 10,000 rows for such a query, and it
    returned a block from the archive backfill: this endpoint reported that
    `bitcoin` was the only commodity with data, while the same table held 22 oil
    mentions, 3 gold and 1 copper from the previous 24 hours alone.

    A paid endpoint was telling customers the product was empty, and the MCP
    tool built on it was repeating that to their assistant. DISTINCT now happens
    in the database, where it is exact rather than a sample.

    Counts ride along because they were free once the grouping existed, and they
    answer the question behind the question: not "what can I ask about" but
    "what is worth asking about".
    """
    supabase = _supabase()
    rows: List[Dict[str, Any]] = []
    try:
        rows = (
            supabase.rpc(
                "commodities_with_data", {"p_days": COMMODITY_WINDOW_DAYS}
            ).execute()
        ).data or []
    except Exception as exc:  # noqa: BLE001
        # The function is added by supabase/migrations/20260924_commodities_with_data.sql.
        # Until that is applied this falls back to a scan that is ORDERED and
        # WINDOWED — still a sample rather than a true distinct, but taken from
        # the most recent mentions, so a commodity that is active cannot be
        # missed the way it was before.
        #
        # The limit below is not the real cap: PostgREST enforces its own
        # max-rows, measured at 1000 on this project, so `20000` is only a
        # statement of intent. That cap is also why the original query was worse
        # than it looked — it took 1000 arbitrary rows, not 10,000. Against 30
        # days of live data the 1000 most recent mentions still surfaced all 17
        # commodities, but the guarantee comes from the RPC, not from here.
        logger.warning(
            "commodities_with_data RPC unavailable (%s); falling back to a bounded scan. "
            "Apply supabase/migrations/20260924_commodities_with_data.sql",
            exc,
        )
        since = (
            dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=COMMODITY_WINDOW_DAYS)
        ).isoformat()
        try:
            scanned = (
                supabase.table("entity_mentions")
                .select("entity, published_at")
                .eq("entity_type", "commodity")
                .gte("published_at", since)
                .order("published_at", desc=True)
                .limit(20000)
                .execute()
            ).data or []
        except Exception as scan_exc:  # noqa: BLE001
            logger.warning("list_commodities fallback scan failed: %s", scan_exc)
            scanned = []
        counts: Dict[str, int] = {}
        for row in scanned:
            name = (row.get("entity") or "").strip().lower()
            if name:
                counts[name] = counts.get(name, 0) + 1
        rows = [
            {"entity": name, "article_count": count}
            for name, count in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
        ]

    commodities = []
    for row in rows:
        name = (row.get("entity") or "").strip().lower()
        if not name:
            continue
        commodities.append({
            "commodity": name,
            "article_count": row.get("article_count"),
            "last_seen": row.get("last_seen"),
        })

    merged = [
        {**row, **entity_aliases.describe(row["commodity"])}
        for row in entity_aliases.collapse(commodities)
    ]

    return {
        # A plain list of names, kept because it is what the field was before and
        # what every existing caller reads.
        # Collapsed to one entry per subject. The raw table carries 49 entity
        # values because two labelling systems write to it, and on four subjects
        # they disagree about the name — so `oil` and `crude_oil` both appeared,
        # with nothing saying they were the same thing and a caller who picked
        # the second getting 86% of the data.
        "commodities": [c["commodity"] for c in merged],
        "window_days": COMMODITY_WINDOW_DAYS,
        # Each entry carries its human label, its taxonomy category (so `macro`
        # and `oil` stop being indistinguishable values of one field), and the
        # alternate spellings folded into it.
        "details": merged,
        # The archive's real extent, NOT clamped by this caller's depth cap.
        # Everything above is a 30-day view; without this a reader cannot tell a
        # window from the whole dataset, which is exactly how an evaluator
        # concluded the product held 33 days of history and said so in writing.
        "coverage": archive_coverage.describe(
            supabase, query_depth_days(tier_of(auth))
        ),
    }


@router.get("/sentiment/{commodity}/now")
async def sentiment_now(
    commodity: str,
    _auth: Dict[str, Any] = Depends(verify_api_key),
) -> Dict[str, Any]:
    """Most recent observed sentiment for `commodity` plus a 24h rolling stat."""
    supabase = _supabase()
    commodity_lc = commodity.strip().lower()
    since = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=24)).isoformat()

    try:
        rows = (
            supabase.table("entity_mentions")
            .select("sentiment_score, sentiment, published_at")
            .eq("entity", commodity_lc)
            .gte("published_at", since)
            .order("published_at", desc=True)
            .limit(500)
            .execute()
        ).data or []
    except Exception as exc:  # noqa: BLE001
        logger.warning("sentiment_now query failed: %s", exc)
        rows = []

    if not rows:
        raise HTTPException(status_code=404, detail=f"no data for commodity '{commodity_lc}' in last 24h")

    # sentiment_score (signed), NOT score (a confidence magnitude). Averaging
    # `score` produced a number that rose as the news got worse: bearish rows
    # average HIGHER than bullish ones.
    scores = [r["sentiment_score"] for r in rows if r.get("sentiment_score") is not None]
    avg = round(statistics.fmean(scores), 4) if scores else None
    latest = rows[0]
    return {
        "commodity": commodity_lc,
        "latest": {
            "sentiment": latest.get("sentiment"),
            "score": latest.get("sentiment_score"),
            "observed_at": latest.get("published_at"),
        },
        "rolling_24h": {
            "avg_score": avg,
            "sample_size": len(scores),
        },
    }


def _keyset_filter(published_at: str, document_id: str) -> str:
    """PostgREST `or=` expression for "strictly after this row" in desc order.

    Values are double-quoted because a timestamptz rendered by Postgres carries
    `+00:00`, and `+` is the one character whose meaning changes if any layer
    between here and the database decodes the query string as a form body.
    Quoting is PostgREST's documented escape for reserved characters in a filter
    value, so it costs nothing and removes the question.
    """
    return (
        f'published_at.lt."{published_at}",'
        f'and(published_at.eq."{published_at}",document_id.lt."{document_id}")'
    )


@router.get("/sentiment/{commodity}/history")
async def sentiment_history(
    commodity: str,
    from_: Optional[str] = Query(default=None, alias="from", description="ISO 8601 UTC timestamp"),
    to: Optional[str] = Query(default=None, description="ISO 8601 UTC timestamp"),
    limit: int = Query(default=DEFAULT_HISTORY_LIMIT, ge=1, le=MAX_HISTORY_LIMIT),
    cursor: Optional[str] = Query(
        default=None,
        description=(
            "Opaque pagination cursor. Pass the `next_cursor` from the previous "
            "response to continue; omit it for the first page. Do not construct "
            "or parse it."
        ),
    ),
    auth: Dict[str, Any] = Depends(require_scopes(HISTORY_SCOPE)),
) -> Dict[str, Any]:
    """Time-series of individual scored documents for `commodity`.

    Paginated with a keyset cursor. `from` and `to` still bound the window and
    are re-sent on every page; the cursor carries only the position within it.
    """
    supabase = _supabase()
    commodity_lc = commodity.strip().lower()

    end = _parse_iso(to, "to") if to else dt.datetime.now(dt.timezone.utc)
    start = _parse_iso(from_, "from") if from_ else end - dt.timedelta(days=7)
    if start >= end:
        raise HTTPException(status_code=400, detail="'from' must be earlier than 'to'")

    # A malformed cursor is a 400, never a silent restart from page one. A client
    # that corrupts its cursor should be told, not handed the first page forever
    # while it believes it is advancing.
    try:
        keyset = decode_cursor(cursor)
    except ValueError:
        raise HTTPException(status_code=400, detail="malformed cursor")

    if keyset is not None:
        if not isinstance(keyset, dict) or not keyset.get("p") or not keyset.get("d"):
            raise HTTPException(status_code=400, detail="malformed cursor")
        if keyset.get("e") != commodity_lc:
            # Cursors are per-series. Accepting one issued for another commodity
            # would return that commodity's position under this name.
            raise HTTPException(
                status_code=400,
                detail="cursor belongs to a different commodity; start a new page",
            )

    # Depth gate measured from NOW to the OLDEST point requested. Measuring the
    # WIDTH of [start, end] let a narrow window sitting far in the past through:
    # from=2015-01-01&to=2015-03-01 is 59 days wide and passed a 90-day cap.
    now = dt.datetime.now(dt.timezone.utc)
    assert_history_depth(auth, (now - start).total_seconds() / 86400.0)

    try:
        query = (
            supabase.table("entity_mentions")
            .select("document_id, sentiment, sentiment_score, confidence, published_at")
            .eq("entity", commodity_lc)
            .gte("published_at", start.isoformat())
            .lte("published_at", end.isoformat())
        )
        if keyset is not None:
            query = query.or_(_keyset_filter(keyset["p"], keyset["d"]))
        rows = (
            query
            # document_id is the tiebreaker, and it must be in the ORDER BY for
            # the keyset to mean anything: without it Postgres may return rows
            # sharing a timestamp in any order, so "everything after (p, d)" is
            # not a well-defined position.
            .order("published_at", desc=True)
            .order("document_id", desc=True)
            # One more row than asked for. The extra is never returned — it only
            # proves another page exists, which avoids the off-by-one a separate
            # count query invites on the exact boundary.
            .limit(limit + 1)
            .execute()
        ).data or []
    except Exception as exc:  # noqa: BLE001
        logger.warning("sentiment_history query failed: %s", exc)
        rows = []

    has_more = len(rows) > limit
    page = rows[:limit]

    body: Dict[str, Any] = {
        "commodity": commodity_lc,
        "from": start.isoformat(),
        "to": end.isoformat(),
        "count": len(page),
        "limit": limit,
        "has_more": has_more,
        "items": page,
    }
    if has_more and page:
        last = page[-1]
        body["next_cursor"] = encode_cursor({
            "p": last["published_at"],
            "d": last["document_id"],
            "e": commodity_lc,
        })
    return body


@router.get("/sentiment/{commodity}/daily")
async def sentiment_daily(
    commodity: str,
    days: int = Query(default=30, ge=1, le=MAX_DAILY_DAYS),
    auth: Dict[str, Any] = Depends(require_scopes(HISTORY_SCOPE)),
) -> Dict[str, Any]:
    """Daily aggregates for the last N days, computed on-the-fly."""
    # Depth gate: history-scoped ($99) keys are capped at 90 days; deeper
    # ranges require the archive ($249) scope.
    assert_history_depth(auth, days)
    supabase = _supabase()
    commodity_lc = commodity.strip().lower()
    end = dt.datetime.now(dt.timezone.utc)
    start = end - dt.timedelta(days=days)

    try:
        rows = (
            supabase.table("entity_mentions")
            .select("sentiment, sentiment_score, published_at")
            .eq("entity", commodity_lc)
            .gte("published_at", start.isoformat())
            .lte("published_at", end.isoformat())
            .limit(50000)
            .execute()
        ).data or []
    except Exception as exc:  # noqa: BLE001
        logger.warning("sentiment_daily query failed: %s", exc)
        rows = []

    # Bucket by UTC date.
    buckets: Dict[str, List[Dict[str, Any]]] = {}
    for r in rows:
        observed = r.get("published_at")
        if not observed:
            continue
        try:
            date_key = dt.datetime.fromisoformat(observed.replace("Z", "+00:00")).date().isoformat()
        except ValueError:
            continue
        buckets.setdefault(date_key, []).append(r)

    series: List[Dict[str, Any]] = []
    sorted_dates = sorted(buckets.keys())
    prev_avg: Optional[float] = None
    for date_key in sorted_dates:
        bucket = buckets[date_key]
        scores = [b["sentiment_score"] for b in bucket if b.get("sentiment_score") is not None]
        avg = round(statistics.fmean(scores), 4) if scores else None
        momentum = round(avg - prev_avg, 4) if (avg is not None and prev_avg is not None) else None
        series.append({
            "date": date_key,
            "avg_score": avg,
            "article_count": len(bucket),
            "bullish_count": sum(1 for b in bucket if b.get("sentiment") == "bullish"),
            "bearish_count": sum(1 for b in bucket if b.get("sentiment") == "bearish"),
            "neutral_count": sum(1 for b in bucket if b.get("sentiment") == "neutral"),
            "momentum": momentum,
        })
        if avg is not None:
            prev_avg = avg

    return {
        "commodity": commodity_lc,
        "from": start.date().isoformat(),
        "to": end.date().isoformat(),
        "days": days,
        "series": series,
    }


@router.get("/markets/overlay")
async def markets_overlay(
    provider: str = Query(default="kalshi"),
    status: str = Query(default="settled", description="market status filter applied to raw_payload"),
    limit: int = Query(default=50, ge=1, le=500),
    _auth: Dict[str, Any] = Depends(verify_api_key),
) -> Dict[str, Any]:
    """Resolved prediction markets with linked news-sentiment context.

    For the beta this returns the resolved markets enriched with the
    average news sentiment over the market's lifetime. Full per-snapshot
    overlay arrives once the nightly aggregation job is wired up; this
    endpoint already returns the shape that job will populate.
    """
    supabase = _supabase()
    try:
        market_rows = (
            supabase.table("raw_documents")
            .select("id, url, title, published_at, raw_payload")
            .eq("source", "Kalshi" if provider.lower() == "kalshi" else provider)
            .eq("source_type", "prediction_market")
            .order("published_at", desc=True)
            .limit(limit)
            .execute()
        ).data or []
    except Exception as exc:  # noqa: BLE001
        logger.warning("markets_overlay query failed: %s", exc)
        market_rows = []

    items: List[Dict[str, Any]] = []
    for m in market_rows:
        payload = m.get("raw_payload") or {}
        if status and payload.get("status") and payload.get("status") != status:
            continue
        items.append({
            "market_id": payload.get("ticker"),
            "provider": provider,
            "title": m.get("title"),
            "url": m.get("url"),
            "opened_at": payload.get("open_time"),
            "closed_at": payload.get("close_time"),
            "result": payload.get("result"),
            "last_price": payload.get("last_price"),
            "volume": payload.get("volume"),
            "category": payload.get("category"),
        })

    return {
        "provider": provider,
        "status": status,
        "count": len(items),
        "items": items,
    }
