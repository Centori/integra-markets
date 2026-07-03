"""USDA NASS Quick Stats bulk downloads → public.historical_prices.

Public CSVs at https://quickstats.nass.usda.gov/results/... . No auth on the
bulk-download endpoint; the `nassqs` API key is optional and only needed for
programmatic queries.

Usage:
    python -m backend.scripts.backfill.usda_nass
"""

from __future__ import annotations

import argparse
import datetime as dt
import logging

from .common import get_supabase, setup_logging

logger = logging.getLogger("backfill.usda_nass")

SOURCE = "usda_nass"

# TODO: build the bulk-download URL for each of the following surveys and
# ingest as historical_prices rows (frequency='weekly' or 'monthly'):
#   - Wheat: Prices received by farmers, monthly
#   - Corn:  Prices received by farmers, monthly
#   - Soybeans: Prices received by farmers, monthly
#   - Cotton: Prices received by farmers, monthly
#
# Bulk-download URLs look like:
#   https://quickstats.nass.usda.gov/results/<QUERY_HASH>.csv
# Build the query in the web UI, copy the "Get Data" URL, then normalize.


def backfill(supabase, *, since: dt.date | None = None, until: dt.date | None = None) -> int:
    logger.warning("usda_nass backfill not yet implemented — see TODO in file")
    return 0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--since")
    ap.add_argument("--until")
    args = ap.parse_args()
    setup_logging()
    total = backfill(get_supabase())
    print(f"usda_nass: {total} rows")


if __name__ == "__main__":
    main()
