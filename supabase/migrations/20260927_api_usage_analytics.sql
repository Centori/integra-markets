-- Make api_key_usage readable.
--
-- The table has recorded every authenticated request since launch. Nothing has
-- ever read it for display, so the dashboard's Usage tab said "Soon" while the
-- data sat here. Two things stopped a straight PostgREST read:
--
--   * aggregates are disabled on this project (PGRST123), and every useful
--     usage question is a GROUP BY — requests per day, per endpoint, per key;
--   * PostgREST caps a response at 1,000 rows server-side regardless of the
--     client's .limit(), so "fetch the rows and group in Python" silently
--     summarises an arbitrary 1,000 of them. A usage page that under-reports
--     is worse than one that says "Soon".
--
-- So the grouping happens here. Same reasoning as commodities_with_data in
-- 20260924.
--
-- All three functions take user_id as TEXT, not UUID. api_keys.user_id is TEXT
-- while user_subscriptions.user_id is UUID — passing a UUID here would raise
-- 22P02 on the join for exactly the accounts whose id is not a UUID, which is
-- the bug entitlement._looks_like_uuid exists to catch.

-- Error-rate queries filter on status_code, which the existing
-- (key_id, ts desc) index does not cover.
create index if not exists idx_api_key_usage_status
    on public.api_key_usage(key_id, status_code, ts desc)
    where status_code is not null;


-- Per-key totals for a window. One row per key the user owns, INCLUDING keys
-- with no traffic (left join) — "this key has never been used" is a thing a
-- customer needs to see, and an inner join renders it as absence.
create or replace function public.api_usage_by_key(
    p_user_id text,
    p_since   timestamptz
)
returns table (
    key_id       uuid,
    key_name     text,
    key_prefix   text,
    revoked      boolean,
    requests     bigint,
    errors       bigint,
    rate_limited bigint,
    p50_ms       integer,
    p95_ms       integer,
    last_used_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
    select
        k.id,
        k.name,
        k.key_prefix,
        k.revoked_at is not null,
        count(u.id),
        -- 4xx and 5xx both. A customer debugging an integration cares that the
        -- call failed, not which half of the range it failed in.
        count(u.id) filter (where u.status_code >= 400),
        count(u.id) filter (where u.status_code = 429),
        percentile_disc(0.5)  within group (order by u.latency_ms)::integer,
        percentile_disc(0.95) within group (order by u.latency_ms)::integer,
        k.last_used_at
    from public.api_keys k
    left join public.api_key_usage u
           on u.key_id = k.id
          and u.ts >= p_since
    where k.user_id = p_user_id
    group by k.id, k.name, k.key_prefix, k.revoked_at, k.last_used_at
    order by count(u.id) desc, k.created_at desc;
$$;


-- Daily series. Returns a row for every day in the window, including zeros:
-- generate_series on the left so a quiet day is a gap in the chart rather than
-- two bars drawn side by side as though they were consecutive.
create or replace function public.api_usage_daily(
    p_user_id text,
    p_days    integer default 30
)
returns table (
    day      date,
    requests bigint,
    errors   bigint
)
language sql
stable
security definer
set search_path = public
as $$
    with span as (
        select generate_series(
            (timezone('utc', now())::date - (greatest(p_days, 1) - 1)),
            timezone('utc', now())::date,
            interval '1 day'
        )::date as day
    ),
    mine as (
        select id from public.api_keys where user_id = p_user_id
    )
    select
        span.day,
        count(u.id),
        count(u.id) filter (where u.status_code >= 400)
    from span
    left join public.api_key_usage u
           on u.ts::date = span.day
          and u.key_id in (select id from mine)
    group by span.day
    order by span.day;
$$;


-- Endpoint breakdown. Capped at 20 rows: this drives a table a person reads,
-- and the long tail of one-off paths is noise. Ordered by volume so the cap
-- drops the least interesting rows.
create or replace function public.api_usage_by_endpoint(
    p_user_id text,
    p_since   timestamptz
)
returns table (
    endpoint text,
    method   text,
    requests bigint,
    errors   bigint,
    p95_ms   integer
)
language sql
stable
security definer
set search_path = public
as $$
    select
        u.endpoint,
        u.method,
        count(*),
        count(*) filter (where u.status_code >= 400),
        percentile_disc(0.95) within group (order by u.latency_ms)::integer
    from public.api_key_usage u
    join public.api_keys k on k.id = u.key_id
    where k.user_id = p_user_id
      and u.ts >= p_since
    group by u.endpoint, u.method
    order by count(*) desc
    limit 20;
$$;


-- Quota alerts.
--
-- Delivery is a customer-supplied webhook, not email: this backend has no ESP
-- configured (the only push path is Expo, which reaches the mobile app and not
-- the person integrating an API). A webhook is also what an API customer
-- actually wants — it lands in the system that would page them.
--
-- last_notified_period + last_notified_threshold together make the alert fire
-- once per threshold per month rather than on every request past the line.
create table if not exists public.api_usage_alerts (
    user_id                  text primary key,
    enabled                  boolean not null default true,
    -- Percent of the monthly allowance that triggers a notification. Stored as
    -- an array so "warn me at 80 and again at 100" is one row, not two.
    thresholds               integer[] not null default '{80,100}',
    webhook_url              text,
    last_notified_period     date,
    last_notified_threshold  integer,
    created_at               timestamptz not null default timezone('utc', now()),
    updated_at               timestamptz not null default timezone('utc', now())
);

alter table public.api_usage_alerts
    add constraint api_usage_alerts_thresholds_sane
    check (
        array_length(thresholds, 1) between 1 and 4
        and thresholds <@ array[50,75,80,90,100]
    )
    not valid;

alter table public.api_usage_alerts enable row level security;

drop policy if exists api_usage_alerts_own on public.api_usage_alerts;
create policy api_usage_alerts_own on public.api_usage_alerts
    for all using (auth.uid()::text = user_id)
    with check (auth.uid()::text = user_id);

create or replace function public.tg_api_usage_alerts_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists api_usage_alerts_updated_at on public.api_usage_alerts;
create trigger api_usage_alerts_updated_at
    before update on public.api_usage_alerts
    for each row execute function public.tg_api_usage_alerts_updated_at();


-- The backend reads these as the service role. Granting execute to authenticated
-- as well so the functions stay usable from a RLS-scoped client; they are
-- security definer and filter on the p_user_id argument, so grant it only
-- alongside the dashboard's own auth check — the caller passes the id, so an
-- authenticated user COULD pass someone else's. The API route derives p_user_id
-- from the verified JWT and never from input, which is where that is enforced.
grant execute on function public.api_usage_by_key(text, timestamptz)      to service_role;
grant execute on function public.api_usage_daily(text, integer)           to service_role;
grant execute on function public.api_usage_by_endpoint(text, timestamptz) to service_role;
