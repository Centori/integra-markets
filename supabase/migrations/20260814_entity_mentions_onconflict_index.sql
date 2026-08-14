-- entity_mentions upsert was failing with HTTP 400 on every scheduler tick.
--
-- services/archive_writer.py upserts with
--     on_conflict="document_id,entity,entity_type,model_version"
-- but the only unique index on the table was an EXPRESSION index:
--     (document_id, entity, entity_type, COALESCE(model_version, ''))
-- PostgREST requires a unique index on exactly the named columns, so the
-- expression form never matched and Postgres rejected the ON CONFLICT clause.
-- Net effect: zero entity_mentions rows were written, starving the divergence
-- engine (which reads entity_mentions to compare news sentiment against
-- prediction-market odds).
--
-- model_version is NOT NULL, so the COALESCE was a no-op and the plain index
-- below is equivalent in meaning while actually matching the upsert.
-- Verified before applying: 5,733 rows, 0 duplicate groups on this tuple.
CREATE UNIQUE INDEX IF NOT EXISTS entity_mentions_doc_entity_type_model_uniq
    ON public.entity_mentions (document_id, entity, entity_type, model_version);

-- The old expression index is now redundant. Left in place deliberately: it is
-- harmless, and dropping an index that divergence queries may plan against is
-- not worth the risk during launch. Drop later if write volume warrants it.
