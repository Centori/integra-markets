-- entity_mentions: give the archive a PUBLICATION-date axis.
--
-- The problem
-- -----------
-- entity_mentions' only date was `extracted_at timestamptz default now()`.
-- Every sentiment-history endpoint filters and orders on it. That is the
-- date we SCORED the article, not the date it was PUBLISHED, so:
--
--   * 14,264 raw_documents span 2020-01-01 → today, but every one of the
--     7,210 entity_mentions rows carries an extracted_at of 2026-06-29 or
--     later — the day the live pipeline started.
--   * Scoring the 11,385 unscored documents WITHOUT this column would stamp
--     nine thousand articles from 2020-2024 with today's date, producing a
--     history series that is six years wide in storage and two months wide
--     in every query. The backfill would look finished and sell nothing.
--
-- So this migration must land BEFORE the scoring pass, not after.
--
-- The fix
-- -------
-- Add published_at, backfill it from raw_documents, index it, and install a
-- trigger that fills it automatically. The trigger is the point: this
-- codebase has repeatedly been bitten by a writer that forgot a column
-- (entity_mentions itself wrote zero rows for weeks over an ON CONFLICT
-- mismatch). A default that depends on another table cannot be expressed as
-- a column DEFAULT, so it has to be a trigger — and with one, no present or
-- future writer can omit it.

begin;

-- ---------------------------------------------------------------------
-- 0. Preflight. Fail loudly and by name rather than half-applying.
-- ---------------------------------------------------------------------
do $$
begin
    if to_regclass('public.raw_documents') is null then
        raise exception 'PREREQUISITE MISSING: public.raw_documents. Run 20260624_historical_archive.sql first.';
    end if;
    if to_regclass('public.entity_mentions') is null then
        raise exception 'PREREQUISITE MISSING: public.entity_mentions. Run 20260624_historical_archive.sql first.';
    end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. The column.
-- ---------------------------------------------------------------------
alter table public.entity_mentions
    add column if not exists published_at timestamptz;

comment on column public.entity_mentions.published_at is
    'Publication date of the source document, copied from raw_documents.published_at. '
    'This is the axis all sentiment-history queries must use. extracted_at is kept as '
    'the scoring timestamp (useful for auditing model re-runs) but must NOT be used '
    'as a time axis: it says when we scored, not when the news happened.';

-- ---------------------------------------------------------------------
-- 2. Backfill existing rows from the document they point at.
--
-- raw_documents.published_at is NOT NULL for all current rows (verified:
-- zero nulls across 14,264), so this leaves nothing behind. The coalesce is
-- belt-and-braces for any future row whose document lost its date.
-- ---------------------------------------------------------------------
update public.entity_mentions em
   set published_at = coalesce(rd.published_at, em.extracted_at)
  from public.raw_documents rd
 where rd.id = em.document_id
   and em.published_at is null;

-- Any orphan rows whose document is gone: fall back to extracted_at so the
-- column can be made NOT NULL and queries never silently drop rows.
update public.entity_mentions
   set published_at = extracted_at
 where published_at is null;

alter table public.entity_mentions
    alter column published_at set not null;

-- ---------------------------------------------------------------------
-- 3. Indexes for the query shapes the history endpoints actually use:
--    filter by entity (+type), range over the date, order desc.
-- ---------------------------------------------------------------------
create index if not exists idx_entity_mentions_entity_published
    on public.entity_mentions (entity, published_at desc);

create index if not exists idx_entity_mentions_entity_type_published
    on public.entity_mentions (entity_type, entity, published_at desc);

-- ---------------------------------------------------------------------
-- 4. The trigger — so no writer can ever omit it again.
--
-- Fires only when published_at was not supplied, so an explicit value from
-- the scorer still wins. SECURITY DEFINER is deliberately NOT used: the
-- service role already reads raw_documents, and a definer function here
-- would widen access for no benefit.
-- ---------------------------------------------------------------------
create or replace function public.entity_mentions_set_published_at()
returns trigger
language plpgsql
as $$
begin
    if new.published_at is null then
        select coalesce(rd.published_at, new.extracted_at, now())
          into new.published_at
          from public.raw_documents rd
         where rd.id = new.document_id;

        -- Document not found (shouldn't happen: FK) — still never null.
        if new.published_at is null then
            new.published_at := coalesce(new.extracted_at, now());
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_entity_mentions_published_at on public.entity_mentions;
create trigger trg_entity_mentions_published_at
    before insert or update of document_id, published_at
    on public.entity_mentions
    for each row
    execute function public.entity_mentions_set_published_at();

commit;
