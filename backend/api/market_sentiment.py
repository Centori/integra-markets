"""GET /api/sentiment/market — aggregate commodity sentiment.

Why this exists
---------------
The mobile client's dashboard fetch opens with this endpoint and treats a
failure as fatal to the whole load:

    // app/services/api.js  dashboardApi.getTodayDashboard
    const response = await fetch(`${API_URL}/sentiment/market`);
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);   // <-- aborts
    }
    ...
    const newsResponse = await fetch(`${API_URL}/news/feed`, ...)

The route existed only in `main_simple_nlp.py`, which is not the deployed
entrypoint (`main:app` is), so it answered 404 in production. The throw was
caught by `getTodayDashboard`'s own handler, which returned `{news: []}`;
`loadNews` saw an empty list and called `loadCachedFeed()`; and
`loadCachedFeed` has no TTL. So the app re-displayed its last cached batch on
every launch and refresh, indefinitely.

That is why the feed looked frozen even while POST /api/news/feed was serving
correct, freshly ordered articles: the client never got as far as calling it.

The client does not read this payload — `loadNews` only uses `data.news` — but
it does gate on the status code, so the cheapest correct fix is to make the
endpoint exist rather than to ship a client change through review.

Unlike the legacy implementation, which returned a hardcoded list with the
comment "in production, this would use real data", this computes from
`entity_mentions`, the same table `/v1/sentiment/{commodity}/now` reads.
Response shape matches the legacy contract so any existing consumer is
unaffected.
"""

from __future__ import annotations

import datetime as dt
import logging
import statistics
from typing import Any, Dict, List, Optional

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sentiment", tags=["market-sentiment"])

# Display names match the legacy payload so nothing downstream has to remap.
_TRACKED = (
    ("oil", "OIL"),
    ("natural gas", "NAT GAS"),
    ("wheat", "WHEAT"),
    ("gold", "GOLD"),
    ("corn", "CORN"),
    ("copper", "COPPER"),
)

_WINDOW_HOURS = 24
# Score is 0..1 with 0.5 neutral. This band around the midpoint reads as
# neutral rather than as a weak directional call.
# Band around ZERO, not around 0.5. These constants used to assume `score`,
# which ran 0.5..1.0 with 0.5 meaning neutral. sentiment_score is signed with 0
# meaning neutral, so leaving the old midpoint would report every commodity as
# bearish.
_NEUTRAL_BAND = 0.05


def _label(avg: float) -> str:
    if avg >= _NEUTRAL_BAND:
        return "BULLISH"
    if avg <= -_NEUTRAL_BAND:
        return "BEARISH"
    return "NEUTRAL"


def _rows_for(supabase, entity: str, since: str) -> List[Dict[str, Any]]:
    try:
        return (
            supabase.table("entity_mentions")
            .select("sentiment_score,sentiment,published_at")
            .eq("entity_type", "commodity")
            .eq("entity", entity)
            .gte("published_at", since)
            .order("published_at", desc=True)
            .limit(500)
            .execute()
        ).data or []
    except Exception as exc:  # noqa: BLE001
        logger.warning("market sentiment query failed for %s: %s", entity, exc)
        return []


@router.get("/market")
async def get_market_sentiment() -> Dict[str, Any]:
    """Per-commodity and overall sentiment over the last 24h.

    Always answers 200. A commodity with no observations in the window is
    reported with `sample_size: 0` and a null score rather than omitted or
    invented, and an unreachable database yields an empty `commodities` list —
    the mobile client only needs the status code, and a 5xx here would
    resurrect the stale-feed bug described above.
    """
    since = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=_WINDOW_HOURS)).isoformat()

    supabase = None
    try:
        from services._supabase import get_supabase_client
        supabase = get_supabase_client()
    except Exception as exc:  # noqa: BLE001
        logger.warning("market sentiment: no supabase client: %s", exc)

    commodities: List[Dict[str, Any]] = []
    if supabase is not None:
        for entity, display in _TRACKED:
            rows = _rows_for(supabase, entity, since)
            scores = [r["sentiment_score"] for r in rows if r.get("sentiment_score") is not None]
            avg: Optional[float] = round(statistics.fmean(scores), 4) if scores else None
            commodities.append({
                "name": display,
                "commodity": entity,
                "sentiment": _label(avg) if avg is not None else "NEUTRAL",
                # Signed deviation from neutral, on the same scale the legacy
                # payload used for `change`.
                # Deviation from neutral on the signed scale, as a percentage.
                "change": round(avg * 100, 2) if avg is not None else 0.0,
                "confidence": round(min(0.5 + len(scores) / 100.0, 0.95), 2) if scores else 0.0,
                "avg_score": avg,
                "sample_size": len(scores),
            })

    scored = [c for c in commodities if c["sample_size"] > 0]
    bullish = sum(1 for c in scored if c["sentiment"] == "BULLISH")
    bearish = sum(1 for c in scored if c["sentiment"] == "BEARISH")

    if not scored:
        overall, confidence = "NEUTRAL", 0.0
    elif bullish > bearish:
        overall = "BULLISH"
        confidence = round(min(0.65 + (bullish - bearish) * 0.05, 0.95), 2)
    elif bearish > bullish:
        overall = "BEARISH"
        confidence = round(min(0.65 + (bearish - bullish) * 0.05, 0.95), 2)
    else:
        overall, confidence = "NEUTRAL", 0.50

    return {
        "overall": overall,
        "confidence": confidence,
        "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
        "commodities": commodities,
        "window_hours": _WINDOW_HOURS,
        # Named so it is obvious this is measured, not the legacy placeholder.
        "analysis_method": "entity_mentions_24h_mean",
        "data": {c["name"]: c for c in commodities},
    }
