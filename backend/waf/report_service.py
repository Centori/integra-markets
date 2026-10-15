"""Generate, store and publish WAF Weekly Reports. The I/O around waf/report.py."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Sequence

from waf import store
from waf.balance import PRODUCTS, compute_balance
from waf.report import build_report
from waf.sources import is_public_source
from waf.vessels import PortPosition, TankerPosition
from waf.weeks import ReportWeek

logger = logging.getLogger(__name__)

TRAILING_DAYS = 30


def _tankers(rows: Sequence[Dict]) -> List[TankerPosition]:
    fields = TankerPosition.__dataclass_fields__
    return [TankerPosition(**{k: v for k, v in r.items() if k in fields}) for r in rows]


def balances_for(supabase: Any, as_of: datetime, include_restricted: bool) -> Dict[str, Dict]:
    """Balance per product as of `as_of`, from NPA positions and permitted tanker rows."""
    end = as_of.date() + timedelta(days=1)
    window = store.port_positions(supabase, end - timedelta(days=7), end)
    trailing = store.port_positions(supabase, end - timedelta(days=7 + TRAILING_DAYS), end - timedelta(days=7))
    from waf.sources import PPNG_SOURCE

    sources = [s for s in (PPNG_SOURCE,) if include_restricted or is_public_source(s)]
    tankers = _tankers(store.tanker_positions(supabase, as_of - timedelta(days=7), sources))
    return {p: compute_balance(p, as_of.date(), window, trailing, tankers) for p in PRODUCTS}


def generate(supabase: Any, week: ReportWeek) -> Dict:
    """Build and store (unpublished) the report for `week`. Re-running bumps the version."""
    docs, truncated = store.tagged_documents(supabase, week.start, week.cutoff)
    prev_docs, prev_truncated = store.tagged_documents(supabase, week.previous.start, week.previous.cutoff)
    positions = store.port_positions(supabase, week.start.date(), week.cutoff.date() + timedelta(days=1))
    gaps = []
    if truncated or prev_truncated:
        gaps.append("Document read hit its ceiling; sentiment computed on a capped set.")
    if not positions:
        gaps.append("No NPA shipping-position reports parsed this week.")
    # Public report: licence-gated tanker data is excluded until PPNG_LICENSED.
    balances = balances_for(supabase, week.cutoff, include_restricted=False)
    payload = build_report(week, docs, prev_docs, balances, [p.as_row() for p in positions], gaps)
    existing = store.get_report(supabase, week.report_id)
    row = {
        "report_id": week.report_id,
        "week_start": week.start.isoformat(),
        "cutoff": week.cutoff.isoformat(),
        "version": (existing["version"] + 1) if existing else 1,
        "payload": payload,
        "inputs_hash": payload["inputs_hash"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "published_at": existing.get("published_at") if existing else None,
    }
    store.save_report(supabase, row)
    return row


def publish(supabase: Any, report_id: str) -> Dict:
    """Mark published and push to every user with push enabled (in-app card + OTA push)."""
    report = store.get_report(supabase, report_id)
    if report is None:
        raise LookupError(f"{report_id} has not been generated")
    payload = report["payload"]
    push_result = _push(report_id, payload["teaser"])
    store.mark_published(supabase, report_id, datetime.now(timezone.utc), push_result)
    return push_result


def _push(report_id: str, teaser: str) -> Dict:
    try:
        from services.notification_service import (
            NotificationData, NotificationType, Severity, notification_service,
        )
    except Exception as exc:  # noqa: BLE001 — recorded on the report row, not swallowed
        logger.error("waf report %s: notification service unavailable: %s", report_id, exc)
        return {"error": f"notification service unavailable: {exc}"}
    week = report_id.rsplit("-", 1)[-1]
    notification = NotificationData(
        title=f"WAF Weekly Report · {week}",
        body=teaser,
        type=NotificationType.MARKET_ALERT,
        severity=Severity.MEDIUM,
        data={"type": "waf_report", "report_id": report_id, "deep_link": f"integra://waf/report/{report_id}"},
        user_ids=None,
    )
    result = asyncio.run(notification_service.send_notification(notification))
    if result.get("errors"):
        logger.error("waf report %s: push errors: %s", report_id, result["errors"])
    return result
