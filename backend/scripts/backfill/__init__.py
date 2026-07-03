"""Historical archive backfill scripts.

Populates public.historical_events, historical_prices, historical_positioning,
and historical_settled_markets from free public sources with no API keys
required. Powers the API + History tier ($249/mo).

Run via `python -m backend.scripts.backfill.run_all` from the repo root, or
individually per source: `python -m backend.scripts.backfill.gdelt --since 2020-01-01`.

Each source module exports:
    SOURCE: str                       identifier, matches DB `source` column
    def backfill(supabase, *, since, until) -> int
        returns rows ingested; must be idempotent (upsert by natural key)
"""
