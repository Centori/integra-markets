"""CFTC Commitments of Traders → public.historical_positioning.

Downloads the annual disaggregated COT reports (TXT, no key) and normalizes
to (commodity, report_date, trader_category, long, short, spread).

Usage:
    python -m backend.scripts.backfill.cftc_cot --years 2018-2026
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import logging
import urllib.request
import zipfile
from typing import Any

from .common import (
    batch_upsert,
    get_supabase,
    read_cursor,
    setup_logging,
    write_cursor,
)

logger = logging.getLogger("backfill.cftc_cot")

SOURCE = "cftc_cot"

# Disaggregated futures-only ZIP archive per year (public, no auth).
# Actual paths: https://www.cftc.gov/files/dea/history/deacot<year>.zip
_ANNUAL_URL = "https://www.cftc.gov/files/dea/history/deacot{year}.zip"

# CFTC uses commodity names in the "Market_and_Exchange_Names" column. Map the
# tokens we care about to our canonical tickers.
_COMMODITY_MAP: dict[str, str] = {
    "CRUDE OIL, LIGHT SWEET": "wti",
    "BRENT CRUDE OIL": "brent",
    "NATURAL GAS": "gas",
    "GOLD": "gold",
    "SILVER": "silver",
    "COPPER": "copper",
    "WHEAT": "wheat",
    "CORN": "corn",
    "SOYBEANS": "soybean",
    "COFFEE C": "coffee",
    "COCOA": "cocoa",
    "SUGAR NO. 11": "sugar",
    "COTTON NO. 2": "cotton",
}


def _download_year(year: int) -> bytes:
    url = _ANNUAL_URL.format(year=year)
    logger.debug("fetching %s", url)
    with urllib.request.urlopen(url, timeout=120) as resp:
        return resp.read()


def _parse_rows(zip_bytes: bytes) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        # ZIP contains a single TXT with fixed-width or CSV — the modern
        # deacot dumps are CSV with header.
        for name in zf.namelist():
            if not name.lower().endswith((".txt", ".csv")):
                continue
            with zf.open(name) as f:
                reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8", errors="replace"))
                for r in reader:
                    parsed = _parse_row(r)
                    if parsed:
                        rows.extend(parsed)
    return rows


def _parse_row(r: dict[str, str]) -> list[dict[str, Any]]:
    market_name = (r.get("Market_and_Exchange_Names") or r.get("Market and Exchange Names") or "").strip()
    commodity = None
    for token, canonical in _COMMODITY_MAP.items():
        if token in market_name.upper():
            commodity = canonical
            break
    if commodity is None:
        return []

    date_str = r.get("Report_Date_as_YYYY-MM-DD") or r.get("As_of_Date_In_Form_YYMMDD") or ""
    try:
        report_date = dt.date.fromisoformat(date_str[:10])
    except ValueError:
        return []

    # Emit one row per trader category we care about.
    categories = [
        ("managed_money", "M_Money_Positions_Long_All", "M_Money_Positions_Short_All", "M_Money_Positions_Spread_All"),
        ("commercial",    "Prod_Merc_Positions_Long_All", "Prod_Merc_Positions_Short_All", None),
        ("swap_dealers",  "Swap_Positions_Long_All", "Swap__Positions_Short_All", "Swap__Positions_Spread_All"),
        ("other_reportable", "Other_Rept_Positions_Long_All", "Other_Rept_Positions_Short_All", "Other_Rept_Positions_Spread_All"),
    ]

    out: list[dict[str, Any]] = []
    for category, long_col, short_col, spread_col in categories:
        long_pos = _safe_int(r.get(long_col))
        short_pos = _safe_int(r.get(short_col))
        spread_pos = _safe_int(r.get(spread_col)) if spread_col else 0
        if long_pos == 0 and short_pos == 0 and spread_pos == 0:
            continue
        out.append(
            {
                "source": SOURCE,
                "commodity": commodity,
                "report_date": report_date.isoformat(),
                "trader_category": category,
                "long_positions": long_pos,
                "short_positions": short_pos,
                "spread_positions": spread_pos,
            }
        )
    return out


def _safe_int(v: str | None) -> int:
    if v is None or v == "":
        return 0
    try:
        return int(float(v.replace(",", "")))
    except (ValueError, AttributeError):
        return 0


def backfill(supabase, *, since: dt.date, until: dt.date) -> int:
    """Backfill CFTC data for each calendar year overlapping [since, until)."""
    cursor = read_cursor(supabase, SOURCE, "year")
    start_year = int(cursor) + 1 if cursor else since.year
    end_year = until.year

    total = 0
    for year in range(start_year, end_year + 1):
        try:
            zip_bytes = _download_year(year)
        except urllib.error.HTTPError as exc:
            logger.warning("cftc_cot %d: HTTP %d, skipping", year, exc.code)
            continue
        except Exception as exc:  # noqa: BLE001
            logger.warning("cftc_cot %d: download failed (%s)", year, exc)
            continue

        rows = _parse_rows(zip_bytes)
        upserted = batch_upsert(
            supabase,
            "historical_positioning",
            rows,
            on_conflict="source,commodity,report_date,trader_category",
        )
        logger.info("cftc_cot %d: %d rows (upserted %d)", year, len(rows), upserted)
        total += upserted
        write_cursor(supabase, SOURCE, "year", str(year), total)
    return total


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", required=True, help="ISO date")
    ap.add_argument("--until", required=True, help="ISO date")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    setup_logging(args.verbose)
    total = backfill(
        get_supabase(),
        since=dt.date.fromisoformat(args.since),
        until=dt.date.fromisoformat(args.until),
    )
    print(f"cftc_cot: {total} positioning rows ingested")


if __name__ == "__main__":
    main()
