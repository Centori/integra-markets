"""Public /v1/* endpoints shaped for external API customers and the MCP server.

These wrap internal analytics into the response shapes documented in
mcp/integra-mcp/src/tools/*.ts. Existing /v1/sentiment/{commodity}/{now,history,
daily} and /v1/markets/{divergence,overlay} routes stay as-is; this module fills
in the query-parameter forms the MCP tools call and the composite /v1/brief.

All routes require `Authorization: Bearer <api_key>` and are tier-gated. The
90-day rolling window for api_basic vs full archive for api_history is enforced
via `services.tier_enforcement.clamp_hours_back`.
"""

from __future__ import annotations

import datetime as dt
import logging
import statistics
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from services.api_key_auth import verify_api_key
from services.tier_enforcement import (
    can_query_historical,
    clamp_hours_back,
    get_effective_tier,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["public-v1"])


_WINDOW_TO_HOURS = {"24h": 24, "7d": 168, "30d": 720, "90d": 2160}


def _supabase():
    from services._supabase import get_supabase_client

    sb = get_supabase_client()
    if sb is None:
        raise HTTPException(status_code=503, detail="archive backend unavailable")
    return sb


def _tier_for(auth: Dict[str, Any]) -> str:
    """Resolve the calling API key's owner tier."""
    user_id = auth.get("user_id")
    if not user_id:
        return "free_trial"
    return get_effective_tier(_supabase(), user_id)


def _label_for(score: Optional[float]) -> str:
    if score is None:
        return "neutral"
    if score > 0.15:
        return "bullish"
    if score < -0.15:
        return "bearish"
    return "neutral"


# ---------------------------------------------------------------------------
# GET /v1/sentiment?commodity=&window=
# ---------------------------------------------------------------------------


@router.get("/sentiment")
async def sentiment(
    commodity: str = Query(..., description="Commodity ticker, e.g. 'brent'"),
    window: str = Query("7d", description="One of 24h, 7d, 30d, 90d"),
    auth: Dict[str, Any] = Depends(verify_api_key),
) -> Dict[str, Any]:
    if window not in _WINDOW_TO_HOURS:
        raise HTTPException(status_code=400, detail=f"window must be one of {list(_WINDOW_TO_HOURS)}")

    tier = _tier_for(auth)
    hours = clamp_hours_back(tier, _WINDOW_TO_HOURS[window])
    supabase = _supabase()
    commodity_lc = commodity.strip().lower()
    since = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=hours)).isoformat()

    try:
        rows = (
            supabase.table("entity_mentions")
            .select("document_id, sentiment, score, extracted_at, source, headline, url")
            .eq("entity", commodity_lc)
            .gte("extracted_at", since)
            .order("extracted_at", desc=True)
            .limit(1000)
            .execute()
        ).data or []
    except Exception as exc:  # noqa: BLE001
        logger.warning("v1_public.sentiment query failed: %s", exc)
        rows = []

    scores = [r["score"] for r in rows if r.get("score") is not None]
    avg = round(statistics.fmean(scores), 4) if scores else 0.0
    # Top drivers = highest |sentiment| headlines, deduped by URL.
    seen: set[str] = set()
    top: List[Dict[str, Any]] = []
    for r in sorted(rows, key=lambda r: abs(r.get("score") or 0), reverse=True):
        url = r.get("url") or r.get("document_id") or ""
        if url in seen:
            continue
        seen.add(url)
        top.append(
            {
                "headline": r.get("headline") or "(no headline)",
                "source": r.get("source") or "unknown",
                "sentiment": round(r.get("score") or 0.0, 4),
                "url": r.get("url") or "",
            }
        )
        if len(top) >= 10:
            break

    return {
        "commodity": commodity_lc,
        "window": window,
        "score": avg,
        "label": _label_for(avg),
        "articles_analyzed": len(scores),
        "updated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "top_drivers": top,
    }


# ---------------------------------------------------------------------------
# GET /v1/narratives?commodity=&lookback=
# ---------------------------------------------------------------------------


