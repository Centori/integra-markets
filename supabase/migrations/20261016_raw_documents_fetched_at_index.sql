-- Index raw_documents.fetched_at
--
-- The WAF ingest job (jobs/waf_ingest.py) tags "documents archived in the last
-- 3 hours", and /health/waf counts documents fetched in the last 24 hours. Both
-- filter and order on fetched_at, which had no index: every call scanned and
-- sorted the whole archive. On the Nano instance that exceeded postgrest-py's
-- 5-second client timeout, so every waf_ingest tick died with
-- "ReadTimeout: The read operation timed out" and nothing was ever tagged —
-- which is why WAF-2026-W41 had 0 articles.
--
-- Production has no migration runner: apply in the Supabase SQL editor.

create index if not exists idx_raw_documents_fetched_at
    on public.raw_documents (fetched_at desc);
