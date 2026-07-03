"""Kalshi settled markets → public.historical_settled_markets.

Uses the public /markets endpoint (no auth) with status=settled filter.
Paginates by settled_at.

Usage:
    python -m backend.scripts.backfill.kalshi --since 2023-01-01
"""

from __future__ import annotations

import argparse
import datetime as dt
import logging

from .common import get_supabase, setup_logging

logger = logging.getLogger("backfill.kalshi")

SOURCE = "kalshi"

# TODO: pull existing internal Kalshi client from backend/api/kalshi.py and
# call /trade-api/v2/markets?status=settled repeatedly, normalising each
# market payload to the historical_settled_markets row shape.
#
# Fields to map:
#   market_id          → ticker
#   question           → title
#   commodity          → derive from event_ticker or series_ticker prefix
#   opened_at          → open_time
#   settled_at         → close_time / expiration_time
#   settled_price      → result (0.0 or 1.0)
#   resolution         → result_type
#   volume_usd         → volume_24h summed over lifetime or last snapshot


def backfill(supabase, *, since: dt.date, until: dt.date) -> int:
    logger.warning("kalshi backfill not yet implemented — see TODO in file")
    return 0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", required=True)
    ap.add_argument("--until", required=True)
    args = ap.parse_args()
    setup_logging()
    total = backfill(
        get_supabase(),
        since=dt.date.fromisoformat(args.since),
        until=dt.date.fromisoformat(args.until),
    )
    print(f"kalshi: {total} rows")


if __name__ == "__main__":
    main()
