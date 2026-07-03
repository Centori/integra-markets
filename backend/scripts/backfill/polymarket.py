"""Polymarket resolved markets → public.historical_settled_markets.

Uses the Polymarket subgraph (public GraphQL, no auth).

Usage:
    python -m backend.scripts.backfill.polymarket --since 2023-01-01
"""

from __future__ import annotations

import argparse
import datetime as dt
import logging

from .common import get_supabase, setup_logging

logger = logging.getLogger("backfill.polymarket")

SOURCE = "polymarket"

# TODO: subgraph endpoint (as of 2026-07):
# https://api.thegraph.com/subgraphs/name/polymarket/matic-markets
# Query for `fpmms` where closed=true. Batch by closedTime desc, paginate
# 100 at a time via `_meta.block.number` cursors.
#
# Map:
#   market_id      → id
#   question       → question
#   commodity      → tag scan on question/description → _COMMODITY_KEYWORDS
#                    (share with gdelt.py — extract to common.py first)
#   opened_at      → creationTimestamp
#   settled_at     → closedTime
#   settled_price  → outcomeToken YES final price
#   resolution     → 'yes' | 'no' | 'invalid'
#   volume_usd     → tradesQuantity * outcomeToken price avg (or scaledCollateralVolume)


def backfill(supabase, *, since: dt.date, until: dt.date) -> int:
    logger.warning("polymarket backfill not yet implemented — see TODO in file")
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
    print(f"polymarket: {total} rows")


if __name__ == "__main__":
    main()
