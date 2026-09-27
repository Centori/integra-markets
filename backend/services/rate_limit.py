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


# ---------------------------------------------------------------------------
# Export budgets
#
# Request metering counts CALLS. One export call can return tens of thousands
# of rows, so call-counting barely constrains it: an api_basic key has 50,000
# calls a month, and at 50,000 rows each that is the entire archive many times
# over. Exports therefore get a second, much smaller budget on a different
# axis — how OFTEN — while the per-call row cap bounds how MUCH.
# ---------------------------------------------------------------------------

# Exports per calendar month, by tier. Absent tiers cannot export at all;
# entitlement.can_export() refuses them before this is ever consulted.
_EXPORT_COUNT_LIMITS: Dict[str, int] = {
    "api_basic":   int(os.environ.get("INTEGRA_EXPORTS_API_BASIC", "100")),
    "api":         int(os.environ.get("INTEGRA_EXPORTS_API", "100")),
    "api_history": int(os.environ.get("INTEGRA_EXPORTS_API_HISTORY", "1000")),
}
_EXPORT_COUNT_FALLBACK = int(os.environ.get("INTEGRA_EXPORTS_UNKNOWN", "10"))

# Rows per export. XLSX is lower than CSV on purpose: CSV streams row by row
# and never holds the result, while a workbook must be finalised as a zip
# before any of it can be sent.
_EXPORT_ROW_LIMITS: Dict[str, int] = {
    "api_basic":   int(os.environ.get("INTEGRA_EXPORT_ROWS_API_BASIC", "50000")),
    "api":         int(os.environ.get("INTEGRA_EXPORT_ROWS_API", "50000")),
    "api_history": int(os.environ.get("INTEGRA_EXPORT_ROWS_API_HISTORY", "500000")),
}
_EXPORT_ROW_FALLBACK = int(os.environ.get("INTEGRA_EXPORT_ROWS_UNKNOWN", "1000"))
_XLSX_ROW_CEILING = int(os.environ.get("INTEGRA_EXPORT_ROWS_XLSX_MAX", "100000"))


def export_rows_limit(tier: Optional[str], fmt: str = "csv") -> int:
    """Maximum rows one export may return."""
    rows = _EXPORT_ROW_LIMITS.get(tier or "", _EXPORT_ROW_FALLBACK)
    if fmt == "xlsx":
        return min(rows, _XLSX_ROW_CEILING)
    return rows


def export_count_limit(tier: Optional[str]) -> int:
    """Maximum export operations per calendar month."""
    return _EXPORT_COUNT_LIMITS.get(tier or "", _EXPORT_COUNT_FALLBACK)


def _fetch_export_count(supabase: Any, key_id: str, since: dt.datetime) -> Optional[int]:
    """Export calls recorded for this key in the period.

    Reads api_key_usage rather than keeping a second ledger: the usage logger
    already records every request's endpoint, so exports are countable by path
    with no extra write on the hot path.
    """
    try:
        resp = (
            supabase.table("api_key_usage")
            .select("id", count="exact")
            .eq("key_id", key_id)
            .like("endpoint", "/v1/export%")
            .gte("ts", since.isoformat())
            .limit(1)
            .execute()
        )
        return None if resp.count is None else int(resp.count)
    except Exception as exc:  # noqa: BLE001
        logger.error("metering: export count failed for key %s: %s", key_id, exc)
        return None


def check_and_consume_export(
    supabase: Any,
    key_id: str,
    tier: Optional[str],
    now: Optional[dt.datetime] = None,
) -> Tuple[bool, Dict[str, Any]]:
    """Budget one export against the key's monthly export allowance.

    Not cached, unlike check_and_consume: exports are rare and expensive, so a
    round-trip is affordable and an exact count is worth more than the saving.
    Fails OPEN for the same reason as request metering.
    """
    now = now or dt.datetime.now(dt.timezone.utc)
    start = period_start(now)
    limit = export_count_limit(tier)

    used = _fetch_export_count(supabase, key_id, start)
    if used is None:
        return True, {
            "limit": limit,
            "remaining": None,
            "reset": period_end(now),
            "degraded": True,
        }

    if used >= limit and ENFORCED:
        return False, {"limit": limit, "remaining": 0, "reset": period_end(now), "used": used}

    return True, {
        "limit": limit,
        "remaining": max(0, limit - used - 1),
        "reset": period_end(now),
        "used": used,
    }


# ---------------------------------------------------------------------------
# Burst limiting (requests per second)
#
# The dashboard advertised "100 req/sec burst" and no per-second limiter existed
# anywhere in this codebase. Monthly metering does not constrain rate at all: a
# key with 50,000 calls left can spend them as fast as the network allows, so
# one loop could saturate the backend for every other customer while remaining
# inside its plan.
#
# WHAT IS ENFORCED, precisely, because the published number has to be a promise
# we keep: a token bucket per (key, process). There is no shared counter —
# Railway runs this image behind a load balancer and no Redis is provisioned —
# so with N replicas a key's true ceiling is N * RATE.
#
# That asymmetry decides which number we publish. We publish the PER-PROCESS
# rate, which is therefore a FLOOR: a key is never refused below it, and may be
# allowed above it when traffic spreads across replicas. Publishing N * RATE
# would be the other way round — a number we could not honour the moment the
# load balancer pinned a client to one replica, which is exactly the shape of
# the bug this replaces.
#
# The bucket also allows a genuine burst: capacity is BURST_CAPACITY_FACTOR
# seconds' worth of tokens, so a client that has been idle can fire a batch of
# parallel requests without being refused, then settles to the sustained rate.
# ---------------------------------------------------------------------------

