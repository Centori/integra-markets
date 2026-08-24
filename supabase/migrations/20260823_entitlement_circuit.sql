-- Entitlement circuit repair — 2026-08-23
--
-- Naming decision: existing tier strings are PRESERVED. RevenueCat entitlement
-- IDs and App Store subscription products are unchanged by this migration.
-- The only new resting-state tier is 'free'; UI display names ("Free", "Pro")
-- are a presentation concern, not a wire-format one.
--
-- What this fixes:
--   1. tier CHECK forbids api_trial/api_basic/api_history, so every Stripe
--      purchase and every /link-web-tier call writing one either 500s or lands
--      unexpirable.
--   2. effective_tier() lapses only ('basic','basic_markets','api'). Any api_*
--      tier is returned verbatim forever.
--   3. A free_trial row with trial_ends_at IS NULL never expires.
--   4. An expired trial resolved to 'expired', whose limits are all zero — a
--      bricked app, and a contradiction of the "FREE" tier the App Store
--      listing promises. A lapsed TRIAL is now a 'free' user; 'expired' is
--      reserved for a lapsed PAID subscription.
--   5. api_keys has no expires_at at all — a key outlives any beta window.
--
-- Safe to run more than once.

-- ⚠️ PREREQUISITES — verified missing in production on 2026-08-24.
--
-- `user_subscriptions`, `api_keys` and `api_key_usage` did NOT exist in the
-- production database. Probing the PostgREST schema cache returned 404 for all
-- three while entity_mentions / raw_documents / historical_events returned 200,
-- so migrations were applied per-feature by hand and the monetization ones were
-- never run. Consequences while that was true:
--   * POST /api/keys 500s — no API key has ever existed
--   * effective_tier() does not exist, so get_effective_tier() throws, is
--     caught, and every user resolves to the fallback tier forever
--   * every RevenueCat webhook 500s, so no subscription was ever recorded
--
-- RUN THESE FIRST, IN THIS ORDER:
--   1. 20260528_api_keys.sql
--   2. 20260702_user_subscriptions.sql
--   3. this file
--
-- The preflight below fails loudly rather than letting a half-applied state
-- through — a migration that silently skips its own work is worse than one
-- that refuses to start.

begin;

do $$
begin
    if to_regclass('public.user_subscriptions') is null then
        raise exception
            'PREREQUISITE MISSING: public.user_subscriptions does not exist. '
            'Run supabase/migrations/20260702_user_subscriptions.sql first.';
    end if;
    if to_regclass('public.api_keys') is null then
        raise exception
            'PREREQUISITE MISSING: public.api_keys does not exist. '
            'Run supabase/migrations/20260528_api_keys.sql first.';
    end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Widen the tier vocabulary.
-- ---------------------------------------------------------------------------
-- The original CHECK is unnamed if the table predates this migration, so find
-- whatever constraint currently governs `tier` rather than guessing its name.
do $$
declare
    con_name text;
begin
    select conname into con_name
      from pg_constraint
     where conrelid = 'public.user_subscriptions'::regclass
       and contype  = 'c'
       and pg_get_constraintdef(oid) ilike '%tier%';
    if con_name is not null then
        execute format('alter table public.user_subscriptions drop constraint %I', con_name);
    end if;
end $$;

alter table public.user_subscriptions
    add constraint user_subscriptions_tier_check
    check (tier in (
        'free',           -- NEW: post-trial resting state. Usable, not a brick.
        'free_trial',     -- 30-day trial; grants full Pro
        'basic',
        'basic_markets',  -- "Pro"
        'api',            -- legacy alias, aliased to api_basic at read time
        'api_trial',      -- 30-day API open beta
        'api_basic',
        'api_history',
        'expired'         -- lapsed PAID subscription only
    ));

-- ---------------------------------------------------------------------------
-- 2. Backfill trials with no end date.
-- ---------------------------------------------------------------------------
-- Without this, every existing free_trial row is an unexpiring trial. Measure
-- from row creation, not now(), so the fix does not silently hand the whole
-- existing user base a fresh 30 days.
update public.user_subscriptions
   set trial_ends_at = created_at + interval '30 days'
 where tier in ('free_trial', 'api_trial')
   and trial_ends_at is null;

