"""Bulk export — CSV and XLSX.

`entitlement.can_export()` and `_EXPORT_TIERS` have existed since the
entitlement circuit landed and were called from nowhere: scaffolding waiting
for this endpoint. This is the feature they were shaped for, and export is
deliberately the paid tiers' lever — the open beta (`api_trial`) can read the
API all month and cannot bulk-export a single row.

Why export needs its own limits
-------------------------------
Request metering counts CALLS. An export is one call that can return tens of
thousands of rows, so request metering alone barely constrains it: an
`api_basic` key has 50,000 calls a month, and at 50,000 rows each that is
every row Integra will ever hold, many times over.

So exports are bounded twice, on different axes:

  * rows per export      — how much one call can take
  * exports per month    — how often that can be done

Both on top of the normal depth gate, which still applies: a non-archive key
exporting is still capped at HISTORY_DEPTH_CAP_DAYS of history.

Format notes
------------
CSV streams. Rows are generated and yielded, so a large export never sits in
memory in full.

XLSX cannot stream in the same way — the format is a zip archive whose central
directory is written last — but xlsxwriter's `constant_memory` mode flushes
each row to a temp file instead of holding the sheet, which keeps peak memory
flat. It is still the heavier path, so its row cap is lower.
"""

from __future__ import annotations

import csv
import datetime as dt
import io
import logging
import os
from typing import Any, Dict, Iterator, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from services.api_key_auth import assert_history_depth, require_scopes
from services.entitlement import HISTORY_SCOPE
from services.rate_limit import (
    check_and_consume_export,
    export_rows_limit,
    rate_limit_headers,
    retry_after_seconds,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/export", tags=["export"])

# Page size for reading out of PostgREST. Not the user-facing cap — the
# endpoint pages until it reaches the row limit or runs out of data.
_PAGE = int(os.environ.get("INTEGRA_EXPORT_PAGE_SIZE", "1000"))

_COLUMNS = [
    "published_at",
    "commodity",
    "sentiment",
    "score",
    "confidence",
    "document_id",
    "published_at_precision",
]


def _supabase():
    from services._supabase import get_supabase_client

    client = get_supabase_client()
    if client is None:
        raise HTTPException(status_code=503, detail="data backend unavailable")
    return client


def _parse_iso(value: str, label: str) -> dt.datetime:
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail=f"'{label}' must be ISO 8601")
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed


def _iter_rows(
    supabase: Any,
    commodity: str,
    start: dt.datetime,
    end: dt.datetime,
    max_rows: int,
) -> Iterator[Dict[str, Any]]:
    """Page through entity_mentions, oldest first, up to `max_rows`.

    Ordered ascending so a truncated export is a contiguous period from the
    start of the range rather than an arbitrary slice — a user who hits the
    cap gets "the first N days", which they can reason about and resume from.
    """
    fetched = 0
    offset = 0
    while fetched < max_rows:
        want = min(_PAGE, max_rows - fetched)
        try:
            page = (
                supabase.table("entity_mentions")
                .select("document_id, entity, sentiment, score, confidence, published_at")
                .eq("entity", commodity)
                .gte("published_at", start.isoformat())
                .lte("published_at", end.isoformat())
                .order("published_at", desc=False)
                .range(offset, offset + want - 1)
                .execute()
            ).data or []
        except Exception as exc:  # noqa: BLE001
            logger.error("export: page fetch failed at offset %d: %s", offset, exc)
            return
        if not page:
            return
        for row in page:
            yield row
        fetched += len(page)
        offset += len(page)
        if len(page) < want:
            return


def _row_values(row: Dict[str, Any]) -> List[Any]:
    return [
        row.get("published_at"),
        row.get("entity"),
        row.get("sentiment"),
        row.get("score"),
        row.get("confidence"),
        row.get("document_id"),
        # Surfaced per row on purpose. Roughly 87% of the archive is dated by
        # Internet Archive CRAWL time rather than publication time, and an
        # exported spreadsheet outlives any caveat written in the docs.
        row.get("published_at_precision", "crawl_estimate"),
    ]


