# Handoff — 2026-09-11

> Latest session. Everything below this heading supersedes older sections where
> they conflict. Read sections A and B before writing any code.

## A. The two traps that cost the most time

**1. There are three checkouts and two of them lie.**

| Path | What it is |
|---|---|
| `~/integra-markets` | a FORK (jeremiahMshelia), frozen in June |
| `~/Desktop/integra/integra-markets-2` | the shipped mobile lineage, not `main` |
| `Centori/integra-markets` | the real repo |

Reading the wrong one does not error. It returns plausible source describing a
different program. Two confident and entirely wrong analyses came from this in
one session. Run `npm run where` first, every time.

**2. The App Store app has never been built from `main`.**

`main` is missing 49 commits of mobile work including the whole paywall, and
five files the shipped app imports do not exist there — so `main`'s mobile
bundle cannot resolve. `main` is authoritative for backend, dashboard and web;
it has never been authoritative for the app. Build and OTA only from
`build64-exact`. Reconciling the two is outstanding and should not happen under
release pressure.

## B. What was actually broken, and the shape it shared

Four separate production failures, one shape: **a dependency or check that lets
the app boot healthy and fail on exactly one path.**

- `stripe` was declared only in `requirements-light.txt`, which nothing
  installs. Checkout answered 503; everything else worked.
- `PyJWT` was declared in **neither** requirements file. **Every authenticated
  request answered 503** while `/health` returned 200. The dashboard caught
  that failure and fell back to `free_trial`, so an outage rendered as a
  correctly locked account — reported as a billing bug, not an outage.
- The MCP tool-parity check was wired into `npm run build`, which the Dockerfile
  runs, and `scripts/` is not in that image. **Three days of failed deploys**
  while PRs merged cleanly on top.
- The MCP server sent `WWW-Authenticate: Bearer` on 401. In MCP that is the
  OAuth signal, so Claude hunted a sign-in service that does not exist and every
  tool call failed with "No approval received".

All four are fixed. `backend/tests/test_declared_dependencies.py` and
`/health`'s `dependencies` block now make the first two impossible to repeat
silently.

## C. Tooling added this session — use it, do not re-derive it

```bash
npm run verify:prod     # probe every live surface; exits non-zero
npm run where           # which repo, branch and mobile lineage
npm run find:shapes     # hunt the failure shapes that have bitten twice
```

`verify-production.mjs` covers the gap local checks cannot:

```
written -> committed -> merged -> CI -> deployed -> cached -> their data
             tsc/pytest ^                  every real miss ^
```

`known-issues.json` holds things broken on purpose. Each entry has a deadline;
past it the verifier **fails** and prints the next action. This exists because
the MCP certificate sat as a "known issue" for three days and nothing was
decided — a warning that repeats forever stops being read.

`CLAUDE.md` carries the four operating rules. The one that is not automatable:
**re-read the request before shipping UI; if your reasoning contradicts it, say
so in a sentence and build what was asked.** A request to move something left
was implemented as a move right, with a confident comment justifying it.

## D. Shipped and verified live this session

Fourteen PRs merged (#79–#87, plus #28/#31/#32/#60/#61/#65/#66/#67/#69 from the
backlog). Backend tests 594 -> 739.

- **#85** PyJWT — unblocked key generation, the API tier and the comp grant
- **#81** stripe + comp access by config (`INTEGRA_COMP_EMAILS` is set to
  `centori1@gmail.com` on Railway; both comp variables now accept either
  identifier)
- **#83/#84** MCP: no OAuth signal, working URL, deploys unblocked
- **#31** Google News HTML summaries — **written 25 Aug, merged today**. It was
  blocked for 18 days by a CI failure that had nothing to do with it (an August
  workflow running `npm install` in an `app/` directory that no longer exists).
  Rebased onto current main, it passed first time.
- **#86** avatar and profile panel both left, on `web/`
- **iOS 1.0.3 (91)** built from `build64-exact` + the prefs-sync files, uploaded
  to App Store Connect, awaiting review. runtimeVersion deliberately left at
  1.0.4 so one future OTA can reach build 90 *and* 1.0.3.

