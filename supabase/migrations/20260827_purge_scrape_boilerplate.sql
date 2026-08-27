-- Remove navigation furniture that the wayback scraper ingested as articles.
--
-- What was in there
-- -----------------
-- Of 5,393 scored documents that matched no taxonomy entity, ~40% were not
-- articles at all:
--
--     1,192 x  "My account"                           (NGI nav link)
--       578 x  "Hellenic Shipping News Worldwide..."  (site masthead)
--       333 x  "MINING.COM"                           (site name)
--        14 x  "Please wait while your request is being verified..."
--        11 x  "Sign In"
--
-- Each was fetched, stored, sentiment-scored and counted toward archive size.
--
-- Why exact matches only
-- ----------------------
-- The obvious filter is "title shorter than N characters". It is wrong. Real
-- headlines in this archive include "$100 Oil By Christmas?" (22 chars),
-- "Aker Bags Equinor Deal" (22) and "ADNOC Comments on Fire" (22). A length
-- heuristic would delete genuine articles to remove nav text, so this deletes
-- only exact known non-article strings plus two unambiguous prefixes.
--
-- Deletions cascade to sentiment_scores and entity_mentions (both FKs are
-- ON DELETE CASCADE), so no orphans are left behind.

begin;

-- Reversible: keep what we removed. Drop this table once the archive has been
-- reviewed and the numbers look right.
create table if not exists public.archive_purge_backup (
    id            uuid,
    source        text,
    url           text,
    title         text,
    content       text,
    published_at  timestamptz,
    purged_at     timestamptz not null default now(),
    reason        text
);

with junk as (
    select *
      from public.raw_documents
     where btrim(lower(title)) in (
               'my account', 'mining.com', 'sign in', 'comments on: rss',
               'please wait while your request is being verified...',
               'one moment, please...', 'log in', 'subscribe', 'newsletter',
               'home', 'search', 'menu', 'rss'
           )
        or lower(btrim(title)) like 'hellenic shipping news worldwide%'
        or lower(btrim(title)) like 'you searched for %'
        or btrim(coalesce(title, '')) = ''
)
insert into public.archive_purge_backup (id, source, url, title, content, published_at, reason)
select id, source, url, title, content, published_at, 'scrape_boilerplate'
  from junk;

delete from public.raw_documents rd
 where rd.id in (select id from public.archive_purge_backup where reason = 'scrape_boilerplate');

commit;
