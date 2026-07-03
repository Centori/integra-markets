"""GDELT 2.0 events → public.historical_events.

Downloads the daily events CSV zips from GDELT's open bucket and filters to
rows with commodity-relevant CAMEO codes or headline keywords. Free, no key.

Usage:
    python -m backend.scripts.backfill.gdelt --since 2020-01-01 --until 2020-02-01
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import logging
import re
import urllib.request
import zipfile
from typing import Any, Iterable

from .common import (
    batch_upsert,
    daterange,
    get_supabase,
    parse_iso_date,
    read_cursor,
    setup_logging,
    write_cursor,
)

logger = logging.getLogger("backfill.gdelt")

SOURCE = "gdelt"

# GDELT 2.0 daily rollup: one zip per day at 00:00:00.
# Alternative granularity (every 15 min) exists but daily is enough for archive.
_DAILY_URL = "http://data.gdeltproject.org/gdeltv2/{yyyymmdd}000000.export.CSV.zip"

# Commodity keyword → canonical tag. Matches against Actor names + SOURCEURL.
# Deliberately broad — false positives can be filtered downstream by analog
# similarity scoring; false negatives are harder to recover from.
_COMMODITY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "oil":     ("oil", "crude", "brent", "wti", "opec"),
    "brent":   ("brent",),
    "wti":     ("wti", "west texas"),
    "gas":     ("natural gas", "lng", "henry hub"),
    "gold":    ("gold", "bullion"),
    "silver":  ("silver",),
    "copper":  ("copper",),
    "wheat":   ("wheat",),
    "corn":    ("corn", "maize"),
    "soybean": ("soybean", "soybeans"),
    "coffee":  ("coffee",),
    "cocoa":   ("cocoa",),
    "sugar":   ("sugar",),
    "cotton":  ("cotton",),
}

# CAMEO event codes we care about: economic, production, sanctions, supply
# disruption. See https://www.gdeltproject.org/data.html#eventcodes for the
# full taxonomy — filtering on these first cuts the daily 300k rows to ~5k.
_RELEVANT_CAMEO_PREFIXES = ("07", "08", "09", "10", "13", "14", "15", "17", "18", "19", "20")


def _download_day(day: dt.date) -> bytes:
    url = _DAILY_URL.format(yyyymmdd=day.strftime("%Y%m%d"))
    logger.debug("fetching %s", url)
    with urllib.request.urlopen(url, timeout=60) as resp:
        return resp.read()


def _extract_rows(zip_bytes: bytes) -> Iterable[list[str]]:
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        name = zf.namelist()[0]
        with zf.open(name) as f:
            reader = csv.reader(io.TextIOWrapper(f, encoding="utf-8", errors="replace"), delimiter="\t")
            for row in reader:
                yield row


def _tag_commodities(text: str) -> list[str]:
    text_lc = text.lower()
    tags: list[str] = []
    for canonical, keywords in _COMMODITY_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lc:
                tags.append(canonical)
                break
    return tags


def _parse_gdelt_row(row: list[str]) -> dict[str, Any] | None:
    """GDELT 2.0 event schema — 61 columns. Return dict for our table or None."""
    if len(row) < 61:
        return None
    try:
        global_event_id = row[0]
        sql_date = row[1]  # YYYYMMDD
        event_code = row[26]
        actor1_name = row[6] or ""
        actor2_name = row[16] or ""
        actor1_country = row[7] or ""
        actor2_country = row[17] or ""
        goldstein = _safe_float(row[30])
        num_mentions = int(row[31] or 0)
        tone = _safe_float(row[34])
        source_url = row[60] or ""
    except (IndexError, ValueError):
        return None

    if not event_code.startswith(_RELEVANT_CAMEO_PREFIXES):
        return None

    joined_text = " ".join([actor1_name, actor2_name, source_url])
    tags = _tag_commodities(joined_text)
    if not tags:
        return None

    try:
        event_date = dt.datetime.strptime(sql_date, "%Y%m%d").date()
    except ValueError:
        return None

    actors = [a for a in (actor1_name, actor2_name) if a]
    countries = [c for c in (actor1_country, actor2_country) if c]

    return {
        "source": SOURCE,
        "event_id": global_event_id,
        "event_date": event_date.isoformat(),
        "event_type": event_code,
        "commodity_tags": tags,
        "actors": actors,
        "countries": countries,
        "tone_score": tone,
        "goldstein_score": goldstein,
        "mention_count": num_mentions,
        "source_url": source_url,
        "headline": None,  # GDELT events don't ship a headline column
    }


def _safe_float(s: str | None) -> float | None:
    if s is None or s == "":
        return None
    try:
        return float(s)
    except ValueError:
        return None


def backfill(supabase, *, since: dt.date, until: dt.date) -> int:
    """Backfill events between [since, until). Resumes from cursor if newer."""
    cursor_iso = read_cursor(supabase, SOURCE, "event_date")
    if cursor_iso:
        cursor_date = parse_iso_date(cursor_iso)
        if cursor_date > since:
            logger.info("resuming from cursor %s (later than --since %s)", cursor_date, since)
            since = cursor_date

    total = 0
    for day in daterange(since, until):
        try:
            zip_bytes = _download_day(day)
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                logger.info("gdelt %s: no export yet (404), skipping", day)
                continue
            logger.warning("gdelt %s: HTTP %d, skipping", day, exc.code)
            continue
        except Exception as exc:  # noqa: BLE001
            logger.warning("gdelt %s: download failed (%s), skipping", day, exc)
            continue

        rows: list[dict[str, Any]] = []
        for raw in _extract_rows(zip_bytes):
            parsed = _parse_gdelt_row(raw)
            if parsed is not None:
                rows.append(parsed)

        upserted = batch_upsert(
            supabase, "historical_events", rows, on_conflict="source,event_id"
        )
        logger.info("gdelt %s: %d relevant events (upserted %d)", day, len(rows), upserted)
        total += upserted
        write_cursor(supabase, SOURCE, "event_date", day.isoformat(), total)
    return total


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", required=True, help="ISO date, inclusive")
    ap.add_argument("--until", required=True, help="ISO date, exclusive")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    setup_logging(args.verbose)
    supabase = get_supabase()
    total = backfill(
        supabase,
        since=parse_iso_date(args.since),
        until=parse_iso_date(args.until),
    )
    print(f"gdelt: {total} events ingested")


if __name__ == "__main__":
    main()