## E. Open right now

**#88 — Google News redirect resolution.** Verified 8/8 resolved in 1.9s
against the live feed. This is one cause behind four reported symptoms:
`summary == title`, empty `image_url`, generic `key_drivers`, and a rotting
archive URL. It fails safe (returns the original URL), so breakage is silent —
`pipeline_health.gnews_urls_resolved` watches the unresolved ratio for exactly
that reason. **Merge this first**; the sentiment work below depends on it,
because the engine currently scores bare headlines.

**#89 — Google consent-screen suffix, visibility only.** Established by grepping
the deployed bundle: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is **unset on Vercel**, so
the in-page flow from #80 has never run once. #89 makes that state loud and
adds a verifier check for it.

**#68 — npm packaging for the MCP.** Probably superseded by the remote
connector; needs a decision to close or rebase.

## F. The Google suffix — what is actually true

The consent screen reads `to continue to zhdcpiopihqwcmicjpca.supabase.co`.

- `auth.integramarkets.app` is **not** a Supabase custom auth domain. A wildcard
  DNS record points `*.integramarkets.app` at Vercel, so every subdomain
  resolves and returns `DEPLOYMENT_NOT_FOUND`. The string appears nowhere in
  either lineage.
- Mobile avoids the problem by not using a browser: `GoogleSignin.signIn()`
  returns an idToken natively, then `signInWithIdToken`. No redirect, no host.
  The same file falls back to `signInWithOAuth` on `Platform.OS === 'web'`, so
  even the mobile codebase shows the Supabase host on web.
- The browser equivalent is Google Identity Services — which #80 built and which
  is switched off.

