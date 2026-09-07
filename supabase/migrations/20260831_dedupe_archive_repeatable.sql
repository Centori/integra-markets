-- Re-run the snapshot dedup, and make it safe to run again.
--
-- 20260827_dedupe_archive.sql removed 2,786 duplicates. Four days later the
-- archive was 23.6% duplicated again (8,388 of 35,549) — because the cleanup
-- was one-time while the cause was continuous: the wayback walk re-adds an
-- article every time it passes a new snapshot of it.
--
-- The real fix is in the ingester (wayback._existing_titles + per-run
-- seen_titles), which lands in the same PR as this migration. This file
-- clears the backlog that accumulated before that fix, and is written to be
-- idempotent so it can be re-run without harm.
--
-- Survivor ranking matches the original: earliest snapshot first (closest to
-- true publication, since published_at is a crawl timestamp), then the copy
-- carrying the most content, then id for determinism.

begin;

do $$
begin
    if to_regclass('public.archive_purge_backup') is null then
        raise exception 'PREREQUISITE MISSING: archive_purge_backup. Run 20260827_purge_scrape_boilerplate.sql first.';
    end if;
end $$;

with ranked as (
    select id,
           row_number() over (
               partition by btrim(lower(title)), source
               order by published_at asc,
                        length(coalesce(content, '')) desc,
                        id asc
           ) as rn
      from public.raw_documents
     where btrim(coalesce(title, '')) <> ''
)
insert into public.archive_purge_backup (id, source, url, title, content, published_at, reason)
select rd.id, rd.source, rd.url, rd.title, rd.content, rd.published_at, 'duplicate_snapshot'
  from public.raw_documents rd
  join ranked r on r.id = rd.id
 where r.rn > 1;

delete from public.raw_documents rd
 using public.archive_purge_backup b
 where b.id = rd.id
   and b.reason = 'duplicate_snapshot';

-- Survivors that lost the copy carrying their tags go back in the queue.
update public.raw_documents rd
   set scored_at = null
 where not exists (select 1 from public.entity_mentions em where em.document_id = rd.id);

commit;