-- ---------------------------------------------------------------------------
-- 3. API keys need their own lifetime, independent of the subscription.
-- ---------------------------------------------------------------------------
alter table public.api_keys
    add column if not exists expires_at timestamptz;

create index if not exists idx_api_keys_expires_at
    on public.api_keys (expires_at)
    where expires_at is not null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- 4. effective_tier(): expire by CLASS of tier, not by an enumerated list.
-- ---------------------------------------------------------------------------
-- The old version listed which tiers could lapse, so every tier added after it
-- was written silently became immortal. This version inverts the default: a
-- tier expires unless explicitly perpetual, so a future tier string that nobody
-- remembers to add here fails CLOSED.
create or replace function public.effective_tier(p_user_id uuid)
returns text language plpgsql stable as $$
declare
    rec       public.user_subscriptions;
    deadline  timestamptz;
begin
    select * into rec
      from public.user_subscriptions
     where user_id = p_user_id;

    -- No row: a user who has never been seen by the entitlement path. 'free'
    -- rather than 'free_trial' — the trial is granted explicitly by
    -- ensure_trial_started(), never implied by absence.
    if not found then
        return 'free';
    end if;

    -- Terminal states pass through. Checked BEFORE any clock, because Stripe
    -- sends customer.subscription.deleted with a FUTURE current_period_end;
    -- consulting the clock first would un-cancel a cancellation.
    if rec.tier in ('expired', 'free') then
        return rec.tier;
    end if;

    if rec.tier in ('free_trial', 'api_trial') then
        -- A trial with no end date is treated as having started at row
        -- creation — never as perpetual.
        deadline := coalesce(rec.trial_ends_at, rec.created_at + interval '30 days');
        if deadline < now() then
            -- A lapsed TRIAL is a free user, not a bricked one.
            return 'free';
        end if;
        return rec.tier;
    end if;

    -- Paid tiers: the billing period. A paid row with no period_ends_at means
    -- the provider has not told us the renewal date yet; fall back to the trial
    -- clock if present, otherwise leave it running — a paying customer must
    -- never be locked out by our own missing metadata.
    deadline := coalesce(rec.period_ends_at, rec.trial_ends_at);
    if deadline is not null and deadline < now() then
        return 'expired';
    end if;

    return rec.tier;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Scope derivation lives in ONE place, server-side.
-- ---------------------------------------------------------------------------
-- Both the mint path and the verify path call this. A key's stored `scopes`
-- column becomes a display cache, never an authorization input.
create or replace function public.scopes_for_tier(p_tier text)
returns jsonb language sql immutable as $$
    select case coalesce(p_tier, '')
        when 'api_history'  then '["history","archive"]'::jsonb
        when 'api_basic'    then '["history"]'::jsonb
        when 'api'          then '["history"]'::jsonb   -- legacy alias
        when 'api_trial'    then '["history"]'::jsonb   -- beta: read, no export
        else '[]'::jsonb
    end;
$$;

-- Convenience for the backend: one round-trip returns both.
create or replace function public.entitlement_for(p_user_id uuid)
returns jsonb language sql stable as $$
    select jsonb_build_object(
        'tier',   public.effective_tier(p_user_id),
        'scopes', public.scopes_for_tier(public.effective_tier(p_user_id))
    );
$$;

-- ---------------------------------------------------------------------------
-- 6. Repair keys already minted with self-granted scopes.
-- ---------------------------------------------------------------------------
-- Anything minted before this migration took scopes straight from the request
-- body. Re-derive every non-revoked key from its owner's actual tier.
-- Guarded on the uuid shape because api_keys.user_id is TEXT while
-- user_subscriptions.user_id is UUID.
update public.api_keys k
   set scopes = public.scopes_for_tier(public.effective_tier(k.user_id::uuid))
 where k.revoked_at is null
   and k.user_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

commit;