Ranked next steps: (1) check the OAuth consent screen's **App name**, free and
fixes every surface if it is unset; (2) set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` plus
the JS origin on client `1039046627332-btsk2dvt…`; (3) port GIS to `web/`,
which still calls `signInWithOAuth` in `SocialAuthButtons.tsx` and was never
touched by #80.

## G. Not started — the product list

Reported and unfixed. The sentiment items are the core value.

1. **Sentiment misreads**, with live examples:
   - "Oil Prices Near $100 After Fresh Attacks on Saudi Energy Sites" scored
     **BEARISH 0.83**. A supply disruption is bullish for crude; this is an
     inverted sign, not a confidence problem.
   - "China's Crude Buying Rebounds as Fuel Exports Jump 29%" scored
     **NEUTRAL 0.61**. Imports up 6.2% m/m for a second month.
   - "Oil Prices Surge to Four-Month Highs as War Risks Mount" scored
     **NEUTRAL 0.57**, 33/33/34, key drivers `oil`, `price`.
   Approach: sweep for the shape before fixing instances. Expect #88 to change
   the inputs, since the engine has been scoring headlines only.
2. Copy/paste button does not work on mobile.
3. Community sentiment poll does not match the mobile poll.
4. Divergence read/output differs between web and mobile.
5. Refresh button under Integra analysis does nothing.

## H. Known-broken, tracked with a deadline

`mcp-custom-domain-cert` — `mcp.integramarkets.app` has served no certificate
since 2026-09-08. DNS propagated, CAA permits letsencrypt.org, port 80 reaches
Railway, domain deleted and recreated once. **Not fixable from our side; it
needs a Railway support ticket** quoting project
`18e783a9-f02d-4396-b49c-98a7a99bbc72` and domain
`d27eb5a5-008f-49f1-bfc4-1ada1be18a85`. The verifier fails on it daily until
someone files it or moves the deadline in a diff.

---

# Handoff — 2026-09-03

> Supersedes the 2026-08-23 handoff. Sections 3 onward are carried forward
> unchanged where still true. Findings that turned out to be wrong are called
> out rather than deleted, because several were believed for days and will
> otherwise be re-derived.
>
> **Section 9 covers a parallel 25 Aug audit session whose work is still in
> open PRs.** It ran against `2fd94461` and did not see the 2 Sep work, so two
> of its findings were overtaken — both are marked. Read it before opening
> anything new against the feed or the OpenAPI spec.

## 0. Read this first: the sentiment engine was not the sentiment engine

**Until 2 September 2026, 96% of the archive had never been scored by the model
the product is sold on.**

`main_simple_nlp` declares `vader_analyzer = None` at module level and builds the
lexicon-enriched analyser only inside FastAPI's `lifespan()`. Both scoring jobs
did `from main_simple_nlp import vader_analyzer`, which copies the value **at
import time**. Neither job runs under FastAPI, so both copied `None`, hit
`if vader:` and fell through to `basic_sentiment_analysis` — a 20-word keyword
list — while stamping rows `model_name="vader_v2_commodity"`.

Proof was a fingerprint: `basic_sentiment_analysis` can only emit
`0.5 / 0.68 / 0.76 / 0.84 / 0.85`, capped at 0.85. 60,225 of 62,771 rows carried
only those values. 2020–2025 was **0.0%** real NLP.

**The identical bug existed in four places.** This is the single most important
pattern to watch for in this repo:

| # | Location | Effect |
|---|---|---|
| 1 | `jobs/archive_scorer.py` | corrupted the backfill |
| 2 | `jobs/news_fetcher.py` | **live ingest** — corrupting new data every 10 min |
| 3 | `tests/test_archive_scorer.py` fixture set `vader_analyzer = None` | suite exercised the fallback and stayed green |
| 4 | `tests/test_sentiment_accuracy.py` | called `pytest.skip` — **the accuracy gate never ran once**, while CI advertised "Backend pytest (sentiment >=65%)" |

Anything doing `from <module> import <mutable global>` in this codebase is
suspect. Construction now lives behind `services.sentiment_engine.get_analyzer()`
— no importable global to copy, and it raises `LexiconUnavailable` rather than
returning a weaker engine that looks identical.

### Accuracy, finally measured

Against `backend/tests/data/financial_phrasebank.csv` (4,846 sentences),
reproducing the published baselines exactly:

| configuration | accuracy | documented |
|---|---|---|
| plain VADER | 58.75% | 58.7% |
| + Henry + SentiBignomics | 69.34% | 69.4% |
| + domain-neutral overrides | **71.40%** | 70.2% (prior best) |

**Caveat that matters for the institutional pitch:** Financial Phrasebank is
*earnings press releases*. There is still **no accuracy measurement on commodity
news**, which is the domain actually being sold. Building a labelled commodity
eval set is the highest-value next step for that claim.

### The commodity names carried sentiment

VADER scores `crude` at **−2.70** ("vulgar") and `natural` at **+1.50**
("wholesome"). The two commodity *names* biased their own headlines in opposite
directions. Over 6,000 real titles:

```
crude-oil headlines    mean compound  -0.4850 -> +0.0185   (76.3% relabelled)
natural-gas headlines  mean compound  +0.3965 -> +0.0251   (71.3% relabelled)
whole corpus           mean compound  +0.0298 -> +0.0257   ( 5.6% relabelled)
```

An 0.88 artificial spread from two adjectives. Verified these are the **only**
two that matter — gold, silver, copper, wheat, uranium, nickel are not in the
lexicon at all. Fix lives in `services/lexicons/domain_neutral.py`; terms were
found by ranking the lexicon by *frequency × |polarity|* over the real corpus.

## 1. `score` is confidence. `sentiment_score` is direction.

The most consequential data fact in the system.

`entity_mentions.score` is a **confidence magnitude**. Direction lives only in
the `sentiment` text column. Before the fix, bearish rows averaged **higher**
than bullish ones (0.7145 vs 0.7106), so every endpoint that averaged `score`
produced a number that **rose as the news got worse**.

`_label_for` compounded it by testing `score > 0.15` against data clamped to
[0.5, 0.96] — "bearish" was structurally unreachable, and copper at exactly
0.5000 (the neutral midpoint) was reported bullish.

**Use `sentiment_score`** — a Postgres generated column, −1..+1, 0 = neutral:

```sql
case sentiment
    when 'bullish' then  (score - 0.5) * 2
    when 'bearish' then -((score - 0.5) * 2)
    else 0
