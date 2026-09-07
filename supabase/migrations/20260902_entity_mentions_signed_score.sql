-- A signed, directional sentiment column. Applied to production 2026-09-02.
--
-- THE PROBLEM
-- -----------
-- `entity_mentions.score` is a CONFIDENCE MAGNITUDE, not a direction. Direction
-- lives only in the `sentiment` text column. Measured over 30 days of real data
-- before this migration:
--
--     sentiment   n      avg(score)
--     bullish    360        0.7106
--     bearish    247        0.7145   <-- HIGHER than bullish
--     neutral    683        0.5030
--
-- So every endpoint that averaged `score` and called it sentiment produced a
-- number that RISES as the news gets more bearish. That included /v1/sentiment,
-- /v1/brief, /api/sentiment/market, the CSV/XLSX export and services/divergence.
-- `_label_for` compounded it by testing `score > 0.15` against data clamped to
-- [0.5, 0.96], making "bearish" structurally unreachable — copper sat at exactly
-- 0.5000, the neutral midpoint, and was reported bullish.
--
-- THE FIX
-- -------
-- Generated in Postgres rather than in Python so that:
--   * it is retroactive across all 64,093 rows with no backfill job,
--   * it can be aggregated and indexed IN SQL, which matters because the read
--     path pulls rows into Python under .limit(1000)/.limit(2000) and averages
--     them there — fine for 7 days, silently wrong for "compare today to 2020",
--   * there is exactly one definition of direction, so a future reader cannot
--     reinvent a second one.
--
-- Confidence maps 0.5..1.0 onto magnitude 0..1, signed by the label. Neutral is
-- exactly 0 rather than 0.5, so a mean over a mixed window is meaningful.
--
-- Verified after applying:
--     bearish   min -0.978  avg -0.5736  max -0.330   n 11,823
--     neutral       0.000       0.0000        0.000   n 33,383
--     bullish   min  0.330  avg  0.5696  max  0.992   n 18,888

alter table public.entity_mentions
    add column if not exists sentiment_score real
    generated always as (
        case sentiment
            when 'bullish' then  (score - 0.5) * 2
            when 'bearish' then -((score - 0.5) * 2)
            else 0
        end
    ) stored;

comment on column public.entity_mentions.sentiment_score is
    'Signed sentiment, -1..+1, 0 = neutral. THIS is the column to average and '
    'chart. `score` is a confidence magnitude and is non-directional: bearish '
    'rows average higher than bullish ones.';

comment on column public.entity_mentions.score is
    'Confidence magnitude, 0.5..1.0. NOT directional — do not average this as '
    'sentiment. Use sentiment_score.';

-- Covering index so a multi-year mean can be answered from the index.
create index if not exists idx_entity_mentions_signed
    on public.entity_mentions (entity, published_at desc)
    include (sentiment_score);
