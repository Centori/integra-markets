# Debugging reference

Failures in this system share a shape: **the command exits 0 and nothing reaches
production.** Every entry below looked healthy from outside while being broken.

Written 2026-09-07. Update it when a new failure teaches something the next
person would otherwise re-derive.

---

## 0. Check these four things before believing anything

```bash
# 1. Is the code actually on main? A PR is not a deploy.
git ls-tree origin/main <path>

# 2. Did a *Production* deploy happen, or only a Preview?
vercel ls integra-dashboard --scope team_LsYoEVnTJHrvmYtZ8Bw5Br9r
gh run list -R Centori/integra-markets --workflow "Deploy Backend to Railway"

# 3. Does the LIVE payload contain the field you think it does?
curl -s -X POST https://api.integramarkets.app/api/news/feed \
  -H 'Content-Type: application/json' -d '{"max_articles":5}' | python3 -m json.tool

# 4. Is the App Store / npm / EAS state what you assume?
curl -s "https://itunes.apple.com/lookup?bundleId=com.centori.integramarkets"
```

Four separate hours were lost this week to skipping one of these.

---

## 1. The recurring bug classes

### Substring matching without word boundaries

Found **four** times. Every instance produced plausible-looking wrong output
rather than an error.

| Where | Matched | Because of |
|---|---|---|
| `enhanced_sentiment` keyword scan | `bullish` | "bullion", "downstream" |
| `AIAnalysisOverlay.tsx:787` | `'ai'` | "Hit Ag**ai**n", "Str**ai**t of Hormuz" |
| `normalize_commodity` | `gold`, `gas`, `corn`, `oil` | "**Gold**man Sachs", "Las Ve**gas**", "**Corn**erstone", "sp**oil**ed" |
| `extract_trigger_keywords_with_relevance` | `rally`, `Fed` | "gene**rally**", "**fed** cattle" |

**Rule:** any keyword list matched against free text needs `\b…\b`, plus a
plural allowance (`(?:s|es)?`) — `\b` fails on "crack spread**s**" because the
trailing `s` is a word character.

### Present-tense patterns against past-tense news

The rulebook was written as "rise / fall / build / strong". News says "rose /
fell / built / strengthened". Articles routed to the correct market and then
matched nothing. Swept in `main_simple_nlp.py`; use `\w*` stems for any new
verb.

### Rebuilding a dict field-by-field drops fields

`jobs/news_fetcher._score` reconstructs each article and did not name
`image_url`. Capture (`data_sources`) was correct, persistence
(`archive_writer`) was correct, and the value was silently discarded between
them. Nothing errored.

**Rule:** when you add a field to an ingest path, grep the whole path for every
dict literal that rebuilds the row.

### A field the API never sends

`feed_store._to_article` emitted 13 keys. Clients read `image_url`,
`key_drivers` and `keywords`, so every card fell back to placeholder behaviour —
the brand mark on 100% of cards, and drivers scraped client-side from a
hardcoded list.

**Rule:** when a card shows a fallback, check the live payload for the field
before reading any client code.

### `response_model` silently strips fields

`/api/news/latest` declares `response_model=List[NewsItem]`, and `NewsItem` has
no `image_url`. Pydantic removes anything not on the model — the key is *absent*,
not null. Data can be perfectly correct and still never reach the client.

### `vader_analyzer` is None outside FastAPI

It is assigned in the lifespan. On a plain import it is `None`, and
`analyze_market_sentiment` falls through to `basic_sentiment_analysis` — a
different function, different return shape, scoring with a 20-word keyword list.

This corrupted `jobs/archive_scorer.py` and `jobs/news_fetcher.py` **in
production**, and it broke two test fixtures this session. Any script or test
touching sentiment must do:

```python
if main_simple_nlp.vader_analyzer is None:
    from services.sentiment_engine import get_analyzer
    main_simple_nlp.vader_analyzer = get_analyzer()
```

### The installed `supabase` package is broken

It imports as a namespace but has no `create_client`, so `main_simple_nlp`
raises on import. Stub it by testing for the **attribute**, not for presence in
`sys.modules` — guarding on presence passes in isolation and fails in the full
suite, because an earlier test imports the real broken package first.

```python
existing = sys.modules.get("supabase")
if getattr(existing, "create_client", None) is None:
    fake = types.ModuleType("supabase")
    fake.create_client = lambda *a, **k: None
    fake.Client = object
    sys.modules["supabase"] = fake
```

### A `fetch` with no timeout hangs the whole function

A request that never settles never rejects, so `try/catch` cannot save it. On
Vercel this surfaces as `504 FUNCTION_INVOCATION_TIMEOUT`. Only
`AbortSignal.timeout()` bounds it.

### Deleting a branch closes PRs stacked on it

Merging #33 with `--delete-branch` auto-closed #36 two seconds later, because
#36's base was the deleted branch. GitHub **will not reopen** a PR whose base is
gone — retarget first, or open a new PR from the same head branch.

---

## 2. Silent-failure traps by surface