@router.get("/narratives")
async def narratives(
    commodity: str = Query(..., description="Commodity ticker"),
    lookback: str = Query("7d", description="One of 24h, 7d, 30d"),
    auth: Dict[str, Any] = Depends(verify_api_key),
) -> Dict[str, Any]:
    """Emerging themes derived from clustering recent article headlines.

    Beta shape: groups articles by shared keyword stems in the headline and
    returns the top clusters with average sentiment. A dedicated topic-model
    service will replace this stem-clustering approach once we have training
    data volume to justify it.
    """
    if lookback not in ("24h", "7d", "30d"):
        raise HTTPException(status_code=400, detail="lookback must be 24h, 7d, or 30d")

    tier = _tier_for(auth)
    hours = clamp_hours_back(tier, _WINDOW_TO_HOURS[lookback])
    supabase = _supabase()
    commodity_lc = commodity.strip().lower()
    since = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=hours)).isoformat()

    try:
        rows = (
            supabase.table("entity_mentions")
            .select("headline, score, extracted_at, source")
            .eq("entity", commodity_lc)
            .gte("extracted_at", since)
            .limit(500)
            .execute()
        ).data or []
    except Exception as exc:  # noqa: BLE001
        logger.warning("v1_public.narratives query failed: %s", exc)
        rows = []

    themes = _cluster_headlines(rows)
    return {
        "commodity": commodity_lc,
        "lookback": lookback,
        "narratives": themes[:8],
    }


_STOPWORDS = {
    "the", "a", "an", "of", "for", "to", "in", "on", "and", "or", "at",
    "by", "is", "as", "with", "from", "up", "down", "over", "under",
    "into", "out", "new", "says", "said", "amid", "after", "before",
    "vs", "us", "will", "may", "can", "could", "should", "would",
}


def _stem(word: str) -> str:
    """Very naive stem: lowercase, strip punctuation, chop trailing 's'/'ing'/'ed'."""
    w = "".join(c for c in word.lower() if c.isalpha())
    for suffix in ("ings", "ing", "ed", "es", "s"):
        if len(w) > 4 and w.endswith(suffix):
            return w[: -len(suffix)]
    return w


