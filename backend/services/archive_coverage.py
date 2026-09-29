"""What the archive holds, reported independently of what the caller may read.

The problem
-----------
The dataset is 386,201 entity mentions across 49 commodities, continuously
covered from 2020. A caller on `api_basic` may query 30 days of it — 0.79% —
and until now nothing anywhere said the rest existed. A developer evaluating the
product concluded in writing that the dataset was "33 days deep". They were
measuring the depth cap. There was no way for them to tell the difference, and
that single mistaken figure then drove a strategic review.

Coverage is therefore deliberately NOT clamped by entitlement. Knowing the
archive reaches 2020 is not the same as being able to read 2020, and the depth
gate still enforces the second. What changes is that the window is labelled as a
window.

Honesty of the figure
---------------------
`earliest` is the literal minimum and it is 2017-03-10, on the strength of TWO
mentions — a backfill artefact. Leading with it would overstate the product in
exactly the way this codebase keeps getting bitten by: a number computed on two
rows, printed like one computed on hundreds of thousands. `dense_from` is the
first year carrying at least 180 active days, and it is what clients should
lead with. Both are returned; the API descriptions say which is which.

Failure behaviour
-----------------
Fails SOFT. Coverage is informational — a request that would otherwise succeed
must not 500 because a descriptive field could not be computed. Callers get
`None` and omit the block.
"""

from __future__ import annotations

import datetime as dt
import logging
import os
import threading
import time
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Coverage moves by one day per day. An hour of staleness is invisible to a
# reader and saves a full scan of entity_mentions on every request.
TTL_SECONDS = int(os.environ.get("INTEGRA_COVERAGE_TTL_SECONDS", "3600"))

_cache: Optional[Dict[str, Any]] = None
_cached_at: float = 0.0
_lock = threading.Lock()


def reset_cache() -> None:
    """Drop the cached coverage. For tests."""
    global _cache, _cached_at
    with _lock:
        _cache = None
        _cached_at = 0.0


def _fetch(supabase: Any) -> Optional[Dict[str, Any]]:
    try:
        result = supabase.rpc("archive_coverage", {}).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning("archive_coverage rpc failed: %s", exc)
        return None
    data = getattr(result, "data", None)
    if isinstance(data, list):
        data = data[0] if data else None
    if not isinstance(data, dict):
        logger.warning("archive_coverage returned %s, expected a row", type(data).__name__)
        return None

    # Shape-check the row, not just its type. A dict missing these keys produces
    # a coverage block of all-Nones, which renders as "archive: unknown to
    # unknown, 0 mentions" — strictly worse than omitting the block, and exactly
    # the failure mode ("degraded renders as zero") the usage endpoints were
    # built to avoid.
    required = ("dense_from", "latest", "total_mentions", "entities")
    missing = [k for k in required if k not in data]
    if missing:
        logger.warning("archive_coverage row missing %s — treating as unavailable", missing)
        return None
    return data


def get(supabase: Any) -> Optional[Dict[str, Any]]:
    """Archive extent, cached. None when it cannot be determined."""
    global _cache, _cached_at
    now = time.monotonic()
    with _lock:
        if _cache is not None and (now - _cached_at) < TTL_SECONDS:
            return dict(_cache)

    if supabase is None:
        return None
    fresh = _fetch(supabase)
    if fresh is None:
        return None

    with _lock:
        _cache = fresh
        _cached_at = now
    return dict(fresh)


def describe(supabase: Any, your_depth_days: Optional[float] = None) -> Optional[Dict[str, Any]]:
    """The `coverage` block the /v1 endpoints embed.

    ``your_depth_days`` is the caller's own query cap, echoed back beside the
    archive's extent so the two are never confused. None means unlimited.
    """
    raw = get(supabase)
    if raw is None:
        return None

    block: Dict[str, Any] = {
        # Lead with this one. See the module docstring.
        "continuous_from": raw.get("dense_from"),
        "earliest": raw.get("earliest"),
        "latest": raw.get("latest"),
        "total_mentions": raw.get("total_mentions"),
        "commodities": raw.get("entities"),
        "active_days": raw.get("active_days"),
        "note": (
            "Archive extent, not your entitlement. `continuous_from` is the "
            "first year with at least 180 days of coverage; `earliest` is the "
            "literal oldest record and is sparse before `continuous_from`."
        ),
    }

    if your_depth_days is not None:
        block["your_query_depth_days"] = (
            None if your_depth_days == float("inf") else int(your_depth_days)
        )
        block["you_can_read_from"] = _readable_from(your_depth_days)
    return block


def _readable_from(depth_days: float) -> Optional[str]:
    """The oldest date this caller may actually query."""
    if depth_days == float("inf"):
        return None
    start = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=depth_days)
    return start.date().isoformat()


def earliest_readable_label(supabase: Any) -> Optional[str]:
    """One phrase naming what exists beyond a depth refusal, for the 403.

    Returns None rather than a partial sentence when coverage is unavailable —
    a 403 that trails off mid-claim is worse than one that does not make it.
    """
    raw = get(supabase)
    if raw is None:
        return None
    dense = raw.get("dense_from")
    mentions = raw.get("total_mentions")
    entities = raw.get("entities")
    if not dense:
        return None
    try:
        pretty = f"{int(mentions):,}" if mentions is not None else "the full"
    except (TypeError, ValueError):
        pretty = "the full"
    return (
        f"the archive holds {pretty} scored mentions across {entities} "
        f"commodities with continuous coverage from {dense}"
    )
