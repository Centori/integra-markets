-- One row per (document, entity, entity_type). Applied to production 2026-09-02.
--
-- WHY
-- ---
-- entity_mentions had no unique constraint at all — only a primary key on the
-- surrogate `id`. Both writers called upsert() with
--
--     on_conflict="document_id,entity,entity_type,model_version"
--
-- which matched no constraint, so PostgREST could not dedupe on it and every
-- write was a plain INSERT. Two consequences, both live:
--
--   1. Including model_version in the conflict key means a MODEL BUMP
--      DUPLICATES THE ENTIRE ARCHIVE by design — new rows collide with
--      nothing. Within minutes of the lexicon fix deploying, 93 old/new pairs
--      had appeared (2026-06-23 score 0.50 beside 2026-09-02 score 0.62 for
--      the same document). A full re-score would have produced ~62,000 of
--      them, and every aggregate would have averaged keyword-scored rows
--      together with correctly-scored ones. Silently.
--
--   2. ignore_duplicates=True (ON CONFLICT DO NOTHING) meant that once a
--      matching constraint DID exist, a re-score would skip every document
--      already scored and report success having changed nothing.
--
-- Both are fixed in the same commit as this migration: 3-column conflict key,
-- ignore_duplicates=False so re-scoring overwrites in place.
--
-- model_version deliberately stays OUT of the key. It is provenance — a
-- description of how the current row was produced — not identity. One document
-- mentioning one entity is one fact; re-scoring it revises that fact rather
-- than adding a second one.

-- 93 duplicate keys existed at the time (2 rows each). Keep the newest
-- model, then the newest extraction. Idempotent: a no-op once unique.
delete from public.entity_mentions m
using (
    select id,
           row_number() over (
               partition by document_id, entity, entity_type
               order by (model_version = '2026-09-02') desc,
                        extracted_at desc,
                        id desc
           ) as rn
    from public.entity_mentions
) r
where m.id = r.id
  and r.rn > 1;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.entity_mentions'::regclass
          and conname = 'entity_mentions_doc_entity_type_key'
    ) then
        alter table public.entity_mentions
            add constraint entity_mentions_doc_entity_type_key
            unique (document_id, entity, entity_type);
    end if;
end $$;
