-- Two changes that make the archive visible and stop the engine erasing itself.
--
-- 1. archive_coverage() — what the archive actually holds.
--
--    The dataset is 386,199 entity mentions across 49 commodities spanning
--    2020-2026. A caller on api_basic can query 30 days of it, which is 0.79%,
--    and nothing anywhere tells them the rest exists. A developer evaluating the
--    product reported in writing that the dataset was "33 days deep" — they were
--    measuring the depth cap, not the data, and had no way to tell the
--    difference.
--
--    Coverage is therefore deliberately NOT clamped by the caller's entitlement.
--    Showing someone a 30-day window without saying it is a window is the bug;
--    telling them the window's size and the archive's size is the fix. Knowing
--    the archive reaches 2020 is not the same as being able to read 2020, and
--    the depth gate still enforces the second.
--
-- 2. sentiment_scores.signals — a column for output that already exists.
--
--    jobs/news_fetcher.py computes contextual drivers for every article
--    ("Chokepoint disruption" bound to the phrase that fired it) and returns
--    them in a dict. No column has ever existed to receive them, so they are
--    dropped at write time on every ingest cycle, and services/feed_store.py
--    falls back to generic keyword nouns without anything reporting a problem.

-- ---------------------------------------------------------------------------
-- Coverage
-- ---------------------------------------------------------------------------

-- `earliest` alone would overstate the product. The true minimum is 2017-03-10,
-- and 2017 holds TWO mentions — a backfill artefact. Publishing "coverage from
-- 2017" on the strength of two rows is the same error as printing a score
-- computed on one article beside one computed on nine hundred, which is the
-- thing this codebase keeps being bitten by.
--
-- So both are returned: `earliest` is the literal minimum, and `dense_from` is
-- the first year that carries at least DENSE_DAY_THRESHOLD active days. Clients
-- should lead with dense_from and may mention earliest; the API descriptions say
-- so. A claim you have to footnote is a claim you should not lead with.
-- Dropped first: `create or replace` cannot change a function's return type, so
-- adding dense_from to the RETURNS TABLE fails with 42P13 against an existing
-- definition. Harmless here — nothing holds a reference to it between the two
-- statements.
drop function if exists public.archive_coverage();

create function public.archive_coverage()
returns table (
    earliest        date,
    dense_from      date,
    latest          date,
    total_mentions  bigint,
    entities        integer,
    active_days     integer
)
language sql
stable
security definer
set search_path = public
as $$
    with per_year as (
        select
            date_trunc('year', published_at)::date  as yr,
            count(distinct published_at::date)      as days
        from public.entity_mentions
        group by 1
    )
    select
        (select min(published_at)::date from public.entity_mentions),
        -- 180 days: a year covered for at least half its days is a year you can
        -- describe as covered. Below that it is a sample, not a series.
        (select min(yr) from per_year where days >= 180),
        (select max(published_at)::date from public.entity_mentions),
        (select count(*) from public.entity_mentions),
        (select count(distinct entity)::integer from public.entity_mentions),
        (select count(distinct published_at::date)::integer from public.entity_mentions);
$$;

comment on function public.archive_coverage() is
    'Archive extent, independent of any caller entitlement. Read by the /v1 '
    'endpoints so a depth-capped caller can still see what exists beyond their '
    'cap. Cached app-side — see services/archive_coverage.py.';

grant execute on function public.archive_coverage() to service_role;


-- ---------------------------------------------------------------------------
-- Signals
-- ---------------------------------------------------------------------------

alter table public.sentiment_scores
    add column if not exists signals jsonb;

comment on column public.sentiment_scores.signals is
    'Contextual drivers from the commodity rulebook: an array of '
    '{driver, phrase, direction, weight}. `driver` names the rule that fired '
    '(e.g. "Chokepoint disruption") and `phrase` quotes the span of source text '
    'that triggered it, so a score can be checked against the article by eye. '
    'Null on rows written before 2026-09-29 and on rows where no rule fired.';

-- Partial: most rows have no signals, and the queries that want them want the
-- ones that do.
create index if not exists idx_sentiment_scores_signals
    on public.sentiment_scores using gin (signals)
    where signals is not null;
