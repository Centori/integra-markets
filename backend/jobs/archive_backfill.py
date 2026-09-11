"""Scheduled archive backfill — fetches history, a little at a time.

The other half of `archive_scorer`
----------------------------------
`archive_scorer` turns `raw_documents` into scored `entity_mentions`, and its
docstring notes that "wayback keeps adding historical documents". It only does
while somebody runs it by hand: every backfill source is a manual CLI,
`railway.toml` declares a single uvicorn service with no cron or worker, and
nothing schedules the fetch. So the scorer drains a backlog that stops being
refilled the moment attention moves elsewhere.

This job is the fetch. Between the two, history arrives and gets scored without
anyone typing a command.

`run_all` was already built for this — `--max-days N` bounds each source, and
the per-host cursor makes a bounded run a checkpoint rather than a partial
failure. What was missing was a caller.

What this deliberately does NOT do
----------------------------------
It does not run everything. Of the eight sources `run_all` knows about, four
(`imf_pcp`, `kalshi`, `polymarket`, `usda_nass`) are unimplemented stubs that
log a warning and return 0 — harmless, but pointless to schedule. Of the rest,
`gdelt` and `wayback` both resume from a cursor and bound their work (wayback's
cursor was fixed on main on 2 Sep); `cftc_cot` resumes by calendar year, and
`worldbank_pink` is a single spreadsheet download that is cheap to repeat.

So the schedule covers the sources where a bounded walk is meaningful, and
`ARCHIVE_BACKFILL_SOURCES` states that explicitly rather than leaving it to be
rediscovered.

Load
----
The budget is small on purpose. GDELT's own module notes it "can saturate the
network for hours", and this runs inside the API process, which answers a
300-second Railway healthcheck. A few days of archive per hour walks years of
history over weeks of wall-clock at negligible sustained load — the right trade
while the app is launching and nobody is waiting on the archive.

If the archive ever needs to catch up faster, the correct move is a separate
Railway service running the same image with `python -m scripts.backfill.run_all`,
not a bigger budget here.

Contract: matches the other jobs (run() -> dict, never raises).
"""

from __future__ import annotations

import datetime as dt
import logging
import os
import threading
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

_running_lock = threading.Lock()

# Sources that both resume from a cursor and bound their work. Everything else
# in run_all is either an unimplemented stub or cheap enough to leave manual.
ARCHIVE_BACKFILL_SOURCES: List[str] = ["gdelt", "wayback"]

# How far back the archive should eventually reach.
ARCHIVE_FLOOR = dt.date.fromisoformat(os.getenv("ARCHIVE_FLOOR_DATE", "2020-01-01"))

# Days of archive per source per tick. Small: see "Load" above.
MAX_DAYS_PER_TICK = int(os.getenv("ARCHIVE_BACKFILL_MAX_DAYS", "3"))

# Set to disable without a redeploy.
DISABLED = os.getenv("INTEGRA_DISABLE_BACKFILL", "").lower() in ("1", "true", "yes")


def run() -> Dict[str, Any]:
    """One tick — advance each schedulable source by a bounded window."""
    if DISABLED:
        return {"skipped": "disabled"}

    if not _running_lock.acquire(blocking=False):
        # A wayback window can outlast the interval on a slow day. Skipping is
        # correct: the cursor means no work is lost by waiting for the next tick.
        logger.info("archive_backfill: previous tick still running, skipping")
        return {"skipped": "still_running"}

    try:
        return _tick()
    except Exception as exc:  # noqa: BLE001 - a broken job must not stop the scheduler
        logger.exception("archive_backfill: tick failed")
        return {"error": str(exc)}
    finally:
        _running_lock.release()


def _tick() -> Dict[str, Any]:
    from services._supabase import get_supabase_client

    supabase = get_supabase_client()
    if supabase is None:
        return {"skipped": "no_supabase_client"}

    # `until` is today: the backward walk stops where the forward ingest starts,
    # so the two never contend for the same window.
    until = dt.datetime.now(dt.timezone.utc).date()

    results: Dict[str, Any] = {}
    for name in ARCHIVE_BACKFILL_SOURCES:
        try:
            fn = _import_backfill(name)
        except Exception as exc:  # noqa: BLE001
            logger.warning("archive_backfill: %s not importable: %s", name, exc)
            results[name] = {"error": str(exc)}
            continue

        try:
            rows = fn(
                supabase,
                since=ARCHIVE_FLOOR,
                until=until,
                max_days=MAX_DAYS_PER_TICK,
            )
            results[name] = {"rows": rows}
            logger.info("archive_backfill: %s ingested %s rows", name, rows)
        except Exception as exc:  # noqa: BLE001
            # One bad source must not stop the others. Its cursor is untouched,
            # so the window is retried next tick rather than skipped.
            logger.warning("archive_backfill: %s failed: %s", name, exc)
            results[name] = {"error": str(exc)}

    return {"sources": results, "max_days": MAX_DAYS_PER_TICK, "until": until.isoformat()}


def _import_backfill(name: str):
    """Import a backfill source by name.

    Relative to the package, not an absolute `backend.scripts...` path: the
    Dockerfile does `COPY backend/ .`, so inside the container the package root
    is `scripts.backfill`. Hardcoding the absolute path works from a repo
    checkout and fails on every scheduled run in Railway -- the same trap
    run_all._import_backfill documents.
    """
    from importlib import import_module

    module = import_module(f"scripts.backfill.{name}")
    return module.backfill
