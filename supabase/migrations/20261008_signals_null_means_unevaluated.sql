-- Correct what NULL means on sentiment_scores.signals.
--
-- The column comment said NULL covered both "written before the column existed"
-- and "no rule fired". Those are different facts, and conflating them broke the
-- backfill: it selects `where signals is null`, so a row that fired nothing was
-- never written, never left the queue, and — ordered newest-first — came back on
-- every batch. The signalled count froze at 38 while the examined count passed
-- 62,000. The pass could not finish.
--
--     NULL  not evaluated: predates the column, or extraction failed
--     []    evaluated, and the rulebook recognised nothing in this article
--
-- `[]` is the common case: measured over 500 recent rows, about 74% of articles
-- trigger no named rule. That is the rulebook being specific rather than a gap —
-- most coverage is ordinary, and a rule that fired on it would be worthless.

comment on column public.sentiment_scores.signals is
    'Contextual drivers from the commodity rulebook: an array of '
    '{driver, phrase, direction, weight}. `driver` names the rule that fired '
    '(e.g. "Chokepoint disruption") and `phrase` quotes the span of source text '
    'that triggered it, so a score can be checked against the article by eye. '
    'An empty array means the article was evaluated and no rule fired — the '
    'common case, roughly three quarters of articles. NULL means NOT EVALUATED: '
    'the row predates the column, or extraction failed. The backfill selects on '
    'NULL, so the two must not be conflated.';

-- The partial index was built `where signals is not null`, which will now match
-- every evaluated row including the empty ones — roughly four times the rows,
-- for queries that only ever want articles WITH evidence.
drop index if exists idx_sentiment_scores_signals;
create index if not exists idx_sentiment_scores_signals
    on public.sentiment_scores using gin (signals)
    where signals is not null and signals <> '[]'::jsonb;
