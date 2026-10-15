"""WAF (West Africa) endpoints.

/v1/waf/*   — API-key customers and the MCP server. History depth is tier-gated
              with the same assert_history_depth every other /v1 route uses.
/api/waf/*  — the mobile/web app's weekly report card (Supabase session optional,
              like /api/news/feed).

Redistribution: every row leaving here passes through waf.sources.filter_for_public,
and licence-gated tanker data is excluded from balances until PPNG_LICENSED.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from api.v1_public import _supabase
from services.api_key_auth import assert_history_depth, verify_api_key
from services.supabase_jwt import optional_supabase_jwt
from waf import store
from waf.balance import PRODUCTS
from waf.report import segment_block
from waf.sources import filter_for_public
from waf.weeks import from_report_id

router = APIRouter(prefix="/v1/waf", tags=["waf"])
app_router = APIRouter(prefix="/api/waf", tags=["waf-app"])

_TAG_TYPES = ("country", "grade", "product", "entity", "segment", "topic")
_WINDOWS = {"24h": 1, "7d": 7, "30d": 30, "90d": 90}


def _window_days(window: str) -> int:
    if window not in _WINDOWS:
        raise HTTPException(status_code=400, detail=f"window must be one of {list(_WINDOWS)}")
    return _WINDOWS[window]


def _tag_filter(tag_type: Optional[str], tag: Optional[str]) -> None:
    if tag_type and tag_type not in _TAG_TYPES:
        raise HTTPException(status_code=400, detail=f"tag_type must be one of {list(_TAG_TYPES)}")
    if tag and not tag_type:
        raise HTTPException(status_code=400, detail="tag requires tag_type")


@router.get("/headlines")
async def headlines(
    tag_type: Optional[str] = Query(None, description="country | grade | product | entity | segment | topic"),
    tag: Optional[str] = Query(None, description="e.g. NG, bonny_light, PMS, dangote_refinery, refining, force_majeure"),
    window: str = Query("7d", description="24h, 7d, 30d or 90d"),
    limit: int = Query(50, ge=1, le=200),
    auth: Dict[str, Any] = Depends(verify_api_key),
) -> Dict[str, Any]:
    _tag_filter(tag_type, tag)
    days = _window_days(window)
    assert_history_depth(auth, days)
    end = datetime.now(timezone.utc)
    rows, truncated = store.tagged_documents(_supabase(), end - timedelta(days=days), end, tag_type, tag,
                                             max_rows=limit)
    return {"as_of": end.isoformat(), "window": window, "count": len(rows), "truncated": truncated,
            "items": filter_for_public(rows)}


@router.get("/sentiment")
async def sentiment(
    tag_type: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    window: str = Query("7d"),
    auth: Dict[str, Any] = Depends(verify_api_key),
) -> Dict[str, Any]:
    """Net sentiment (bullish% - bearish%) for a WAF tag, vs the preceding window."""
    _tag_filter(tag_type, tag)
    days = _window_days(window)
    assert_history_depth(auth, 2 * days)
    end = datetime.now(timezone.utc)
    sb = _supabase()
    now, t1 = store.tagged_documents(sb, end - timedelta(days=days), end, tag_type, tag)
    prev, t2 = store.tagged_documents(sb, end - timedelta(days=2 * days), end - timedelta(days=days), tag_type, tag)
    return {"as_of": end.isoformat(), "window": window, "tag_type": tag_type, "tag": tag,
            "truncated": t1 or t2, **segment_block(now, prev),
            "method": "net = bullish share - bearish share, points; active scoring model"}


@router.get("/vessels")
async def vessels(
    days: int = Query(7, ge=1, le=90),
    auth: Dict[str, Any] = Depends(verify_api_key),
) -> Dict[str, Any]:
    assert_history_depth(auth, days)
    end = datetime.now(timezone.utc)
    sb = _supabase()
    positions = store.port_positions(sb, (end - timedelta(days=days)).date(), end.date() + timedelta(days=1))
    from waf.sources import PPNG_SOURCE, is_public_source

    public_tankers = [s for s in (PPNG_SOURCE,) if is_public_source(s)]
    return {
        "as_of": end.isoformat(),
        "npa_port_positions": [p.as_row() for p in positions],
        "tanker_positions": store.tanker_positions(sb, end - timedelta(days=days), public_tankers),
        "notes": "NPA positions are ship COUNTS by status (Lagos ports), not tonnage. "
                 "Receiver-level tanker rows appear only from licensed sources.",
    }


@router.get("/balance")
async def balance(
    product: str = Query("PMS", description="PMS or AGO"),
    auth: Dict[str, Any] = Depends(verify_api_key),
) -> Dict[str, Any]:
    product = product.upper()
    if product not in PRODUCTS:
        raise HTTPException(status_code=400, detail=f"product must be one of {list(PRODUCTS)}")
    assert_history_depth(auth, 37)
    from waf.report_service import balances_for

    return balances_for(_supabase(), datetime.now(timezone.utc), include_restricted=False)[product]


# ------------------------------------------------------------------ weekly report


def _report_or_404(report_id: Optional[str]) -> Dict[str, Any]:
    sb = _supabase()
    if report_id is None:
        rows = store.list_reports(sb, None, None, limit=1)
        if not rows:
            raise HTTPException(status_code=404, detail="no WAF report has been published yet")
        return rows[0]
    try:
        from_report_id(report_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    row = store.get_report(sb, report_id)
    if row is None or not row.get("published_at"):
        raise HTTPException(status_code=404, detail=f"{report_id} is not published")
    return row


def _report_body(row: Dict[str, Any]) -> Dict[str, Any]:
    return row["payload"] | {"version": row["version"], "published_at": row["published_at"]}


@router.get("/report")
async def latest_report(auth: Dict[str, Any] = Depends(verify_api_key)) -> Dict[str, Any]:
    return _report_body(_report_or_404(None))


@router.get("/reports")
async def list_reports(
    weeks: int = Query(12, ge=1, le=104),
    auth: Dict[str, Any] = Depends(verify_api_key),
) -> Dict[str, Any]:
    assert_history_depth(auth, 7 * weeks)
    since = datetime.now(timezone.utc) - timedelta(weeks=weeks)
    rows = store.list_reports(_supabase(), since, None, limit=weeks)
    return {"reports": [{"report_id": r["report_id"], "cutoff": r["cutoff"], "published_at": r["published_at"],
                         "teaser": r["payload"].get("teaser"),
                         "overall": r["payload"]["sentiment"]["overall"]} for r in rows]}


@router.get("/report/sentiment-series")
async def sentiment_series(
    segment: str = Query("overall", description="overall or a segment: crude, pms, ago, lpg, refining, fx_macro, mining"),
    weeks: int = Query(12, ge=1, le=104),
    auth: Dict[str, Any] = Depends(verify_api_key),
) -> Dict[str, Any]:
    assert_history_depth(auth, 7 * weeks)
    since = datetime.now(timezone.utc) - timedelta(weeks=weeks)
    series: List[Dict[str, Any]] = []
    for row in reversed(store.list_reports(_supabase(), since, None, limit=weeks)):
        block = row["payload"]["sentiment"]
        point = block["overall"] if segment == "overall" else block["segments"].get(segment)
        if point is None:
            raise HTTPException(status_code=400, detail=f"unknown segment {segment!r}")
        series.append({"report_id": row["report_id"], "net": point["net"], "articles": point["articles"]})
    return {"segment": segment, "series": series}


@router.get("/report/{report_id}")
async def report_by_id(report_id: str, auth: Dict[str, Any] = Depends(verify_api_key)) -> Dict[str, Any]:
    row = _report_or_404(report_id)
    assert_history_depth(auth, (datetime.now(timezone.utc) - from_report_id(report_id).start).days)
    return _report_body(row)


@router.get("/report/{report_id}/headlines")
async def report_headlines(report_id: str, auth: Dict[str, Any] = Depends(verify_api_key)) -> Dict[str, Any]:
    _report_or_404(report_id)
    week = from_report_id(report_id)
    assert_history_depth(auth, (datetime.now(timezone.utc) - week.start).days)
    rows, truncated = store.tagged_documents(_supabase(), week.start, week.cutoff)
    return {"report_id": report_id, "count": len(rows), "truncated": truncated, "items": filter_for_public(rows)}


# ------------------------------------------------------------------ app card


@app_router.get("/reports/latest")
async def app_latest_report(auth: Optional[Dict[str, Any]] = Depends(optional_supabase_jwt)) -> Dict[str, Any]:
    return _report_body(_report_or_404(None))


@app_router.get("/reports/{report_id}")
async def app_report(report_id: str,
                     auth: Optional[Dict[str, Any]] = Depends(optional_supabase_jwt)) -> Dict[str, Any]:
    return _report_body(_report_or_404(report_id))


@app_router.get("/reports")
async def app_reports(weeks: int = Query(12, ge=1, le=52),
                      auth: Optional[Dict[str, Any]] = Depends(optional_supabase_jwt)) -> Dict[str, Any]:
    since = datetime.now(timezone.utc) - timedelta(weeks=weeks)
    rows = store.list_reports(_supabase(), since, None, limit=weeks)
    return {"reports": [{"report_id": r["report_id"], "cutoff": r["cutoff"],
                         "teaser": r["payload"].get("teaser")} for r in rows]}
