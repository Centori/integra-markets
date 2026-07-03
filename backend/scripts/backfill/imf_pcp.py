"""IMF Primary Commodity Prices → public.historical_prices.

Monthly XLSX at https://www.imf.org/en/Research/commodity-prices . Free, no auth.
Used to cross-check World Bank Pink Sheet — the two typically agree within 1-2%.

Usage:
    python -m backend.scripts.backfill.imf_pcp
"""

from __future__ import annotations

import argparse
import datetime as dt
import logging

from .common import get_supabase, setup_logging

logger = logging.getLogger("backfill.imf_pcp")

SOURCE = "imf_pcp"

# TODO: XLSX download URL rotates monthly (URL includes /Files/Publications/...).
# Discovery: scrape https://www.imf.org/en/Research/commodity-prices for the
# latest XLSX link matching "External-Data-*.xlsx" or "PCPS-Historical-*.xlsx",
# then parse similarly to worldbank_pink.py:
#   - Header substrings map to commodities
#   - Date column is either "1990M01" or Excel serial dates
#   - Unit is "usd_per_barrel" for oil, "usd_per_metric_ton" for most metals
#     and grains, "usd_per_kg" for tropicals (coffee/cocoa/sugar/cotton)


def backfill(supabase, *, since: dt.date | None = None, until: dt.date | None = None) -> int:
    logger.warning("imf_pcp backfill not yet implemented — see TODO in file")
    return 0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--since")
    ap.add_argument("--until")
    args = ap.parse_args()
    setup_logging()
    total = backfill(get_supabase())
    print(f"imf_pcp: {total} rows")


if __name__ == "__main__":
    main()
