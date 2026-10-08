#!/usr/bin/env python3
"""Attach fired rulebook signals to sentiment_scores rows that predate the column.

    python3 backend/scripts/backfill_signals.py --dry-run
    python3 backend/scripts/backfill_signals.py --limit 5000
    python3 backend/scripts/backfill_signals.py            # everything

Why a backfill rather than a re-score
-------------------------------------
Nothing is being re-judged. The sentiment, the score and the model version stay
exactly as they are — this only writes down the evidence the rulebook already
used, which was computed at ingest and discarded for want of a column. Running
it changes no reading, so it cannot move a number a customer has already seen.

Why it reads titles rather than refetching
------------------------------------------
`raw_documents.title` and `.content` are the text the engine scored in the first
place. Refetching the articles would be slower, would fail for anything since
removed, and would risk scoring different text than the stored score came from.

Idempotent. Rows that already carry signals are skipped, so an interrupted run
resumes by being run again. `--force` re-derives rows that have them, which is
only correct after a rulebook change — and after a rulebook change the scores
themselves are stale too, so prefer a re-score to this.
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from typing import Any, Dict, List

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s")
log = logging.getLogger("backfill_signals")

# PostgREST caps a response at 1,000 rows regardless of what is asked for, so
# the page size is a statement of that rather than a tuning choice.
PAGE = 1000


def _client():
    """Build a client directly from the environment.

    Deliberately NOT services._supabase.get_supabase_client(), which reaches
    into `main` for the client the FastAPI app made. Importing main to run a
    batch job executes the whole application module — torch, the scheduler, every
    router — which is slow, and makes a maintenance script fail for reasons that
    have nothing to do with the maintenance.
    """
    from dotenv import load_dotenv
    from supabase import create_client

    load_dotenv()
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    if not url or not key:
        sys.exit(
            "set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (the service role, "
            "not the anon key — this writes)"
        )
    return create_client(url, key)


def _signals(title: str, content: str, commodity: str | None) -> List[Dict[str, Any]]:
    from services.commodity_sentiment import extract_key_drivers

    text = " ".join(part for part in (title, content) if part).strip()
    if not text:
        return []
    # Fired rules only. The keyword fallback would refill the column with the
    # generic nouns the whole change exists to replace.
    return [
        d for d in extract_key_drivers(text, commodity)
        if d.get("direction") != "context"
    ]


def run(limit: int | None, dry_run: bool, force: bool) -> None:
    supabase = _client()
    seen = written = skipped = 0
    started = time.monotonic()
    offset = 0

    while True:
        if limit is not None and seen >= limit:
            break
        span = PAGE if limit is None else min(PAGE, limit - seen)

        # DELIBERATELY UNORDERED.
        #
        # This had `.order("scored_at", desc=True)`, and ordering a large filtered
        # set is what made the first full pass unusable. Measured with EXPLAIN
        # ANALYZE at ~94,000 rows in: the planner walked the timestamp index from
        # one end and probed for unprocessed rows, discarding everything already
        # done, so 17.4s of a 20.4s query was that single scan — and it lengthened
        # every batch. Throughput fell 138/s -> 52/s and the estimate receded
        # faster than the work completed. Unordered, with the partial index from
        # 20261008_backfill_queue_index.sql, the same query runs in 877ms.
        #
        # Nothing here needs an order. Every row gets the same treatment, and the
        # `signals is null` filter is what advances the window.
        query = (
            supabase.table("sentiment_scores")
            .select("id, document_id, signals, raw_documents(title, content, raw_payload)")
            .range(offset, offset + span - 1)
        )
        if not force:
            query = query.is_("signals", "null")

        rows = (query.execute()).data or []
        if not rows:
            break

        updates: List[Dict[str, Any]] = []
        for row in rows:
            seen += 1
            doc = row.get("raw_documents") or {}
            payload = doc.get("raw_payload") or {}
            commodity = payload.get("commodity") if isinstance(payload, dict) else None
            found = _signals(doc.get("title") or "", doc.get("content") or "", commodity)
            if not found:
                # Written as `[]`, not left NULL. NULL means "not evaluated";
                # `[]` means "evaluated, nothing fired", and conflating them
                # stalls this very loop — the filter below is `signals is null`,
                # so a non-firing row left NULL never leaves the queue and the
                # newest-first ordering returns it on every batch forever.
                skipped += 1
            updates.append({"id": row["id"], "signals": found})

        if updates and not dry_run:
            for update in updates:
                try:
                    (
                        supabase.table("sentiment_scores")
                        .update({"signals": update["signals"]})
                        .eq("id", update["id"])
                        .execute()
                    )
                    written += 1
                except Exception as exc:  # noqa: BLE001
                    log.warning("row %s failed: %s", update["id"], exc)
        elif updates:
            written += len(updates)

        # Every examined row is written now — signals or `[]` — so the filter
        # itself advances the window and the offset only matters under --force,
        # where nothing drops out of it.
        if force:
            offset += span

        rate = seen / max(time.monotonic() - started, 1e-6)
        log.info(
            "%s%d seen · %d with signals · %d without · %.0f rows/s",
            "[dry-run] " if dry_run else "", seen, written, skipped, rate,
        )

        if len(rows) < span:
            break

    log.info(
        "%sdone: %d rows examined, %d given signals, %d had none to give",
        "[dry-run] " if dry_run else "", seen, written, skipped,
    )


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=None, help="stop after N rows")
    ap.add_argument("--dry-run", action="store_true", help="derive but do not write")
    ap.add_argument(
        "--force", action="store_true",
        help="re-derive rows that already have signals (only after a rulebook change)",
    )
    args = ap.parse_args()
    run(args.limit, args.dry_run, args.force)
