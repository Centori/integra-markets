-- Per-user subscription state.
-- Truth is RevenueCat's for iOS/Android and Stripe's for the web API tier.
-- This table is a mirror so the FastAPI backend can gate endpoints without
-- calling the payment provider on every request. Kept in sync via webhooks
-- (/api/subscriptions/webhook for RevenueCat, /api/stripe/webhook for Stripe).

create table if not exists public.user_subscriptions (
    user_id                     uuid        primary key
                                    references auth.users(id) on delete cascade,
    tier                        text        not null default 'free_trial'
                                    check (tier in
                                        ('free_trial', 'basic', 'basic_markets', 'api', 'expired')),
    source                      text        not null default 'revenuecat'
                                    check (source in ('revenuecat', 'stripe', 'manual', 'none')),
    revenuecat_user_id          text,
    stripe_customer_id          text,
    trial_ends_at               timestamptz,
    period_ends_at              timestamptz,
    -- Original purchase timestamp; used to distinguish "never paid" from "cancelled".
    first_purchase_at           timestamptz,
    last_synced_at              timestamptz not null default now(),
    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now()
);

create index if not exists idx_user_subscriptions_tier
    on public.user_subscriptions (tier);
create index if not exists idx_user_subscriptions_period_ends_at
    on public.user_subscriptions (period_ends_at)
    where period_ends_at is not null;
create index if not exists idx_user_subscriptions_revenuecat
    on public.user_subscriptions (revenuecat_user_id)
    where revenuecat_user_id is not null;
create index if not exists idx_user_subscriptions_stripe
    on public.user_subscriptions (stripe_customer_id)
    where stripe_customer_id is not null;

-- Row-level security: users read their own row, backend service_role writes.
alter table public.user_subscriptions enable row level security;

create policy user_subscriptions_read_own
    on public.user_subscriptions for select
    to authenticated
    using (auth.uid() = user_id);

create policy user_subscriptions_service_all
    on public.user_subscriptions for all
    to service_role
    using (true) with check (true);

-- Bumps updated_at automatically.
create or replace function public.tg_user_subscriptions_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists user_subscriptions_updated_at on public.user_subscriptions;
create trigger user_subscriptions_updated_at
    before update on public.user_subscriptions
    for each row execute function public.tg_user_subscriptions_updated_at();

-- Convenience helper: returns the *effective* tier for a user, accounting
-- for trial expiration. Called by both the backend enforcement layer and
-- (via a policy) any read-side gating we add later.
create or replace function public.effective_tier(p_user_id uuid)
returns text language plpgsql stable as $$
declare
    rec public.user_subscriptions;
begin
    select * into rec from public.user_subscriptions where user_id = p_user_id;
    if not found then
        return 'free_trial';
    end if;
    -- Trial that has elapsed → free_trial with all trial gates active-ish
    -- (client can decide to show upgrade prompt).
    if rec.tier = 'free_trial' and rec.trial_ends_at is not null
       and rec.trial_ends_at < now() then
        return 'expired';
    end if;
    -- Paid tier that has lapsed → expired.
    if rec.tier in ('basic','basic_markets','api')
       and rec.period_ends_at is not null
       and rec.period_ends_at < now() then
        return 'expired';
    end if;
    return rec.tier;
end;
$$;
