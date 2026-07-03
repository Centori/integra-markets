-- Historical backfill tables — powers the API + History tier
--
-- Complements the existing archive (raw_documents, sentiment_scores,
-- entity_mentions, daily_asset_sentiment, market_sentiment_overlay).
-- Those cover news + prediction-market snapshots we observe live.
-- These four tables persist the *backfilled* history from free public
-- sources so /v1/historical/* can serve archive queries.
--
-- Sources → tables (see backend/scripts/backfill/):
--   GDELT 2.0                     → historical_events
--   CFTC Commitments of Traders   → historical_positioning
--   Kalshi settled markets        → historical_settled_markets
--   Polymarket subgraph           → historical_settled_markets
--   USDA NASS Quick Stats         → historical_prices  (source='usda_nass')
--   World Bank Pink Sheet         → historical_prices  (source='worldbank_pink')
--   IMF Primary Commodity Prices  → historical_prices  (source='imf_pcp')
--
-- Only api_history-tier subscribers can query these tables via the /v1/
-- endpoints. Tier enforcement lives in FastAPI (services.tier_enforcement)
-- because RLS would require the request to carry the user's JWT — but
-- external API customers authenticate with API keys, not JWTs.

-- =====================================================================
-- historical_prices — daily commodity prices from public sources
-- =====================================================================

create table if not exists public.historical_prices (
    id              bigserial   primary key,
    commodity       text        not null,
    source          text        not null check (source in
                       ('worldbank_pink', 'imf_pcp', 'usda_nass', 'other')),
    observed_on     date        not null,
    price           numeric     not null,
    unit            text,       -- 'usd_per_barrel', 'usd_per_metric_ton', etc.
    frequency       text        not null default 'daily'
                       check (frequency in ('daily', 'weekly', 'monthly', 'quarterly')),
    raw_payload     jsonb,
    ingested_at     timestamptz not null default timezone('utc'::text, now()),
    unique (source, commodity, observed_on)
);

create index if not exists idx_historical_prices_commodity_date
    on public.historical_prices (commodity, observed_on desc);
create index if not exists idx_historical_prices_source_date
    on public.historical_prices (source, observed_on desc);

-- =====================================================================
-- historical_positioning — CFTC COT weekly positioning by commodity
-- =====================================================================

create table if not exists public.historical_positioning (
    id                  bigserial   primary key,
    commodity           text        not null,
    source              text        not null default 'cftc_cot'
                           check (source in ('cftc_cot',)),
    report_date         date        not null,
    trader_category     text        not null,   -- 'managed_money', 'commercial', etc.
    long_positions      bigint      not null default 0,
    short_positions     bigint      not null default 0,
    spread_positions    bigint      not null default 0,
    net_positions       bigint generated always as (long_positions - short_positions) stored,
    raw_payload         jsonb,
    ingested_at         timestamptz not null default timezone('utc'::text, now()),
    unique (source, commodity, report_date, trader_category)
);

create index if not exists idx_historical_positioning_commodity_date
    on public.historical_positioning (commodity, report_date desc);

-- =====================================================================
-- historical_events — GDELT-style structured event archive
-- =====================================================================

create table if not exists public.historical_events (
    id              bigserial   primary key,
    source          text        not null default 'gdelt'
                       check (source in ('gdelt', 'reuters_archive', 'other')),
    event_id        text        not null,
    event_date      date        not null,
    event_type      text,       -- CAMEO code or free-text category
    -- Commodity tags (lower-case) — for fast filtering by asset
    commodity_tags  text[]      not null default '{}',
    actors          text[]      not null default '{}',
    countries       text[]      not null default '{}',
    tone_score      numeric,    -- GDELT tone: -100..+100
    goldstein_score numeric,    -- GDELT goldstein: -10..+10
    mention_count   integer     not null default 1,
    source_url      text,
    headline        text,
    raw_payload     jsonb,
    ingested_at     timestamptz not null default timezone('utc'::text, now()),
    unique (source, event_id)
);

create index if not exists idx_historical_events_event_date
    on public.historical_events (event_date desc);
create index if not exists idx_historical_events_commodity_tags
    on public.historical_events using gin (commodity_tags);
create index if not exists idx_historical_events_source_date
    on public.historical_events (source, event_date desc);

-- =====================================================================
-- historical_settled_markets — resolved Kalshi + Polymarket markets
-- =====================================================================

create table if not exists public.historical_settled_markets (
    id                  bigserial   primary key,
    source              text        not null
                           check (source in ('kalshi', 'polymarket')),
    market_id           text        not null,
    question            text        not null,
    commodity           text,       -- may be null when off-topic
    opened_at           timestamptz,
    settled_at          timestamptz not null,
    settled_price       numeric,    -- final YES price (0..1)
    resolution          text,       -- 'yes', 'no', 'invalid'
    volume_usd          numeric,
    raw_payload         jsonb,
    ingested_at         timestamptz not null default timezone('utc'::text, now()),
    unique (source, market_id)
);

create index if not exists idx_historical_settled_markets_commodity
    on public.historical_settled_markets (commodity, settled_at desc)
    where commodity is not null;
create index if not exists idx_historical_settled_markets_settled_at
    on public.historical_settled_markets (settled_at desc);

-- =====================================================================
-- Backfill progress tracker
-- =====================================================================
-- Lets scripts resume from the last successful cursor if interrupted.
-- One row per (source, cursor_kind) — cursor_kind is usually the
-- name of the paginated field ('published_at', 'report_date', etc.).

create table if not exists public.backfill_cursors (
    source          text        not null,
    cursor_kind     text        not null,
    cursor_value    text        not null,
    rows_ingested   bigint      not null default 0,
    last_run_at     timestamptz not null default timezone('utc'::text, now()),
    primary key (source, cursor_kind)
);

-- =====================================================================
-- Row-level security
-- =====================================================================
-- Historical tables are backfilled by the service role and read by the
-- FastAPI backend under the service role. External API customers never
-- reach these tables through PostgREST — they hit /v1/historical/* which
-- is tier-gated in application code.
--
-- Enable RLS with no policies → default-deny for anon + authed roles.

alter table public.historical_prices             enable row level security;
alter table public.historical_positioning        enable row level security;
alter table public.historical_events             enable row level security;
alter table public.historical_settled_markets    enable row level security;
alter table public.backfill_cursors              enable row level security;
