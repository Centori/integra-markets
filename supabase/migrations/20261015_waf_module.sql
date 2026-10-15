-- WAF (West Africa) module
--
-- WAF news and MEMAN publications land in the existing archive (raw_documents,
-- sentiment_scores) through the normal news pipeline. These tables hold only
-- what that archive has no place for:
--
--   waf_document_tags     — WAF taxonomy tags per archived document (country,
--                           grade, product, entity, segment, topic). Kept out of
--                           entity_mentions on purpose: that table feeds the
--                           public commodity list, and 40 crude-grade names would
--                           appear there as "commodities".
--   waf_port_positions    — NPA Daily Shipping Position counts, one row per report
--   waf_tanker_positions  — receiver-level tanker rows (licence-gated sources)
--   waf_reports           — the weekly WAF Report, versioned and reproducible
--
-- Production has no migration runner: apply this in the Supabase SQL editor.

create table if not exists public.waf_document_tags (
    document_id  uuid        not null references public.raw_documents(id) on delete cascade,
    tag_type     text        not null check (tag_type in
                    ('country', 'grade', 'product', 'entity', 'segment', 'topic')),
    tag          text        not null,
    tagged_at    timestamptz not null default timezone('utc'::text, now()),
    primary key (document_id, tag_type, tag)
);
create index if not exists idx_waf_document_tags_tag on public.waf_document_tags (tag_type, tag);

create table if not exists public.waf_port_positions (
    id                uuid        primary key default gen_random_uuid(),
    document_id       uuid        references public.raw_documents(id) on delete set null,
    report_date       date,
    expected          integer     not null default 0,
    waiting           integer     not null default 0,
    discharging       integer     not null default 0,
    products          jsonb       not null default '{}'::jsonb,
    product_counts    jsonb       not null default '{}'::jsonb,
    source_url        text        not null,
    parsed_at         timestamptz not null default timezone('utc'::text, now()),
    unique (source_url)
);
create index if not exists idx_waf_port_positions_date on public.waf_port_positions (report_date desc);

create table if not exists public.waf_tanker_positions (
    id               uuid        primary key default gen_random_uuid(),
    vessel_name      text        not null,
    product          text        not null,
    port             text,
    quantity_mt      real,
    quantity_litres  real,
    arrival_date     date,
    berth_date       date,
    jetty            text,
    receiver         text,
    remarks          text,
    status           text        not null,
    direction        text        not null default 'import',
    source           text        not null,
    source_url       text,
    observed_at      timestamptz not null default timezone('utc'::text, now()),
    -- One row per vessel+product+arrival per source; later posts update status.
    unique (source, vessel_name, product, arrival_date)
);
create index if not exists idx_waf_tanker_positions_observed on public.waf_tanker_positions (observed_at desc);

create table if not exists public.waf_reports (
    report_id     text        primary key,          -- WAF-2026-W42
    week_start    timestamptz not null,
    cutoff        timestamptz not null,
    version       integer     not null default 1,
    payload       jsonb       not null,
    inputs_hash   text        not null,
    generated_at  timestamptz not null default timezone('utc'::text, now()),
    published_at  timestamptz,
    push_result   jsonb
);
create index if not exists idx_waf_reports_cutoff on public.waf_reports (cutoff desc);

-- Service role only; the API reads with the service key and applies tier and
-- redistribution rules in code.
alter table public.waf_document_tags    enable row level security;
alter table public.waf_port_positions   enable row level security;
alter table public.waf_tanker_positions enable row level security;
alter table public.waf_reports          enable row level security;

drop policy if exists waf_document_tags_service_all on public.waf_document_tags;
create policy waf_document_tags_service_all
    on public.waf_document_tags for all to service_role using (true) with check (true);
drop policy if exists waf_port_positions_service_all on public.waf_port_positions;
create policy waf_port_positions_service_all
    on public.waf_port_positions for all to service_role using (true) with check (true);
drop policy if exists waf_tanker_positions_service_all on public.waf_tanker_positions;
create policy waf_tanker_positions_service_all
    on public.waf_tanker_positions for all to service_role using (true) with check (true);
drop policy if exists waf_reports_service_all on public.waf_reports;
create policy waf_reports_service_all
    on public.waf_reports for all to service_role using (true) with check (true);