| Surface | Looks like | Actually |
|---|---|---|
| `/account/api` anonymous | 200, redirects to `/login` | Correct even when the page is fully broken for signed-in users |
| `/api/summarize/article` | 200 `{"unavailable": true}` | Every failure path, including the summarizer failing to import at boot |
| `eas update` from `main` | exit 0, channel updated | `runtimeVersion` mismatch → reaches **zero** devices |
| Anonymous Supabase read | 0 rows | Empty table *or* RLS block — indistinguishable |
| Tier depth clamp | Less data | Never errors; a tier losing its allowance looks like a quiet market |
| Rulebook, unresolved commodity | A sentiment label | No rule fired; the number came from prose tone alone |

---

## 3. The sentiment engine, specifically

The engine is **stateless**: `analyze_market_sentiment` and
`analyze_fundamental_direction` contain zero database references. The archive
informs nothing.

Direction is decided in two stages:

1. `normalize_commodity` picks **which rulebook runs**. A wrong answer here
   applies another market's rules to the whole article.
2. If the fundamental read is one-sided with summed weight ≥
   `SENTIMENT_RULE_DOMINANCE_WEIGHT` (0.85), it **sets** the label; otherwise it
   blends 50/50 with VADER tone.

**Why dominance exists.** VADER scores "Saudi Aramco's Jizan Refinery Hit Again
as Houthi Attacks Escalate" at **−0.902** — "attack", "hit", "escalate" are
negative in every general lexicon. An attack on export infrastructure is bullish
for crude. Under the old blend, with the directional score clamped to ±0.9, even
*every* bullish rule firing yielded −0.001. BULLISH was unreachable at any level
of fundamental evidence.

**Invariants that must hold:**

- Mirror pairs weigh the same (`_MIRROR_PAIRS`). "Sanctions relief" at 0.80
  against "Sanctions imposed" at 0.85 meant the same event read bullish going in
  and neutral coming out.
- The dominance gate reads summed **weight**, not match count. Counting turns an
  unbalanced rulebook into a directional prior nobody chose.
- Repeated signals are deduplicated. Two patterns emit "Infrastructure attack";
  one event described twice is not two pieces of evidence.
- Dominance sets the label from the bias **direction**, never by comparing a
  rule-derived magnitude to `SENTIMENT_THRESHOLD` — that threshold is calibrated
  for VADER tone in [−1, 1] and is a different unit.

**Accuracy gate:** `tests/test_sentiment_accuracy.py`, floor 65%, target 70%,
currently **71.38%** on Financial Phrasebank. Note this is *general finance*, not
commodity news — none of the commodity defects above would show up in it, and a
commodity-domain eval set is still the largest open measurement gap.

---

## 4. The cron that watches for all of this

`jobs/pipeline_health.py`, every 15 minutes, logging at ERROR into Railway.
It exists because on 2026-08-14 four breakages were found only when a user
noticed every card showed the same disclaimer, while `/health` returned 200
throughout.

| Check | Catches |
|---|---|
| `entity_mentions_fresh` / `raw_documents_fresh` | Ingest stopped flowing |
| `feed_quality` | Feed collapsed to one source; summaries degraded to headlines |
| `card_content` | Image coverage sliding to zero; summaries that are a URL or an encoded token |
| `summarize_endpoint` | The refresh-summary button returning `unavailable` for everyone |
| `rulebook_coverage` | Articles resolving to no commodity, or matching no rule; mirror-pair drift |
| `tier_depth_contract` | A paid tier silently losing the depth it pays for |
| `archive_*` | Backfill and scoring stalling |

Thresholds are env-tunable (`HEALTH_*`) so a noisy check can be widened without
a deploy. **A guard that cries wolf gets muted** — which is what happened to
`ci.yml`, whose lint and test steps both end in `|| echo "skipping"` and cannot
fail.

---

## 5. Reference documents

| Document | Covers |
|---|---|
| [Rulebook Deficiencies](https://claude.ai/code/artifact/1b544813-165d-4564-9649-dc3d83d0d6f5) | Commodity-analyst audit: routing defects, the 28 classified-but-unruled markets, missing mechanics (curve structure, ag inventories, positioning, freight), and the unused archive |
| [Remote MCP & Archive Tiers](https://claude.ai/code/artifact/7b303912-09c1-474f-97b9-88280ed70299) | Remote connector scope, and the query-depth vs export-depth split |
| [The Institutional Gap](https://claude.ai/code/artifact/cbd811ec-5eca-4bfe-b3bd-8e3755fad117) | Earlier API readiness audit |
| `handoff.md` §9 | Session history and where to resume |

---

## 6. Repo topology — read before committing

```
Centori/integra-markets          ← THE repo. origin.
  main                           ← backend + dashboard + web. Auto-deploys.
  build64-exact                  ← mobile line. Diverged 6 Jul.
```

- `/Users/lm/Desktop/integra/integra-markets-2` is the real checkout, but its
  **working tree sits on the mobile line**, not `main`. Reading a backend file
  from it gives you the wrong version — verify with
  `git show origin/main:<path>`. This produced a wrong finding this session (a
  "30 vs 90 tier conflict" that does not exist on `main`).
- `jeremiahMshelia/integra-markets` is **not** the deploy repo. Its `main` is
  stuck at 2026-06-29. PRs there reach nothing.
- Mobile and backend have **diverged**: 102 commits on one side, 51 on the
  other, 648 files different. Merging them is a project, not a fix.
