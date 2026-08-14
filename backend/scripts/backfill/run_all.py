"""Backfill orchestrator — runs all source scripts sequentially.

Sequential rather than parallel: the free sources rate-limit anonymously
and GDELT alone can saturate the network for hours. Running one-at-a-time
also keeps DB writes serialized so upsert conflicts stay predictable.

Each source is idempotent — re-running picks up from `backfill_cursors`.

Usage:
    python -m backend.scripts.backfill.run_all --since 2020-01-01 --until 2026-07-01
    python -m backend.scripts.backfill.run_all --only gdelt cftc_cot
"""

from __future__ import annotations

import argparse
import datetime as dt
import logging
import traceback

from .common import get_supabase, setup_logging

logger = logging.getLogger("backfill.run_all")

# Ordered by data volume (biggest first — if the process gets killed halfway,
# the smaller sources still get a shot on the next run).
_SOURCES = [
    "gdelt",
    "wayback",         # historical commodity headlines via Internet Archive
    "worldbank_pink",
    "imf_pcp",
    "cftc_cot",
    "kalshi",
    "polymarket",
    "usda_nass",
]


def _import_backfill(name: str):
    """Import a sibling source module by name.

    Relative to THIS package rather than an absolute "backend.scripts..." path:
    the Dockerfile does `COPY backend/ .`, so inside the container the package
    root is `scripts.backfill`, not `backend.scripts.backfill`. Hardcoding the
    absolute path worked from a repo checkout and would have failed on every
    scheduled run in Railway.
    """
    from importlib import import_module

    mod = import_module(f".{name}", package=__package__)
    return mod.backfill


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", required=True, help="ISO date")
    ap.add_argument("--until", required=True, help="ISO date, exclusive")
    ap.add_argument("--only", nargs="+", choices=_SOURCES, help="Restrict to specific sources")
    ap.add_argument("--verbose", action="store_true")
    ap.add_argument(
        "--max-days",
        type=int,
        default=None,
        help="Bound each source to N days of data per invocation. Sources write "
             "their cursor as they go, so a bounded run is a checkpoint: schedule "
             "this repeatedly and it walks the full range without ever running long.",
    )
    args = ap.parse_args()

    setup_logging(args.verbose)
    supabase = get_supabase()

    since = dt.date.fromisoformat(args.since)
    until = dt.date.fromisoformat(args.until)
    sources = args.only if args.only else _SOURCES

    totals: dict[str, int] = {}
    for name in sources:
        logger.info("=== %s ===", name)
        try:
            fn = _import_backfill(name)
            kwargs = {"since": since, "until": until}
            # Only pass max_days to sources that accept it — the light sources
            # (price series, COT, settled markets) fetch a whole range in one
            # small request and have nothing to bound.
            import inspect
            if args.max_days is not None and "max_days" in inspect.signature(fn).parameters:
                kwargs["max_days"] = args.max_days
            n = fn(supabase, **kwargs)
            totals[name] = n
        except Exception as exc:  # noqa: BLE001
            logger.error("%s failed: %s\n%s", name, exc, traceback.format_exc())
            totals[name] = -1

    logger.info("=== summary ===")
    for name, n in totals.items():
        status = "FAILED" if n < 0 else f"{n} rows"
        logger.info("  %-16s %s", name, status)


if __name__ == "__main__":
    main()
