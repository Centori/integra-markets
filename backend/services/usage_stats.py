"""Read api_key_usage for display to the key's owner.

Every number the dashboard's Usage tab shows comes from here. Three properties
matter more than the queries themselves:

**It is read through RPCs, not PostgREST selects.** Aggregates are disabled on
this project and PostgREST caps a response at 1,000 rows server-side, so
"select the rows and group them in Python" produces a summary of an arbitrary
1,000 requests and looks exactly like a correct answer. See the migration
20260927_api_usage_analytics.sql.

**A failure is reported, not rendered as zero.** A usage page that shows 0
requests because the RPC errored tells the customer their integration is dead.
Each section carries its own ``available`` flag and the page says "couldn't
load" for that section only.

**The period matches the one that is enforced.** Usage is counted against UTC
calendar months in services/rate_limit; showing a rolling 30 days beside a
"remaining" figure derived from calendar months would make the two disagree by
design, and the customer would be right to trust neither.
"""

from __future__ import annotations

import datetime as dt
import logging
from typing import Any, Dict, List, Optional

from services.rate_limit import (
    limit_for_tier,
    period_end,
    period_start,
    plan_spec,
)

logger = logging.getLogger(__name__)

# Days of history the daily chart covers. Longer than a month on purpose: a
# chart that resets to one bar on the 1st of the month is useless for spotting
# a change in usage, which is the question the chart is actually asked.
DAILY_WINDOW_DAYS = 30


def _rpc(supabase: Any, name: str, params: Dict[str, Any]) -> Optional[List[Dict[str, Any]]]:
    """Call an RPC, returning None (not []) when it could not be called.

    The distinction is the whole point: [] means "no usage", None means "we do
    not know". They render differently.
    """
    try:
        result = supabase.rpc(name, params).execute()
    except Exception as exc:  # noqa: BLE001
        logger.error("usage_stats: rpc %s failed: %s", name, exc)
        return None
    data = getattr(result, "data", None)
    if data is None:
        logger.error("usage_stats: rpc %s returned no data attribute", name)
        return None
    if not isinstance(data, list):
        logger.error("usage_stats: rpc %s returned %s, expected list", name, type(data).__name__)
        return None
    return data


def _int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def summarise(
    supabase: Any,
    user_id: str,
    tier: Optional[str],
    now: Optional[dt.datetime] = None,
) -> Dict[str, Any]:
    """Everything the Usage page renders, in one round of RPCs."""
    now = now or dt.datetime.now(dt.timezone.utc)
    start = period_start(now)
    end = period_end(now)
    limit = limit_for_tier(tier)

    by_key = _rpc(supabase, "api_usage_by_key", {
        "p_user_id": user_id,
        "p_since": start.isoformat(),
    })
    daily = _rpc(supabase, "api_usage_daily", {
        "p_user_id": user_id,
        "p_days": DAILY_WINDOW_DAYS,
    })
    endpoints = _rpc(supabase, "api_usage_by_endpoint", {
        "p_user_id": user_id,
        "p_since": start.isoformat(),
    })

    # The period total is summed from the per-key rows rather than counted
    # separately, so the headline figure and the table can never disagree —
    # which is the first thing a customer checks when they doubt the number.
    used: Optional[int] = None
    errors: Optional[int] = None
    throttled: Optional[int] = None
    if by_key is not None:
        used = sum(_int(r.get("requests")) for r in by_key)
        errors = sum(_int(r.get("errors")) for r in by_key)
        throttled = sum(_int(r.get("rate_limited")) for r in by_key)

    return {
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "label": start.strftime("%B %Y"),
        },
        "plan": plan_spec(tier),
        "current": {
            "available": used is not None,
            "requests": used,
            "errors": errors,
            "rate_limited": throttled,
            "limit": limit,
            # Clamped at 0 rather than allowed to go negative: the cached
            # counter in rate_limit can overshoot the cap by up to one TTL
            # window, and a customer does not need to see "-3 remaining".
            "remaining": None if used is None else max(0, limit - used),
            "percent_used": None if used is None or limit <= 0
                            else round(min(100.0, used / limit * 100), 1),
            "error_rate": None if not used else round(errors / used * 100, 2),
        },
        "by_key": {
            "available": by_key is not None,
            "rows": [
                {
                    "key_id": r.get("key_id"),
                    "name": r.get("key_name"),
                    "prefix": r.get("key_prefix"),
                    "revoked": bool(r.get("revoked")),
                    "requests": _int(r.get("requests")),
                    "errors": _int(r.get("errors")),
                    "rate_limited": _int(r.get("rate_limited")),
                    "p50_ms": r.get("p50_ms"),
                    "p95_ms": r.get("p95_ms"),
                    "last_used_at": r.get("last_used_at"),
                }
                for r in (by_key or [])
            ],
        },
        "daily": {
            "available": daily is not None,
            "window_days": DAILY_WINDOW_DAYS,
            "rows": [
                {
                    "day": str(r.get("day")),
                    "requests": _int(r.get("requests")),
                    "errors": _int(r.get("errors")),
                }
                for r in (daily or [])
            ],
        },
        "by_endpoint": {
            "available": endpoints is not None,
            "rows": [
                {
                    "endpoint": r.get("endpoint"),
                    "method": r.get("method"),
                    "requests": _int(r.get("requests")),
                    "errors": _int(r.get("errors")),
                    "p95_ms": r.get("p95_ms"),
                }
                for r in (endpoints or [])
            ],
        },
    }