end
```

Generated in the database on purpose: retroactive across all rows with no
backfill job, and **aggregatable in SQL**. That last part matters — the read path
still pulls rows into Python under `.limit(1000)`/`.limit(2000)` and averages
there. Fine for 7 days, silently wrong for "compare today to 2020". Moving those
aggregations into SQL is **open work**.

## 2. Archive state after the 2 Sep re-score

- `entity_mentions`: **64,093 rows, single provenance `model_version 2026-09-02`**,
  2020-01-01 → present, **492 distinct score values** (was ~40).
- `raw_documents`: 44,343 docs.
- Trigger a re-score with `update raw_documents set scored_at = null`. The
  scheduler thread (`jobs/scheduler.py`, 600s interval, 60s drain budget) drains
  it. Full pass took ~30 minutes.

**Three traps for the next re-score:**

1. `entity_mentions` had **no unique constraint**, and both writers upserted on
   `document_id,entity,entity_type,model_version` — a key matching nothing.
   Including `model_version` means **a model bump duplicates the whole archive by
   design**. Now `entity_mentions_doc_entity_type_key UNIQUE (document_id,
   entity, entity_type)`.
2. `ignore_duplicates=True` is `ON CONFLICT DO NOTHING` — a re-score would have
   silently changed nothing. Now `False`.
3. Upsert overwrites keys it writes but does **not delete** rows for entities the
   new pass no longer detects. 981 orphans survived and had to be deleted.

**Verify duplicates with `GROUP BY … HAVING count(*) > 1`.**
`count(distinct (a,b,c)) = count(*)` does **not** detect them — that check gave a
false all-clear and the constraint then failed on first attempt.

## 3. Security fixed 2 Sep — check these stay fixed

- **`/kalshi/*` had 18 routes with no authentication, live in production**,
  including `POST /kalshi/trade` using `KALSHI_API_KEY_ID`/`KALSHI_PRIVATE_KEY`
  from the server's own env — i.e. anonymous callers could place, amend and
  cancel real orders on Integra's account and read its full position book.
  Nine routes now require a key (`tests/test_kalshi_auth.py` guards it, with a
  catch-all for newly added `/portfolio` or `/trade` routes).
  **Still unverified: `KALSHI_USE_SANDBOX` in Railway.**
- **`archive_purge_backup` had RLS disabled** and was readable with the anon key,
  which ships in the mobile bundle. 13,243 articles with full body text. RLS now
  enabled with no policies; migrations run as owner and bypass it.
- **Unverified, reported by audit:** `POST /api/subscriptions/webhook` skips its
  auth check when `REVENUECAT_WEBHOOK_AUTHORIZATION` is unset, which would let
  anyone grant any user any tier. **Check that env var in Railway.**

### A previous handoff dismissed the Kalshi issue as false

The 2026-08-23 handoff listed **"`/kalshi/*` fully unauthenticated" — false in
production. Live probes return 401, not 503.** That correction was itself wrong,
and the vulnerability stayed open for another ten days.

The 401 came from Kalshi's own upstream rejecting the server's credentials on
some route, not from Integra requiring a key. On 2 Sep, `GET /kalshi/health`
returned **200 with no credentials**, and the router carried no dependency at
all — 20 routes, including order placement.

Lesson worth keeping: **probe the specific route you are worried about, and read
what the status code is actually telling you.** A 401 from an upstream is not an
authenticated endpoint.

## 4. Dashboard

`/account/api` is the single page for subscription, keys, MCP connector, and (new)
a live API console. `/api-keys` redirects there.

It gated on `tier === "api"`. The shipping plan is **`api_basic`**, so the keys
panel was hidden from 100% of paying API customers, who were simultaneously told
they were on "Free trial". Use `isApiTier()` from `lib/entitlement.ts`, never an
equality check.

## 5. Deploy topology — read before touching anything

Verified via the Vercel API:

```
www.integramarkets.app
 └─ Vercel project  integra-web
     └─ rootDirectory  web/
         └─ GitHub  Centori/integra-markets     <-- THE repo
             └─ production branch  main
```

`dashboard.integramarkets.app` = Vercel project `integra-dashboard`,
rootDirectory `dashboard/`, same repo. Backend = Railway, auto-deploys on merge
to `main`.

**`jeremiahMshelia/integra-markets` is NOT the web repo.** Its `main` is stuck at
2026-06-29, has no `web/` and no `mcp/`. PRs there do not reach production.

## 6. Open work, highest value first

1. **Move aggregation into SQL.** `.limit(1000)`/`.limit(2000)` then average in
   Python silently truncates any multi-year window. This blocks the entire
   "historical antecedent" product story.
2. **A commodity-domain eval set.** 71.40% is Financial Phrasebank, not
   commodity news. Without this, "institutional grade" is unmeasured.
3. **Commodity name normalisation on read.** Stored entities are
   `oil, gas, gold, silver, uranium, forex, bitcoin, wheat, corn, macro, weather`.
   Read paths do only `.strip().lower()`, so the tickers the MCP tools advertise
   (`brent`, `wti`, `ng`, `copper`) match nothing and return an empty 200.
4. **MCP divergence tools are broken** — they send parameters the endpoint does
   not accept (422) and expect a response shape it does not return.
5. **`@integra/mcp` is unpublished on npm**, so the dashboard's install
   instructions do not work. `integra-markets-mcp` is available.
6. **`/v1/historical/analogs` is still a 501 stub.**
7. **`market_divergences` table does not exist** — `/v1/brief`'s
   `key_divergences` is permanently empty. Divergence is computed live in
   `services/divergence.py` but per *topic* key; needs a commodity→topic mapping.
8. **Weather terms carry the wrong sign** (`drought` −0.07, `hurricane` −0.07).
   A drought is bullish for wheat. Belongs in the rulebook as a sign flip.
9. **28.9% of documents have no body**, so a third of the archive is
   headline-only, mixed with full-text rows and unmarked.

## 7. Residual bias — do not oversell the signal

After the re-score every year reads mildly positive (+0.05 to +0.14). There is a
**positive offset** in the engine. Treat `sentiment_score` as a *relative* signal
— deviation from its own baseline — not an absolute bull/bear call.

An earlier claim in this session that "2020 comes out net bearish, validating the
pipeline against the COVID demand collapse" was computed on the **keyword-scored**
labels and **does not hold** on properly-scored data. It is recorded here so it
is not repeated.

## 8. PRs from the 2 Sep session

| PR | What |
|---|---|
| #49 | Kalshi auth — verified live (`/kalshi/portfolio` → 401) |
| #50 | Lexicon wiring + domain overrides + accuracy gate made to run |
| #51 | `entity_mentions` unique key + real upsert |
| #52 | Signed `sentiment_score`, `raw_documents` join, loud errors |
| #53 | Dashboard tier gate + live API console |

Engine walkthrough (flowchart + annotated code):
https://claude.ai/code/artifact/e836bb7e-32c3-4cb1-9c6d-c11731d60495


## 9. Parallel audit session, 25 Aug — five open PRs

A separate session audited the feed, driver, market-impact and divergence paths
against `2fd94461` and left five PRs open. **`main` has moved eleven PRs since,
and none of this work landed** — verified by grep against `origin/main`, not
assumed:

| PR | What | On main? |
|---|---|---|
| #31 | Store summaries cleaned · keyword boundaries · book mid · market identity on cards | no |
| #32 | API-key auth scheme declared in the OpenAPI spec | no |
| #33 | Card images captured at ingest | no |
| #36 | Key Sentiment Drivers emitted (stacked on #33) | no |
| #60 | Schedules the *fetch* half of the backfill (replaces #34) | no |

#35 (CI) is merged. #34 was closed and rebuilt as #60 — see below.

Four of the five merge cleanly onto current `main`.

### 9.1 The store reader drops fields it already has

This is one bug with three faces, and it is the most useful pattern in the
section. `services/feed_store._to_article` emitted 13 keys. Three things the
ingest had already captured were not among them:

| Field | Written by | Symptom |
|---|---|---|
| `image_url` | (nothing — dropped at ingest too) | every card shows the brand mark |
| `keywords` / `key_drivers` | `raw_payload.keywords` | "Key Sentiment Drivers" empty on every tier |
| clean `summary` | — | raw `<a href>` markup on cards **and in push notifications** |

Live production payload, 25 Aug, `POST /api/news/feed`:

```
article[0].summary  457 chars of <a href="https://news.google.com/rss/...">
article[2].summary  byte-identical to its own title
every article       image_url: None
```

The markup reached `/api/news/latest` too, which the notification poller reads.
`clean_summary_text` and `is_usable_summary` existed, with passing tests — and
were reachable only from `user_news_service`, never from the store path that
actually serves every user.

**The reported symptom was "drivers look gated on free". They were empty on Pro
as well.** Not a paywall.

### 9.2 Substring keyword matching, in two places

`enhanced_sentiment.KeywordDQN.predict` and `main_simple_nlp.extract_keywords`
both matched with unanchored `term in text_lower`:

```
"supply"      contains "up"      -> bullish     (every energy story)
"bullion"     contains "bull"    -> bullish     (on gold articles)
"shutdown"    contains "down"    -> bearish
"important"   contains "import"  -> driver      (half of financial copy)
"cornerstone" contains "corn"    -> driver
"federal"     contains "fed"     -> driver
```

Anchoring with `\b…\w*\b` is **not sufficient on its own**: it still matches
"bullion" and "downstream". Regular inflections have to be enumerated, and then
`bullish`/`bearish` added back explicitly, because the regular rules do not
generate the `-ish` adjectival form — which is the highest-signal form in
financial copy.

### 9.3 Divergence uses the bid, not the mid

`polymarket_public._normalize_market` set `yes_price` from `bestBid`, which sits
below fair value by half the spread. Divergence is `sentiment − market_implied`,
so understating the market **inflated every delta positively** — cards read "the
market is underpricing this" rather than splitting both ways. Live deltas on
25 Aug were `0.7574` and `0.694`, both positive.

Same expression: `or` was evaluated on the raw string before coercion (gamma-api
sends strings, so `"0"` was truthy and `""` fell through), and `no_price` was
derived from `bestBid` even when `yes_price` came from `lastTradePrice`.

### 9.4 The card cannot name the market it is claiming about

`_normalize_market` already produces `question`, `slug`, `condition_id` and a
resolved `https://polymarket.com/event/{slug}`. `divergence.compute` carries
them in `related_markets`. Then `news_enricher._pick_strongest_signal` reduced
the reading to `{provider, delta, status}` and dropped the identity. Plumbing,
not integration.

### 9.5 The OpenAPI spec declares no auth — SDKs cannot authenticate

The live spec serves 60 paths, **14 under `/v1`**, and
`components.securitySchemes` is empty. Every `/v1` operation has no `security`
block, so a generated client has no way to send the key — on exactly the
endpoints customers pay for.

`/v1` is gated by `api_key_auth.verify_api_key`, which reads a plain
`Authorization: Bearer` header via `Header()` rather than a `fastapi.security`
class, so FastAPI documents it as an ordinary string parameter.

**Key on the path prefix, not the tag.** `public-v1` covers only 4 of the 14
live operations; the rest are tagged by subject (`divergence`, `agent`,
`sentiment-history`, `market-sentiment`). Tag-only matching left ten paying
endpoints documented as unauthenticated. All thirteen distinct `/v1` paths were
probed and every one returned 401 without a key.

#32 does this as spec post-processing rather than swapping in `HTTPBearer`,
because `HTTPBearer(auto_error=True)` would replace the informative 401 bodies
with a generic "Not authenticated" on a live API.

### 9.6 Two findings that were overtaken — do not re-apply

- **The wayback cursor fix.** #34 carried one; `main` landed an equivalent fix
  on 2 Sep. #34 is **closed**; #60 is the rebuild with only the additive parts.
  The 17 cursor tests written against the separate fix pass unchanged against
  main's, so they are kept as a behavioural guard.
- **"The archive has never reached backwards."** True on 25 Aug —
  `backfill_cursors` held no rows. Since overtaken: the sources were run
  manually, and `archive_scorer` reports 11,385 unscored documents, 9,176 of
  them pre-2025. What is *still* missing is a scheduled **fetch** — #60.

### 9.7 One finding withdrawn on evidence

`DEFAULT_THRESHOLD = 0.20` was called "2× too sensitive" on the reading that
"20-point" meant probability points. It does not: the repo's convention is
hundredths of the signed axis, and `tests/test_divergence_scale.py` pins the
0.60-vs-0.50 boundary deliberately, its docstring noting that this exact
confusion caused the earlier inverted-signal incident. The change broke that
test, which is how it was caught. **The constant is correct. Only its comment
was clarified.**

### 9.8 Mobile — blocks the next build

`app.json` on `main` is **stale relative to what shipped**:

| | `main` | `build64-exact` (what was built) |
|---|---|---|
| `version` | 1.0.1 | 1.0.2 |
| `ios.buildNumber` | 54 | 90 |
| `ios.runtimeVersion` | 1.0.1 | 1.0.4 |
| `scheme` | **absent** | `integra` |
| `ios.appStoreUrl` | `id123456789` (placeholder) | `id6749469306` (real) |
| `ios.associatedDomains` | absent | absent |

An EAS build from `main` produces **1.0.1 / 54** — into the train Apple already
closed (ITMS-90186). And with no `scheme` and no `associatedDomains`, **deep
links into the app are not possible**, which blocks the shareable-card work:
sharing currently posts the publisher's URL, so X renders oilprice.com's own
Open Graph card.

### 9.9 Poll — real votes, invented breakdown

The poll **is** genuinely wired: `getPollResults` / `submitPollVote` /
`getUserVote` read and write real rows, percentages derive from real counts, and
the zero-vote state honestly shows `total: 0`.

Two problems around it:

- `AIAnalysisOverlay.tsx:1132-1136` renders a **"Who is voting?" breakdown** —
  Physical traders 30%, Financial traders 38%, Analysts 15%, Hedge funds 10% —
  by multiplying the real total by hardcoded ratios. **The app collects no
  profession data on votes.** This is fabricated attribution presented as data,
  on a screen users make trading decisions from, and it is an App Store
  misrepresentation risk. Remove it or collect the data.
- `analysis.totalVotes` is set to `Math.random()*500+500` in three places. It is
  **not currently rendered** (line 1149 renders `pollData.total`, the real
  count) — but it is a landmine for the next person who wires it up.

### 9.10 Still open from this session's own list

1. **`market_divergences` does not exist** — independently confirmed; matches
   §6.7. `/v1/brief`'s `key_divergences` is permanently empty.
2. **`/v1/brief` and the SDK metadata.** `@integra-markets/sdk` still carried
   generator placeholders (`author: "OpenAPI-Generator"`, repo
   `GIT_USER_ID/GIT_REPO_ID`) as of 25 Aug — recheck after #59.
3. **No standard API headers** on any endpoint: no rate-limit, request-id,
   deprecation or version headers.
4. **`services/enhanced_sentiment.py` is largely dead or self-defeating** —
   `analyze_news` raises `TypeError` on every call (`KeywordDQN` has no
   `__call__` and does not subclass `nn.Module`); `market_impact` is
   `confidence` re-bucketed and `confidence` is a mean of hardcoded constants;
   `train_on_outcome` compares `direction` against `very_bullish`-style labels
   that never match, so every training call takes the penalty branch and decays
   weights to the floor. **Do not enable the learning loop before fixing the
   label spaces.**

Audit with the production probe:
https://claude.ai/code/artifact/31f95470-8a47-4731-9e63-0ea7e22a1528
