"""Wayback Machine → public.raw_documents historical headline ingester.

Walks the Internet Archive CDX API for a curated set of commodity news sites,
enumerates the snapshots per host, fetches each snapshot HTML, extracts the
headline, and upserts into raw_documents so the existing sentiment pipeline
picks it up on the next scoring pass.

Why this exists: our seven public-data sources (GDELT, CFTC, World Bank etc.)
give us tone signals + prices + positioning, but no *headlines*. RSS feeds
only surface the last ~100 items, which doesn't backfill deep history.
Wayback fills the "real, attributed commodity headlines back to ~2015" gap.

Usage:
    python -m backend.scripts.backfill.wayback --since 2020-01-01 --until 2026-07-01
    python -m backend.scripts.backfill.wayback --only oilprice.com --since 2023-01-01

Rate limits: Internet Archive is generous but not infinite. Default ~1 req/sec.
Respect their servers — do not parallelize aggressively.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import logging
import re
import time
import urllib.parse
import urllib.request
from typing import Any, Iterable, Optional

from .common import batch_upsert, get_supabase, setup_logging, write_cursor

logger = logging.getLogger("backfill.wayback")

SOURCE = "wayback"

# Curated list of commodity/energy news hosts. `path_prefix` restricts CDX
# enumeration to article-shaped URLs so we don't waste calls on nav pages.
_HOSTS: list[dict[str, Any]] = [
    {
        "host":        "oilprice.com",
        "path_prefix": "oilprice.com/Energy/",
        "source_name": "OilPrice.com (archive)",
        "category":    "energy",
    },
    {
        "host":        "rigzone.com",
        "path_prefix": "rigzone.com/news/",
        "source_name": "Rigzone (archive)",
        "category":    "oil_gas_operations",
    },
    {
        "host":        "hellenicshippingnews.com",
        "path_prefix": "hellenicshippingnews.com/",
        "source_name": "Hellenic Shipping News (archive)",
        "category":    "shipping",
    },
    {
        "host":        "mining.com",
        "path_prefix": "mining.com/",
        "source_name": "Mining.com (archive)",
        "category":    "mining",
    },
    {
        "host":        "kitco.com",
        "path_prefix": "kitco.com/news/",
        "source_name": "Kitco (archive)",
        "category":    "metals",
    },
    {
        "host":        "naturalgasintel.com",
        "path_prefix": "naturalgasintel.com/",
        "source_name": "NGI (archive)",
        "category":    "natural_gas",
    },
]

# CDX API — enumerates snapshots for a URL prefix.
# See https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server
_CDX_URL = "http://web.archive.org/cdx/search/cdx"

# Snapshot fetch — HTML at a specific timestamp. `id_` = original HTML (no
# Wayback banner injection), which makes the headline extractor much simpler.
_SNAPSHOT_URL = "http://web.archive.org/web/{timestamp}id_/{url}"

# Politeness delay between snapshot fetches. Wayback tolerates faster but is
# not our infra to abuse.
_DELAY_SECONDS = 1.1


def _cdx_query(host_config: dict[str, Any], since: dt.date, until: dt.date) -> Iterable[tuple[str, str]]:
    """Yield (timestamp, original_url) for each snapshot in [since, until)."""
    params = {
        "url":            f"{host_config['path_prefix']}*",
        "from":           since.strftime("%Y%m%d"),
        "to":             until.strftime("%Y%m%d"),
        "output":         "json",
        "filter":         "statuscode:200",
        "collapse":       "urlkey",   # one snapshot per unique URL
        "fl":             "timestamp,original",
        "limit":          "5000",     # per-host cap; adjust once we validate
    }
    query = urllib.parse.urlencode(params)
    url = f"{_CDX_URL}?{query}"

    try:
        with urllib.request.urlopen(url, timeout=90) as resp:
            data = json.load(resp)
    except Exception as exc:  # noqa: BLE001
        logger.warning("cdx query failed for %s: %s", host_config["host"], exc)
        return

    # First row is the header; skip it.
    for row in data[1:]:
        try:
            ts, original = row[0], row[1]
        except (IndexError, TypeError):
            continue
        yield ts, original


def _fetch_snapshot(timestamp: str, original_url: str) -> Optional[str]:
    fetch_url = _SNAPSHOT_URL.format(timestamp=timestamp, url=original_url)
    try:
        with urllib.request.urlopen(fetch_url, timeout=45) as resp:
            raw = resp.read()
    except Exception as exc:  # noqa: BLE001
        logger.debug("snapshot fetch failed %s: %s", fetch_url, exc)
        return None
    try:
        return raw.decode("utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        return None


# Minimal, dependency-free HTML → headline extractor. Trafilatura would be
# stronger but adds a 3MB dep with dozens of transitive requirements.
# Order matters: og:title is authoritative when present.
_TITLE_PATTERNS = [
    re.compile(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', re.I),
    re.compile(r'<meta[^>]+name=["\']twitter:title["\'][^>]+content=["\']([^"\']+)["\']', re.I),
    re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:title["\']', re.I),
    re.compile(r'<h1[^>]*>(.*?)</h1>', re.I | re.DOTALL),
    re.compile(r'<title[^>]*>(.*?)</title>', re.I | re.DOTALL),
]

_META_DESCRIPTION = re.compile(
    r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']', re.I
)


def _extract_headline_and_summary(html: str) -> tuple[Optional[str], Optional[str]]:
    if not html:
        return None, None
    headline: Optional[str] = None
    for pattern in _TITLE_PATTERNS:
        m = pattern.search(html)
        if m:
            headline = _clean_text(m.group(1))
            if headline:
                break

    summary: Optional[str] = None
    m = _META_DESCRIPTION.search(html)
    if m:
        summary = _clean_text(m.group(1))

    return headline, summary


def _clean_text(s: str) -> str:
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    # Strip common site-suffix noise ("| OilPrice.com", "- Rigzone", etc.)
    s = re.sub(r"\s*[\|\-–—]\s*(OilPrice\.com|Rigzone|Mining\.com|Hellenic Shipping News|Kitco News|Natural Gas Intelligence)\s*$", "", s, flags=re.I)
    return s


def _url_hash(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


def _timestamp_to_datetime(ts: str) -> Optional[dt.datetime]:
    try:
        return dt.datetime.strptime(ts[:14], "%Y%m%d%H%M%S").replace(tzinfo=dt.timezone.utc)
    except ValueError:
        return None


def _backfill_host(supabase, host_config: dict[str, Any], *, since: dt.date, until: dt.date, cap: int) -> int:
    logger.info("wayback %s: enumerating snapshots %s → %s", host_config["host"], since, until)
    rows: list[dict[str, Any]] = []
    fetched = 0
    skipped_empty = 0

    for ts, original_url in _cdx_query(host_config, since, until):
        if fetched >= cap:
            logger.info("wayback %s: hit --cap %d, stopping", host_config["host"], cap)
            break

        published = _timestamp_to_datetime(ts)
        if published is None:
            continue

        html = _fetch_snapshot(ts, original_url)
        fetched += 1
        time.sleep(_DELAY_SECONDS)

        headline, summary = _extract_headline_and_summary(html or "")
        if not headline:
            skipped_empty += 1
            continue

        rows.append(
            {
                "source":       host_config["source_name"],
                "source_type":  "news",
                "url":          original_url,
                "url_hash":     _url_hash(original_url),
                "title":        headline,
                "content":      summary,   # summary is our best available snippet
                "raw_payload":  {
                    "wayback_timestamp": ts,
                    "wayback_url":       _SNAPSHOT_URL.format(timestamp=ts, url=original_url),
                    "category":          host_config["category"],
                },
                "published_at": published.isoformat(),
            }
        )

        # Flush periodically so an interrupted run still commits progress
        if len(rows) >= 100:
            upserted = batch_upsert(supabase, "raw_documents", rows, on_conflict="source,url_hash")
            logger.info("wayback %s: flushed %d docs", host_config["host"], upserted)
            rows = []

    if rows:
        upserted = batch_upsert(supabase, "raw_documents", rows, on_conflict="source,url_hash")
        logger.info("wayback %s: flushed %d docs (final)", host_config["host"], upserted)

    logger.info(
        "wayback %s: %d snapshots fetched, %d skipped (no headline)",
        host_config["host"], fetched, skipped_empty,
    )
    return fetched - skipped_empty


def backfill(
    supabase,
    *,
    since: dt.date,
    until: dt.date,
    only: Optional[list[str]] = None,
    cap_per_host: int = 2000,
) -> int:
    """Walk each configured host's Wayback archive. Idempotent via url_hash."""
    total = 0
    for host_config in _HOSTS:
        if only and host_config["host"] not in only:
            continue
        try:
            total += _backfill_host(supabase, host_config, since=since, until=until, cap=cap_per_host)
        except Exception as exc:  # noqa: BLE001
            logger.error("wayback %s failed: %s", host_config["host"], exc)
        write_cursor(supabase, SOURCE, host_config["host"], until.isoformat(), total)
    return total


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", required=True, help="ISO date, inclusive")
    ap.add_argument("--until", required=True, help="ISO date, exclusive")
    ap.add_argument("--only", nargs="+", help="Restrict to specific hosts (e.g. oilprice.com)")
    ap.add_argument("--cap-per-host", type=int, default=2000, help="Max snapshots per host per run")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    setup_logging(args.verbose)
    total = backfill(
        get_supabase(),
        since=dt.date.fromisoformat(args.since),
        until=dt.date.fromisoformat(args.until),
        only=args.only,
        cap_per_host=args.cap_per_host,
    )
    print(f"wayback: {total} headlines ingested")


if __name__ == "__main__":
    main()
