-- Make "which rows still need signals" cheap to ask.
--
-- The signals backfill selects `where signals is null`, and the first full pass
-- degraded from 138 rows/s to 52 rows/s with the estimate receding faster than
-- the work completed. EXPLAIN ANALYZE at ~94,000 rows in:
--
--   Limit  (actual time=20310..20376 rows=500)
--     ->  Nested Loop
--           ->  Index Scan using idx_raw_documents_published_at  (17.4 s)
--           ->  Index Scan using idx_sentiment_scores_document
--   Execution Time: 20384 ms
--
-- 20 seconds per 500-row batch, almost all of it walking the published_at index
-- from the newest end and discarding rows that were already processed. The scan
-- lengthens as the frontier advances, so the job gets slower the longer it runs.
--
-- Two changes together: the backfill stopped ordering (it never needed to — every
-- row gets the same treatment), and this index lets the planner find unprocessed
-- rows directly. Same query, unordered, with this index: 877 ms. 23x.
--
-- Partial, so it holds only the work remaining and shrinks to nothing as the
-- backfill completes. SAFE TO DROP once `select count(*) from sentiment_scores
-- where signals is null` reaches zero and stays there — live ingest writes
-- signals inline, so the queue only refills if extraction starts failing, which
-- is itself worth noticing.
create index if not exists idx_sentiment_scores_unevaluated
    on public.sentiment_scores (id)
    where signals is null;

comment on index public.idx_sentiment_scores_unevaluated is
    'Backfill queue: rows awaiting signal extraction. Partial, so it shrinks as '
    'the backfill completes. Droppable once the queue is empty — see '
    'backend/scripts/backfill_signals.py.';
