-- raw_documents.published_at: give it a default so an unknown publication
-- date can be omitted from an upsert instead of being invented.
--
-- Background. The ingest cron upserts on (source, url_hash) every ten
-- minutes. archive_writer substituted datetime.now() whenever it could not
-- read a publication date, which meant such a row's published_at was
-- REWRITTEN to the current time on every single tick. In a recency-ordered
-- feed that article pins itself to the top forever and never ages out.
--
-- Measured before this change (2026-08-17): 23 of the newest 500 rows carried
-- a now() timestamp collided to the same second, including all 8 U.S. EIA
-- articles — stamped 2026-08-17T08:59:31 for stories published July 22-31.
--
-- With a column default, archive_writer omits published_at for rows whose date
-- it genuinely cannot parse. PostgREST's ON CONFLICT DO UPDATE then only
-- touches the columns present in the payload, so:
--   * a new row gets now() once, at first sight, which is the best available
--     estimate of when it was published;
--   * a re-observed row keeps whatever published_at it already had, so it
--     ages out of the feed normally instead of resurrecting each tick.
--
-- NOT NULL is retained: every row still has a usable ordering key.

alter table public.raw_documents
    alter column published_at set default timezone('utc'::text, now());

-- The feed reads `source_type = 'news'` filtered by a published_at window and
-- ordered by published_at desc. The existing idx_raw_documents_published_at
-- cannot serve the filter, so every feed request scanned and re-sorted all
-- 13.6k news rows. This composite index matches the query shape exactly.
create index if not exists idx_raw_documents_feed
    on public.raw_documents (source_type, published_at desc);

notify pgrst, 'reload schema';
