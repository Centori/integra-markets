"""WAF Weekly Report scheduler tick (every 5 min).

Friday 17:00 WAT — data cutoff; the report for the week is generated and stored.
Friday 18:00 WAT — the stored report is published: in-app notification card plus
OTA push to every user with push enabled.

Idempotent: generation happens once per week (unless the row is missing), and
publishing once. A report more than PUBLISH_GRACE late is published to the
archive without a push, so a restarted service never sends Monday a "weekly"
alert about last Friday.

Backfill: `python -m jobs.waf_weekly_report --backfill-weeks 104` generates past
weeks from point-in-time data and archives them without pushing.
"""

from __future__ import annotations

import argparse
import logging
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

logger = logging.getLogger(__name__)

_running_lock = threading.Lock()
PUBLISH_GRACE = timedelta(hours=6)
# Generate at 17:40 WAT, not 17:00: an article published at 16:55 may not be
# archived until the next news_fetcher tick, and the cutoff is on published_at.
INGEST_SETTLE = timedelta(minutes=40)


def run(now: datetime | None = None) -> Dict[str, Any] | None:
    if not _running_lock.acquire(blocking=False):
        return {"skipped": "still_running"}
    try:
        from services._supabase import get_supabase_client
        from waf import report_service, store
        from waf.weeks import latest_closed_week

        now = now or datetime.now(timezone.utc)
        supabase = get_supabase_client()
        if supabase is None:
            logger.error("waf_weekly_report: no Supabase client")
            return {"error": "no_supabase_client"}
        week = latest_closed_week(now)
        if now < week.cutoff + INGEST_SETTLE:
            return None  # let the 10-minute news fetcher archive pre-cutoff articles first
        existing = store.get_report(supabase, week.report_id)
        if existing is None:
            existing = report_service.generate(supabase, week)
            logger.info("waf_weekly_report: generated %s v%s", week.report_id, existing["version"])
        if existing.get("published_at") or now < week.publish_at:
            return None  # nothing to do this tick; stays quiet in the log
        if now - week.publish_at > PUBLISH_GRACE:
            store.mark_published(supabase, week.report_id, now, {"skipped_push": "published late"})
            logger.warning("waf_weekly_report: %s published late, push skipped", week.report_id)
            return {"published": week.report_id, "push": "skipped_late"}
        return {"published": week.report_id, "push": report_service.publish(supabase, week.report_id)}
    finally:
        _running_lock.release()


def backfill(weeks: int) -> Dict[str, Any]:
    from services._supabase import get_supabase_client
    from waf import report_service, store
    from waf.weeks import latest_closed_week

    supabase = get_supabase_client()
    week = latest_closed_week(datetime.now(timezone.utc)).previous
    done = []
    for _ in range(weeks):
        row = report_service.generate(supabase, week)
        store.mark_published(supabase, week.report_id, week.publish_at, {"backfill": True})
        done.append((week.report_id, row["payload"]["documents_analysed"]))
        week = week.previous
    return {"backfilled": done}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backfill-weeks", type=int, default=0)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    print(backfill(args.backfill_weeks) if args.backfill_weeks else run())
