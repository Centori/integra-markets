-- entity_mentions was duplicating on every news_fetcher tick.
--
-- news_fetcher re-scans the same articles every 10 minutes and archive_writer
-- did a plain INSERT, so identical (document_id, entity) rows accumulated
-- forever. Production hit 272,331 rows for 3,745 real pairs — 72.7x — with a
-- single document counted 525 times.
--
-- This is not just table bloat: divergence._aggregate_sentiment() averages
-- sentiment across entity_mentions for a topic, so a stale article
-- re-inserted 525 times outweighed fresh news 525:1 and skewed every
-- divergence reading toward whatever had been in the archive longest.
--
-- Fix = dedupe + a unique index; archive_writer now UPSERTs against it.
-- model_version is part of the key so a genuine re-extraction under a new
-- model still records its own row (the original design intent).

-- 1. Collapse existing duplicates, keeping the earliest extraction.
delete from entity_mentions em
using entity_mentions keep
where em.document_id = keep.document_id
  and em.entity = keep.entity
  and em.entity_type = keep.entity_type
  and coalesce(em.model_version, '') = coalesce(keep.model_version, '')
  and em.extracted_at > keep.extracted_at;

-- 2. Make re-insertion impossible.
create unique index if not exists entity_mentions_doc_entity_model_uniq
    on entity_mentions (document_id, entity, entity_type, coalesce(model_version, ''));
