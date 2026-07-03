"""Shared utilities for backfill scripts."""

from __future__ import annotations

import datetime as dt
import logging
import os
import sys
from pathlib import Path
from typing import Any, Iterable, Optional

logger = logging.getLogger("backfill")


def get_supabase():
    """Returns a Supabase client using the SERVICE ROLE key (RLS bypass).

    Backfill inserts into RLS-protected tables — we must not use the anon key.
    Fails loudly if SUPABASE_SERVICE_ROLE_KEY isn't set rather than silently
    using anon and getting 0-row silent failures.
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for backfill "
            "(SUPABASE_ANON_KEY will silently fail on RLS-protected tables)."
        )
    try:
        from supabase import create_client
    except ImportError:
        raise RuntimeError("supabase-py not installed — run `pip install supabase`")
    return create_client(url, key)


def batch_upsert(
    supabase,
    table: str,
    rows: list[dict[str, Any]],
    *,
    on_conflict: str,
    batch_size: int = 500,
) -> int:
    """Upsert rows in chunks; returns total upserted count."""
    if not rows:
        return 0
    total = 0
    for i in range(0, len(rows), batch_size):
        chunk = rows[i : i + batch_size]
        try:
            supabase.table(table).upsert(chunk, on_conflict=on_conflict).execute()
            total += len(chunk)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "backfill %s: batch %d failed (%d rows): %s",
                table,
                i // batch_size,
                len(chunk),
                exc,
            )
    return total


def read_cursor(supabase, source: str, cursor_kind: str) -> Optional[str]:
    try:
        rows = (
            supabase.table("backfill_cursors")
            .select("cursor_value")
            .eq("source", source)
            .eq("cursor_kind", cursor_kind)
            .limit(1)
            .execute()
            .data
            or []
        )
        return rows[0]["cursor_value"] if rows else None
    except Exception as exc:  # noqa: BLE001
        logger.warning("read_cursor failed for %s/%s: %s", source, cursor_kind, exc)
        return None


def write_cursor(
    supabase,
    source: str,
    cursor_kind: str,
    cursor_value: str,
    rows_ingested: int,
) -> None:
    supabase.table("backfill_cursors").upsert(
        {
            "source": source,
            "cursor_kind": cursor_kind,
            "cursor_value": cursor_value,
            "rows_ingested": rows_ingested,
            "last_run_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        },
        on_conflict="source,cursor_kind",
    ).execute()


def daterange(start: dt.date, end: dt.date) -> Iterable[dt.date]:
    """Yield each date from start (inclusive) to end (exclusive)."""
    d = start
    while d < end:
        yield d
        d += dt.timedelta(days=1)


def parse_iso_date(value: str) -> dt.date:
    return dt.date.fromisoformat(value)


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stderr,
    )