def _csv_stream(rows: Iterator[Dict[str, Any]]) -> Iterator[str]:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(_COLUMNS)
    yield buf.getvalue()
    buf.seek(0), buf.truncate(0)

    for row in rows:
        writer.writerow(_row_values(row))
        yield buf.getvalue()
        buf.seek(0), buf.truncate(0)


def _xlsx_bytes(rows: Iterator[Dict[str, Any]]) -> bytes:
    try:
        import xlsxwriter  # type: ignore
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="XLSX export is unavailable on this deployment; use format=csv",
        )

    out = io.BytesIO()
    # constant_memory flushes each row to a temp file rather than holding the
    # whole sheet, so peak memory stays flat regardless of row count.
    workbook = xlsxwriter.Workbook(out, {"constant_memory": True, "in_memory": True})
    sheet = workbook.add_worksheet("sentiment")
    header = workbook.add_format({"bold": True})
    for col, name in enumerate(_COLUMNS):
        sheet.write(0, col, name, header)
    for r, row in enumerate(rows, start=1):
        for c, value in enumerate(_row_values(row)):
            sheet.write(r, c, value)
    workbook.close()
    return out.getvalue()


@router.get("/sentiment")
async def export_sentiment(
    commodity: str = Query(..., description="Commodity or topic key, e.g. crude_oil"),
    from_: Optional[str] = Query(default=None, alias="from", description="ISO 8601 UTC"),
    to: Optional[str] = Query(default=None, description="ISO 8601 UTC"),
    format: str = Query(default="csv", pattern="^(csv|xlsx)$"),
    auth: Dict[str, Any] = Depends(require_scopes(HISTORY_SCOPE)),
):
    """Bulk-export scored sentiment rows as CSV or XLSX."""
    ent = auth.get("_entitlement")
    tier = auth.get("_tier")

    # Gate 1 — the paid lever. Read access all month; export is what you buy.
    if ent is None or not ent.can_export():
        raise HTTPException(
            status_code=403,
            detail=(
                f"bulk export is not included in the {tier or 'current'} plan. "
                "The API can still be queried normally. Add export at "
                "https://dashboard.integramarkets.app/api-tier"
            ),
        )

    commodity_lc = commodity.strip().lower()
    end = _parse_iso(to, "to") if to else dt.datetime.now(dt.timezone.utc)
    start = _parse_iso(from_, "from") if from_ else end - dt.timedelta(days=30)
    if start >= end:
        raise HTTPException(status_code=400, detail="'from' must be earlier than 'to'")

    # Gate 2 — depth, measured from now to the OLDEST point requested, exactly
    # as the history endpoints do. Exporting must not be a way around the cap.
    now = dt.datetime.now(dt.timezone.utc)
    assert_history_depth(auth, (now - start).total_seconds() / 86400.0)

    # Gate 3 — how OFTEN. Request metering counts calls and barely constrains
    # a call that returns 50,000 rows, so exports carry their own monthly
    # budget on top of it.
    allowed, meter = check_and_consume_export(_supabase(), auth["id"], tier)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=(
                f"monthly export limit reached for the {tier} plan "
                f"({meter.get('limit')} exports). Normal API queries are "
                f"unaffected. Resets at the start of next month (UTC)."
            ),
            headers={
                **rate_limit_headers(meter),
                "Retry-After": str(retry_after_seconds(meter)),
            },
        )

    # Gate 4 — how MUCH per call.
    max_rows = export_rows_limit(tier, format)
    rows = _iter_rows(_supabase(), commodity_lc, start, end, max_rows)

    stamp = now.strftime("%Y%m%d")
    base = f"integra_{commodity_lc}_{stamp}"
    headers = {
        "Content-Disposition": f'attachment; filename="{base}.{format}"',
        "X-Integra-Row-Limit": str(max_rows),
        "X-Integra-Range-From": start.isoformat(),
        "X-Integra-Range-To": end.isoformat(),
    }

    if format == "xlsx":
        payload = _xlsx_bytes(rows)
        return StreamingResponse(
            iter([payload]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers,
        )

    return StreamingResponse(_csv_stream(rows), media_type="text/csv", headers=headers)
