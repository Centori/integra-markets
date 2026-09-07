-- Detect "the scorer runs and achieves nothing", and undo one instance of it.
--
-- What happened
-- -------------
-- archive_scorer normalised nothing: analyze_market_sentiment returns
-- UPPERCASE ("BULLISH") while sentiment_scores.sentiment and
-- entity_mentions.sentiment both CHECK for the lowercase form. The job
-- compared the raw label against a lowercase tuple, classified every
-- document as "unscorable", and — correctly, per its own stall-prevention —
-- stamped scored_at on all of them. 200 documents were consumed and
-- produced nothing, while the job logged ok.
--
-- Freshness monitoring could not catch this: news_fetcher keeps
-- entity_mentions fresh no matter what the scorer does. The signature is
-- specifically "scored_at set, but no entity_mentions rows", so that is what
-- the health check now counts.

begin;

do $$
begin
    if to_regclass('public.raw_documents') is null
       or to_regclass('public.entity_mentions') is null then
        raise exception 'PREREQUISITE MISSING: raw_documents / entity_mentions.';
    end if;
    if not exists (
        select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'raw_documents'
           and column_name = 'scored_at'
    ) then
        raise exception 'PREREQUISITE MISSING: raw_documents.scored_at. Run 20260827_raw_documents_scored_at.sql first.';
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
               select 1 from public.entity_mentions em where em.document_id = rd.id
           );
$$;

comment on function public.marked_but_unscored_count() is
    'Documents the scorer consumed that produced no entity_mentions. A few is normal '
    '(genuinely empty documents); a large number means the scorer is discarding its own '
    'output. Read by jobs/pipeline_health.py.';

-- Return the documents consumed by the case-comparison bug to the backlog.
-- Scoped to rows that produced nothing AND have real text, so genuinely
-- empty documents are not put back into an infinite loop.
update public.raw_documents rd
   set scored_at = null
 where rd.scored_at is not null
   and not exists (
           select 1 from public.entity_mentions em where em.document_id = rd.id
       )
   and coalesce(btrim(rd.title), '') <> ''
   and coalesce(btrim(rd.content), '') <> '';

commit;
