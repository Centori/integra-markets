-- Deduplicate the historical archive, and stop overstating its date precision.
--
-- Two findings, both from the same root cause.
--
-- 1. The archive was ~34% duplicated
-- ----------------------------------
--     ALL raw_documents     14,588 docs -> 9,564 distinct titles  (34.4%)
--     historical (pre-2025)  9,501 docs -> 5,035 distinct titles  (47.0%)
--     last 7 days              361 docs ->   342 distinct titles  ( 5.3%, normal)
--
-- wayback stores every capture under a timestamped URL, so the same article
-- pulled from six snapshots becomes six documents with six different
-- url_hash values. The existing dedup keys on URL and cannot see it — those
-- genuinely ARE different URLs.
--
-- The live window is unaffected, so divergence readings were never skewed.
-- The duplication sits entirely in the historical tail — i.e. precisely the
-- history the archive is meant to sell, where it weights some articles 6-8x.
--
-- 2. published_at is the CRAWL date, not the publication date
-- ----------------------------------------------------------
-- wayback.py:211 sets `published = _timestamp_to_datetime(ts)` where ts is the
-- Internet Archive snapshot timestamp. That is why the same article appears
-- with five different dates spanning 2021-03-11 to 2021-04-14.
--
-- The real publication date is NOT recoverable from stored data: raw_payload
-- holds only wayback_timestamp and wayback_url, and 0% of the archived URLs
-- contain a date path. Recovering it means re-fetching each article's HTML
-- and parsing meta tags — a separate piece of work.
--
-- So: dedupe keeping the EARLIEST snapshot, which is the closest available
-- approximation to publication (first crawl comes soonest after publishing),
-- and record precision explicitly so no one later mistakes crawl dates for
-- publication dates. Daily-resolution history over the wayback era is not
-- trustworthy; weekly/monthly is reasonable.

begin;

-- ---------------------------------------------------------------------
-- 1. Say plainly how precise each date is.
-- ---------------------------------------------------------------------
alter table public.raw_documents
    add column if not exists published_at_precision text
        not null default 'exact'
        check (published_at_precision in ('exact', 'crawl_estimate'));

comment on column public.raw_documents.published_at_precision is
    'exact = publication date came from the source feed. crawl_estimate = published_at '
    'is an Internet Archive crawl timestamp and may lag true publication by days or '
    'weeks. Do not present crawl_estimate rows at daily resolution.';

update public.raw_documents
   set published_at_precision = 'crawl_estimate'
 where source like '%(archive)%'
   and published_at_precision <> 'crawl_estimate';

-- ---------------------------------------------------------------------
-- 2. Deduplicate on the normalised title.
--
-- Not (title, published_at::date) — that key only found 1,675 of the 2,893
-- duplicates precisely BECAUSE the dates differ between snapshots of the
-- same article. Title is the stable identity here.
--
-- Survivor ranking: earliest snapshot first (best date estimate), then the
-- copy with the most content, then id for determinism.
-- ---------------------------------------------------------------------
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
 where rd.id in (
    select id from public.archive_purge_backup where reason = 'duplicate_snapshot'
 );

-- ---------------------------------------------------------------------
-- 3. Any survivor left without entity rows goes back in the scoring queue.
--    A deleted duplicate may have been the copy that carried the tags.
-- ---------------------------------------------------------------------
update public.raw_documents rd
   set scored_at = null
 where not exists (select 1 from public.entity_mentions em where em.document_id = rd.id);

commit;
