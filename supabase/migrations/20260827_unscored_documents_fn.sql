-- Find documents that have never been scored into entity_mentions.
--
-- Why a function rather than a cursor in the job
-- ----------------------------------------------
-- The obvious design is a forward-only cursor over published_at. It breaks
-- here: wayback continuously inserts documents from 2020-2024, so once the
-- cursor reached 2026 every newly-arrived historical document would be
-- skipped forever — exactly the silent-stall failure this whole exercise is
-- about. An anti-join always finds the true backlog no matter what order
-- rows arrive in, and stays correct if the scorer is interrupted.
--
-- Ordered oldest-first because the historical tail is the part with product
-- value; the live pipeline already covers the last two months.

begin;

do $$
begin
    if to_regclass('public.raw_documents') is null
       or to_regclass('public.entity_mentions') is null then
        raise exception 'PREREQUISITE MISSING: raw_documents / entity_mentions. Run 20260624_historical_archive.sql first.';
    end if;
end $$;

-- Supports the anti-join and the ordering.
create index if not exists idx_raw_documents_published_at
    on public.raw_documents (published_at asc);

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
     where not exists (
               select 1
                 from public.entity_mentions em
                where em.document_id = rd.id
           )
     order by rd.published_at asc
     limit greatest(1, least(p_limit, 1000));
$$;

comment on function public.unscored_documents(int) is
    'Documents with no entity_mentions rows, oldest publication first. '
    'Drives backend/jobs/archive_scorer.py. Capped at 1000 per call.';

-- Cheap counter for the health check — must not scan the whole table twice.
create or replace function public.unscored_document_count()
returns bigint
language sql
stable
as $$
    select count(*)
      from public.raw_documents rd
     where not exists (
               select 1 from public.entity_mentions em where em.document_id = rd.id
           );
$$;

commit;
