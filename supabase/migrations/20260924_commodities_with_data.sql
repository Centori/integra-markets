-- Which commodities actually have scored articles, answered by the database.
--
-- /v1/commodities used to ask for 10,000 rows of entity_mentions with no
-- ORDER BY and no time filter, then take the distinct set client-side. Postgres
-- is free to return any 10,000 rows for such a query, and it returned a block
-- from the archive backfill: the endpoint reported that `bitcoin` was the only
-- commodity with data, while the same table held 22 oil mentions, 3 gold and 1
-- copper from the previous 24 hours alone.
--
-- That is a paid endpoint telling customers the product is empty, and the
-- MCP tool built on it repeating the claim to their assistant.
--
-- DISTINCT belongs in the database. The counts come free once the grouping is
-- there, and they turn "what can I ask about" into "what is worth asking
-- about", which is the question a caller actually has.
create or replace function public.commodities_with_data(p_days integer default 30)
returns table (
  entity text,
  article_count bigint,
  last_seen timestamptz
)
language sql
stable
as $$
  select
    em.entity,
    count(*)             as article_count,
    max(em.published_at) as last_seen
  from public.entity_mentions em
  where em.entity_type = 'commodity'
    and em.entity is not null
    and em.published_at >= now() - make_interval(days => greatest(p_days, 1))
  group by em.entity
  order by count(*) desc, em.entity;
$$;

comment on function public.commodities_with_data(integer) is
  'Commodities with scored mentions in the last p_days, with counts. Backs GET /v1/commodities.';

grant execute on function public.commodities_with_data(integer) to anon, authenticated, service_role;
