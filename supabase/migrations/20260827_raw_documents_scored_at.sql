-- raw_documents.scored_at — make scoring progress explicit.
--
-- Replaces the entity_mentions anti-join from 20260827_unscored_documents_fn.
--
-- The bug that forced this
-- ------------------------
-- "Unscored" was defined as "has no entity_mentions rows". But a document
-- can be legitimately unscorable — empty content, or a sentiment the model
-- declines to classify. Those never produce entity_mentions, so the
-- anti-join returned them again on every single tick. Because the batch is
-- ordered oldest-first, a few hundred unscorable documents at the front of
-- 2020 would have pinned the scorer permanently and nothing behind them
-- would ever have been reached.
--
-- The job would have logged "ok" forever while making zero progress, which
-- is precisely the failure mode this work exists to eliminate.
--
-- scored_at records ATTEMPT, not success. The scorer stamps it for every
-- document it processes, scorable or not, which guarantees forward motion.
-- Clearing it (set scored_at = null) is how you force a re-score, e.g. after
-- a model-version bump.

begin;

do $$
begin
    if to_regclass('public.raw_documents') is null
       or to_regclass('public.entity_mentions') is null then
        raise exception 'PREREQUISITE MISSING: raw_documents / entity_mentions. Run 20260624_historical_archive.sql first.';
    end if;
end $$;

alter table public.raw_documents
    add column if not exists scored_at timestamptz;

comment on column public.raw_documents.scored_at is
    'When archive_scorer last ATTEMPTED this document (success or not). NULL = in the '
    'backlog. Set scored_at = null to force a re-score.';

-- Anything that already produced entity_mentions has plainly been attempted.
update public.raw_documents rd
   set scored_at = coalesce(rd.scored_at, now())
 where rd.scored_at is null
   and exists (select 1 from public.entity_mentions em where em.document_id = rd.id);

-- Partial index: the backlog is the only thing ever queried, and it shrinks
-- to nothing, so indexing only NULLs keeps it tiny.
create index if not exists idx_raw_documents_unscored
    on public.raw_documents (published_at asc)
    where scored_at is null;

create or replace function public.unscored_documents(p_limit int default 200)
returns table (
    id           uuid,
    source       text,
    title        text,
    content      text,
    published_at timestamptz,
    raw_payload  jsonb
)
language sql
stable
as $$
    select rd.id, rd.source, rd.title, rd.content, rd.published_at, rd.raw_payload
      from public.raw_documents rd
     where rd.scored_at is null
     order by rd.published_at asc
     limit greatest(1, least(p_limit, 1000));
$$;

create or replace function public.unscored_document_count()
returns bigint
language sql
stable
as $$
    select count(*) from public.raw_documents where scored_at is null;
$$;

-- Called by the scorer once per batch: one round trip instead of N.
create or replace function public.mark_documents_scored(p_ids uuid[])
returns bigint
language sql
volatile
as $$
    with updated as (
        update public.raw_documents
           set scored_at = now()
         where id = any(p_ids)
        returning 1
    )
    select count(*) from updated;
$$;

comment on function public.mark_documents_scored(uuid[]) is
    'Stamp scored_at for a processed batch. Must be called for EVERY document the '
    'scorer touches, including unscorable ones, or the backlog stalls at the oldest.';

commit;