_BURST_RATES: Dict[str, float] = {
    "api_trial":   float(os.environ.get("INTEGRA_BURST_API_TRIAL", "5")),
    "api_basic":   float(os.environ.get("INTEGRA_BURST_API_BASIC", "25")),
    "api":         float(os.environ.get("INTEGRA_BURST_API", "25")),
    "api_history": float(os.environ.get("INTEGRA_BURST_API_HISTORY", "50")),
}
_BURST_RATE_FALLBACK = float(os.environ.get("INTEGRA_BURST_UNKNOWN", "5"))

# Seconds of allowance a bucket may bank while idle. 2s at 25/s lets an MCP
# client fan out ~50 parallel calls for one question, which is the realistic
# burst shape, without letting an idle key bank a minute's worth.
BURST_CAPACITY_FACTOR = float(os.environ.get("INTEGRA_BURST_CAPACITY_FACTOR", "2"))


def burst_rate_for_tier(tier: Optional[str]) -> float:
    """Sustained requests per second per key. See the module note on replicas."""
    return _BURST_RATES.get(tier or "", _BURST_RATE_FALLBACK)


class _Bucket:
    __slots__ = ("tokens", "updated_at")

    def __init__(self, tokens: float, updated_at: float) -> None:
        self.tokens = tokens
        self.updated_at = updated_at


_buckets: Dict[str, _Bucket] = {}
_bucket_lock = threading.Lock()

# Bound memory. Buckets are keyed by api key id and only created on use, but a
# long-lived process serving many keys would otherwise grow without limit.
_MAX_BUCKETS = int(os.environ.get("INTEGRA_BURST_MAX_BUCKETS", "10000"))


def reset_burst_cache() -> None:
    """Drop all buckets. For tests."""
    with _bucket_lock:
        _buckets.clear()


def check_burst(
    key_id: str,
    tier: Optional[str],
    now: Optional[float] = None,
) -> Tuple[bool, Dict[str, Any]]:
    """Take one token from the key's bucket.

    Returns ``(allowed, info)`` where info carries the rate and the wait in
    seconds until a token is available, for Retry-After.

    Unlike monthly metering this needs no backend, so there is no fail-open
    path — it cannot be degraded by Supabase being unreachable. It is still
    suppressed by INTEGRA_METERING_ENABLED=0 along with the monthly cap, so one
    switch disables all enforcement during an incident.
    """
    rate = burst_rate_for_tier(tier)
    capacity = max(rate * BURST_CAPACITY_FACTOR, 1.0)
    monotonic = now if now is not None else __import__("time").monotonic()

    with _bucket_lock:
        if len(_buckets) > _MAX_BUCKETS:
            _buckets.clear()
        bucket = _buckets.get(key_id)
        if bucket is None:
            # A new bucket starts FULL. Starting empty would refuse the first
            # request a key ever makes, which reads as a broken key.
            bucket = _Bucket(capacity, monotonic)
            _buckets[key_id] = bucket
        else:
            elapsed = max(0.0, monotonic - bucket.updated_at)
            bucket.tokens = min(capacity, bucket.tokens + elapsed * rate)
            bucket.updated_at = monotonic

        if bucket.tokens >= 1.0:
            bucket.tokens -= 1.0
            return True, {"rate": rate, "capacity": capacity, "retry_after": 0.0}

        # Not enough for a whole token: say how long until there is one.
        deficit = 1.0 - bucket.tokens
        wait = deficit / rate if rate > 0 else 1.0

    return False, {"rate": rate, "capacity": capacity, "retry_after": wait}


# ---------------------------------------------------------------------------
# Published plan spec
#
# The dashboard said "100k requests / month, 100 req/sec burst" as hand-typed
# copy while _DEFAULT_LIMITS enforced 50,000/month and nothing enforced a rate
# at all. A paying customer was therefore promised twice the allowance they had
# and would have been refused at 50,000 with no explanation that matched
# anything they had been told.
#
# The fix is structural rather than a corrected string: the numbers a customer
# is shown are READ OUT OF the constants that enforce them, through
# /api/keys/limits. Copy cannot drift from enforcement because nobody types it.
# ---------------------------------------------------------------------------

def plan_spec(tier: Optional[str]) -> Dict[str, Any]:
    """The limits actually enforced for `tier`, for display to its owner."""
    from services.entitlement import export_depth_days, query_depth_days

    def _finite(value: float) -> Optional[float]:
        """inf is not JSON. None means unlimited to every client we ship."""
        return None if value == float("inf") else value

    return {
        "tier": tier or "",
        "requests_per_month": limit_for_tier(tier),
        "requests_per_second": burst_rate_for_tier(tier),
        "burst_capacity": int(max(burst_rate_for_tier(tier) * BURST_CAPACITY_FACTOR, 1)),
        "query_depth_days": _finite(query_depth_days(tier)),
        "export_depth_days": _finite(export_depth_days(tier)),
        "exports_per_month": export_count_limit(tier),
        "export_rows_per_call": export_rows_limit(tier, "csv"),
        "export_rows_per_call_xlsx": export_rows_limit(tier, "xlsx"),
        "enforced": ENFORCED,
    }