def _cluster_headlines(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    from collections import defaultdict

    buckets: Dict[str, Dict[str, Any]] = defaultdict(
        lambda: {"headlines": [], "scores": [], "first_seen": None}
    )
    for r in rows:
        headline = (r.get("headline") or "").strip()
        if not headline:
            continue
        # Take the two most-distinctive non-stopword stems as a bucket key.
        stems = [
            _stem(w)
            for w in headline.split()
            if _stem(w) and _stem(w) not in _STOPWORDS and len(_stem(w)) > 3
        ]
        if len(stems) < 2:
            continue
        key = " · ".join(sorted(stems[:2]))
        bucket = buckets[key]
        bucket["headlines"].append(headline)
        if r.get("score") is not None:
            bucket["scores"].append(r["score"])
        seen_at = r.get("extracted_at")
        if seen_at and (bucket["first_seen"] is None or seen_at < bucket["first_seen"]):
            bucket["first_seen"] = seen_at

    results: List[Dict[str, Any]] = []
    for theme, data in buckets.items():
        if len(data["headlines"]) < 2:
            continue
        avg = round(statistics.fmean(data["scores"]), 4) if data["scores"] else 0.0
        results.append(
            {
                "theme": theme,
                "article_count": len(data["headlines"]),
                "avg_sentiment": avg,
                "trend": "stable",  # a real trend needs comparison to the prior window; punting to v1.1
                "first_seen": data["first_seen"] or "",
                "sample_headlines": data["headlines"][:3],
            }
        )

    results.sort(key=lambda x: x["article_count"], reverse=True)
    return results


# ---------------------------------------------------------------------------
# GET /v1/brief?commodity=
# ---------------------------------------------------------------------------


@router.get("/brief")
async def brief(
    commodity: str = Query(..., description="Commodity ticker"),
    auth: Dict[str, Any] = Depends(verify_api_key),
) -> Dict[str, Any]:
    """Composite briefing: 7d + 30d sentiment, top narratives, key divergences.

    Composed from the same underlying data as the individual endpoints — one
    request instead of four so the MCP client can pull a full snapshot for
    Claude with minimum roundtrips.
    """
    tier = _tier_for(auth)
    supabase = _supabase()
    commodity_lc = commodity.strip().lower()

    now = dt.datetime.now(dt.timezone.utc)
    since_7d = (now - dt.timedelta(days=7)).isoformat()
    since_14d = (now - dt.timedelta(days=14)).isoformat()
    hours_30d = clamp_hours_back(tier, 720)
    since_30d = (now - dt.timedelta(hours=hours_30d)).isoformat()

    def _scores_between(start: str, end: Optional[str] = None) -> List[float]:
        q = (
            supabase.table("entity_mentions")
            .select("score")
            .eq("entity", commodity_lc)
            .gte("extracted_at", start)
        )
        if end:
            q = q.lte("extracted_at", end)
        try:
            data = q.limit(2000).execute().data or []
        except Exception as exc:  # noqa: BLE001
            logger.warning("v1_public.brief query failed: %s", exc)
            return []
        return [r["score"] for r in data if r.get("score") is not None]

    scores_7d = _scores_between(since_7d)
    scores_prior_7d = _scores_between(since_14d, since_7d)
    scores_30d = _scores_between(since_30d)

    score_7d = round(statistics.fmean(scores_7d), 4) if scores_7d else 0.0
    score_30d = round(statistics.fmean(scores_30d), 4) if scores_30d else 0.0
    score_prior = round(statistics.fmean(scores_prior_7d), 4) if scores_prior_7d else 0.0

    # Top narratives — reuse the internal clusterer
    try:
        narrative_rows = (
            supabase.table("entity_mentions")
            .select("headline, score, extracted_at, source")
            .eq("entity", commodity_lc)
            .gte("extracted_at", since_7d)
            .limit(500)
            .execute()
        ).data or []
    except Exception:  # noqa: BLE001
        narrative_rows = []

    top_narratives = [
        {
            "theme": n["theme"],
            "sentiment": n["avg_sentiment"],
            "article_count": n["article_count"],
        }
        for n in _cluster_headlines(narrative_rows)[:5]
    ]

    # Key divergences — pull from any recent divergence signals for this commodity
    try:
        div_rows = (
            supabase.table("market_divergences")
            .select("question, market_implied_prob, ai_implied_prob, divergence")
            .eq("commodity", commodity_lc)
            .order("divergence", desc=True)
            .limit(3)
            .execute()
        ).data or []
    except Exception:  # noqa: BLE001
        div_rows = []

    return {
        "commodity": commodity_lc,
        "generated_at": now.isoformat(),
        "sentiment": {
            "score_7d": score_7d,
            "score_30d": score_30d,
            "label": _label_for(score_7d),
            "delta_vs_prior_week": round(score_7d - score_prior, 4),
        },
        "top_narratives": top_narratives,
        "key_divergences": div_rows,
        # `price_context` is populated by a downstream call to the market_data
        # service when available. Omitted here to keep this endpoint fast; MCP
        # client is expected to render "n/a" when the key is missing.
    }


# ---------------------------------------------------------------------------
# GET /v1/historical/analogs  (api_history tier only)
# ---------------------------------------------------------------------------


@router.get("/historical/analogs")
async def historical_analogs(
    commodity: str = Query(...),
    event: str = Query(..., description="Free-text description of the current setup"),
    n: int = Query(5, ge=1, le=10),
    auth: Dict[str, Any] = Depends(verify_api_key),
) -> Dict[str, Any]:
    tier = _tier_for(auth)
    if not can_query_historical(tier):
        raise HTTPException(
            status_code=403,
            detail="Historical analogs require the API + History tier. "
            "Upgrade at https://dashboard.integramarkets.app/api-tier",
        )
    # Actual analog search lands in Session 2c once the backfill tables are
    # populated. Returning an explicit 501 rather than a fake response so the
    # MCP layer can show an accurate "coming soon" message pre-launch.
    raise HTTPException(
        status_code=501,
        detail="Historical archive backfill in progress. Endpoint activates once "
        "backend/scripts/backfill/run_all.py completes.",
    )
