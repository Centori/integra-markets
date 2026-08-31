"""Per-key monthly request metering.

Why this exists
---------------
`api_key_usage` has recorded every authenticated request since launch —
endpoint, method, latency, timestamp — and **nothing has ever read it**.
Usage was observable and completely unenforced: one key could issue
unlimited requests, and with `/sentiment/{c}/history` returning up to 1,000
rows a call, the whole archive was extractable by anyone willing to write a
loop.

(`_enforce_key_quota` in api/api_keys.py sounds related but is not — it caps
how many KEYS a user may create, not how many requests they may make.)

Design notes
------------
**Fail open.** A metering backend that cannot count must not take the API
down; a quota is a commercial guard, not a security boundary. Contrast
`entitlement.resolve()`, which fails CLOSED because it answers "may this
person read this at all". Both failures are logged at ERROR.

**Cached counts.** Counting rows on every request would add a third
round-trip to a path that already makes two. The count is read once per
`USAGE_TTL_SECONDS` per key and incremented locally in between, so the cap
can be overshot by at most the requests served inside one TTL window. That
is the right trade for a soft guard: an exactly-correct counter would cost
more than the thing it protects.

**Calendar months, UTC.** Simple to explain in docs, matches how the tier is
billed, and needs no per-key anniversary bookkeeping.
"""

from __future__ import annotations

import datetime as dt
import logging
import os
import threading
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# Requests per calendar month, by tier. Every value is env-overridable so a
# limit can be raised for one customer without a deploy.
#
# api_trial is the open beta: free, and therefore the tier that most needs a
# ceiling. The paid tiers are set well above realistic interactive use — an
# MCP client makes a handful of calls per question, so a heavy human user
# lands around 15k/month.
_DEFAULT_LIMITS: Dict[str, int] = {
    "api_trial":   int(os.environ.get("INTEGRA_LIMIT_API_TRIAL", "2500")),
    "api_basic":   int(os.environ.get("INTEGRA_LIMIT_API_BASIC", "50000")),
    "api":         int(os.environ.get("INTEGRA_LIMIT_API", "50000")),
    "api_history": int(os.environ.get("INTEGRA_LIMIT_API_HISTORY", "250000")),
}

# Tier we do not recognise: treat as the most restrictive real tier rather
# than as unlimited. An unknown tier is a bug, and the safe reading of a bug
# is "give the least", not "give everything".
_FALLBACK_LIMIT = int(os.environ.get("INTEGRA_LIMIT_UNKNOWN", "2500"))

# Set INTEGRA_METERING_ENABLED=0 to disable enforcement without a deploy.
# Counting and headers continue; only the 429 is suppressed.
ENFORCED = os.environ.get("INTEGRA_METERING_ENABLED", "1") not in ("0", "false", "False")

USAGE_TTL_SECONDS = int(os.environ.get("INTEGRA_USAGE_TTL_SECONDS", "60"))


def limit_for_tier(tier: Optional[str]) -> int:
    """Monthly request allowance for `tier`."""
    return _DEFAULT_LIMITS.get(tier or "", _FALLBACK_LIMIT)


def period_start(now: Optional[dt.datetime] = None) -> dt.datetime:
    """Start of the current UTC calendar month."""
    now = now or dt.datetime.now(dt.timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def period_end(now: Optional[dt.datetime] = None) -> dt.datetime:
    """Start of the NEXT UTC calendar month — when the allowance resets."""
    start = period_start(now)
    if start.month == 12:
        return start.replace(year=start.year + 1, month=1)
    return start.replace(month=start.month + 1)


class _Counter:
    __slots__ = ("count", "period", "fetched_at")

    def __init__(self, count: int, period: dt.datetime, fetched_at: float) -> None:
        self.count = count
        self.period = period
        self.fetched_at = fetched_at


_counters: Dict[str, _Counter] = {}
_lock = threading.Lock()


def reset_cache() -> None:
    """Drop cached counts. For tests, and for a manual limit bump."""
    with _lock:
        _counters.clear()


def _fetch_count(supabase: Any, key_id: str, since: dt.datetime) -> Optional[int]:
    """Requests recorded for `key_id` since `since`, or None if uncountable.

    Uses the existing idx_api_key_usage_key_ts index. `count="exact"` with
    head=True asks PostgREST for the count only — no rows cross the wire.
    """
    try:
        resp = (
            supabase.table("api_key_usage")
            .select("id", count="exact")
            .eq("key_id", key_id)
            .gte("ts", since.isoformat())
            .limit(1)
            .execute()
        )
        if resp.count is None:
            return None
        return int(resp.count)
    except Exception as exc:  # noqa: BLE001
        logger.error("metering: usage count failed for key %s: %s", key_id, exc)
        return None


def check_and_consume(
    supabase: Any,
    key_id: str,
    tier: Optional[str],
    now: Optional[dt.datetime] = None,
) -> Tuple[bool, Dict[str, Any]]:
    """Record one request against the key's monthly allowance.

    Returns ``(allowed, info)``. `info` always carries limit/remaining/reset
    so the caller can emit rate-limit headers on success as well as failure.

    Never raises: a metering failure returns allowed=True.
    """
    now = now or dt.datetime.now(dt.timezone.utc)
    start = period_start(now)
    limit = limit_for_tier(tier)
    monotonic = __import__("time").monotonic()

    with _lock:
        entry = _counters.get(key_id)
        stale = (
            entry is None
            or entry.period != start                      # month rolled over
            or (monotonic - entry.fetched_at) > USAGE_TTL_SECONDS
        )

    if stale:
        counted = _fetch_count(supabase, key_id, start)
        if counted is None:
            # Cannot count — allow, and say so loudly. See module docstring.
            return True, {
                "limit": limit,
                "remaining": None,
                "reset": period_end(now),
                "degraded": True,
            }
        with _lock:
            _counters[key_id] = _Counter(counted, start, monotonic)
            current = counted
    else:
        with _lock:
            current = _counters[key_id].count

    if current >= limit and ENFORCED:
        return False, {
            "limit": limit,
            "remaining": 0,
            "reset": period_end(now),
            "used": current,
        }

    # Consume locally. The authoritative row is written by the usage logger;
    # this keeps the in-memory view moving between refreshes.
    with _lock:
        entry = _counters.get(key_id)
        if entry is not None and entry.period == start:
            entry.count += 1
            current = entry.count

    return True, {
        "limit": limit,
        "remaining": max(0, limit - current),
        "reset": period_end(now),
        "used": current,
    }


def rate_limit_headers(info: Dict[str, Any]) -> Dict[str, str]:
    """Standard-shaped headers so SDK users can self-throttle."""
    reset: dt.datetime = info.get("reset") or period_end()
    headers = {
        "X-RateLimit-Limit": str(info.get("limit", "")),
        "X-RateLimit-Reset": str(int(reset.timestamp())),
    }
    remaining = info.get("remaining")
    if remaining is not None:
        headers["X-RateLimit-Remaining"] = str(remaining)
    return headers


def retry_after_seconds(info: Dict[str, Any], now: Optional[dt.datetime] = None) -> int:
    """Seconds until the allowance resets, floored at 1."""
    now = now or dt.datetime.now(dt.timezone.utc)
    reset: dt.datetime = info.get("reset") or period_end(now)
    return max(1, int((reset - now).total_seconds()))
