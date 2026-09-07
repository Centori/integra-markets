-- Correct marked_but_unscored_count(): measure SCORING, not entity matching.
--
-- The v1 definition ("scored_at set but no entity_mentions rows") conflated
-- two very different things. Measured immediately after the first full drain:
--
--     no entity_mentions rows ......... 5,406
--       ├─ but sentiment_scores OK .... 5,393   <- fine, just no taxonomy match
--       └─ truly produced nothing .....    13   <- the real signal
--
-- A document can score perfectly and still yield no entity rows: entity_mentions
-- is only written when the text matches a commodity or a topic in the taxonomy.
-- Roughly 47% of the historical archive matches neither — those documents have
-- sentiment, they are just not attributable to an entity.
--
-- So v1 would have reported 5,406 against a threshold of 500 and alerted
-- permanently on a healthy system. An alert that is always firing is an alert
-- nobody reads, which would have re-created the silent-failure problem this
-- check exists to solve.
--
-- The signature of the bug it is actually meant to catch (the scorer discarding
-- every label it computes) is the absence of a sentiment_scores row.

begin;

do $$
begin
    if to_regclass('public.sentiment_scores') is null then
        raise exception 'PREREQUISITE MISSING: public.sentiment_scores.';
    end if;
end $$;

create or replace function public.marked_but_unscored_count()
returns bigint
language sql
stable
as $$
    select count(*)
      from public.raw_documents rd
     where rd.scored_at is not null
       and not exists (
               select 1 from public.sentiment_scores ss where ss.document_id = rd.id
           );
$$;

comment on function public.marked_but_unscored_count() is
    'Documents the scorer consumed that produced NO sentiment_scores row — i.e. it ran '
    'and scored nothing. Deliberately not based on entity_mentions: ~47% of historical '
    'documents legitimately match no commodity or topic and so have no entity rows '
    'while being scored correctly. Read by jobs/pipeline_health.py.';

-- Separate, non-alerting metric: how much of the archive is scored but not
-- attributable to any entity. This is a taxonomy-coverage question, not a
-- health question, and is worth watching without paging anyone.
create or replace function public.scored_without_entity_count()
returns bigint
language sql
stable
as $$
    select count(*)
      from public.raw_documents rd
     where exists (select 1 from public.sentiment_scores ss where ss.document_id = rd.id)
       and not exists (select 1 from public.entity_mentions em where em.document_id = rd.id);
$$;

comment on function public.scored_without_entity_count() is
    'Scored documents that matched no commodity or topic. High values mean the taxonomy '
    'under-covers the archive, not that anything is broken.';

commit;
