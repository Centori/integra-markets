"""APScheduler-style cron orchestrator using stdlib threading.

Avoids adding apscheduler as a dependency for v1. Each job is a
plain `run()` callable; the scheduler runs them on independent
intervals in daemon threads and logs failures without crashing the
process.

Attached at FastAPI app startup in main.py.
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Callable, Dict, Optional

logger = logging.getLogger(__name__)


class _SchedulerThread(threading.Thread):
    def __init__(self, name: str, fn: Callable[[], None], interval_s: int):
        super().__init__(daemon=True, name=f"scheduler-{name}")
        self._fn = fn
        self._interval_s = interval_s
        self._stop_event = threading.Event()
        self._job_name = name

    def stop(self) -> None:
        self._stop_event.set()

    def run(self) -> None:  # noqa: D401
        logger.info("scheduler: %s starting, interval=%ss", self._job_name, self._interval_s)
        while not self._stop_event.is_set():
            try:
                result = self._fn()
                if result is not None:
                    logger.info("scheduler: %s tick ok: %s", self._job_name, result)
            except Exception as exc:  # noqa: BLE001
                logger.exception("scheduler: %s tick raised: %s", self._job_name, exc)
            # Sleep in 1-second slices so stop() is responsive.
            for _ in range(self._interval_s):
                if self._stop_event.is_set():
                    return
                time.sleep(1)


_threads: Dict[str, _SchedulerThread] = {}


def start_all() -> None:
    """Spawn all jobs. Idempotent — safe to call once from app startup."""
    if _threads:
        return
    try:
        from jobs import archive_scorer, divergence_monitor, news_fetcher, pipeline_health
    except ImportError as exc:
        logger.warning("scheduler: jobs not importable: %s", exc)
        return

    # News fetcher every 10 min — keeps the archive populated and the
    # divergence detector fed with fresh sentiment data.
    t1 = _SchedulerThread("news_fetcher", news_fetcher.run, interval_s=600)
    t1.start()
    _threads["news_fetcher"] = t1

    # Divergence monitor every 10 min — slight offset would be nicer
    # but stagger isn't critical at this cadence.
    t2 = _SchedulerThread("divergence_monitor", divergence_monitor.run, interval_s=600)
    t2.start()
    _threads["divergence_monitor"] = t2

    # Data-freshness check every 15 min. The other two jobs report "tick ok"
    # even when their writes are being rejected downstream, so this one
    # asserts that data actually LANDED: entity_mentions and raw_documents are
    # recent, the feed still spans >1 source, and summaries aren't all
    # title-echoes. Logs at ERROR when any of that stops being true.
    t3 = _SchedulerThread("pipeline_health", pipeline_health.run, interval_s=900)
    t3.start()
    _threads["pipeline_health"] = t3

    # Archive scorer every 10 min. The backfill sources write raw_documents but
    # nothing ever turned them into entity_mentions, so 11,385 collected
    # documents — 9,176 of them published before 2025 — were invisible to every
    # sentiment-history endpoint. This job drains that backlog oldest-first and
    # then keeps pace with whatever wayback adds.
    #
    # Runs at the same cadence as news_fetcher rather than faster: it is
    # CPU-bound and shares a container with the API, and the backlog is
    # measured in hours, not minutes.
    t4 = _SchedulerThread("archive_scorer", archive_scorer.run, interval_s=600)
    t4.start()
    _threads["archive_scorer"] = t4

    # Archive backfill every hour — the other half of archive_scorer.
    #
    # archive_scorer turns raw_documents into scored entity_mentions, and its
    # docstring notes that "wayback keeps adding historical documents". It only
    # does while somebody runs it by hand: every backfill source is a CLI, and
    # nothing schedules the fetch. So the scorer drains a backlog that stops
    # being refilled the moment attention moves on.
    #
    # This job fetches. Hourly, and only a few days of archive per source per
    # tick: it shares a container with the API behind a 300s Railway
    # healthcheck, and GDELT's own module notes it can saturate the network for
    # hours. The per-host cursor makes every bounded run a checkpoint, so slow
    # costs nothing but wall-clock. Disable with INTEGRA_DISABLE_BACKFILL=true.
    try:
        from jobs import archive_backfill
    except ImportError as exc:
        logger.warning("scheduler: archive_backfill not importable: %s", exc)
    else:
        t5 = _SchedulerThread("archive_backfill", archive_backfill.run, interval_s=3600)
        t5.start()
        _threads["archive_backfill"] = t5


def stop_all() -> None:
    for t in _threads.values():
        t.stop()
    _threads.clear()
