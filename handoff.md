# Handoff — 2026-08-23

> Supersedes the 2026-07-06 handoff entirely. Everything below was verified in
> source or against live production during the 20–23 Aug session; findings that
> turned out to be wrong are called out as such rather than deleted, because two
> of them were believed for days and will otherwise be re-derived.

## 1. Goal

Launch the API tier. **User decision, 23 Aug: one paid tier at $99/mo** —
everything in the lower consumer tiers, plus API access, plus sentiment queries
over a **7–30 day window**. The **$249 archive tier is dropped from launch** and
must not be built, priced or advertised until the archive is genuinely queryable.

That decision resolves a contradiction: real queryable depth is ~57 days, so the
previous 90-day cap sold a window wider than the data, and $99 vs $249 returned
identical output. A 7–30 day window sits *inside* what exists.

## 2. Deploy topology — read this before touching anything

This has caused recurring confusion across several sessions. Verified via the
Vercel API on 23 Aug:

```
www.integramarkets.app
 └─ Vercel project  integra-web
     └─ rootDirectory  web/
         └─ GitHub  Centori/integra-markets     <-- THE repo
             └─ production branch  main
                 └─ ssoProtection  all_except_custom_domains
```

`dashboard.integramarkets.app` = Vercel project `integra-dashboard`,
rootDirectory `dashboard/`, same repo.

**`jeremiahMshelia/integra-markets` is NOT the web repo.** Its `main` is stuck at
2026-06-29 and has no `web/` directory (`contents/web` → 404) and no `mcp/`.
PRs there do not reach production. PR #18 ("move profile sidebar left") sat there
unmergeable for weeks for exactly this reason; it was redone as PR #24 here.

### The trap that cost hours
`ssoProtection: all_except_custom_domains` means **every preview URL is behind
Vercel SSO**. `curl` against a preview returns **HTTP 200 with the SSO login
page** — ~477KB of generic HTML that looks like a successful fetch of a stale
site. Do not verify previews with curl/grep. Verify by building locally and
grepping `.next/server/app/*.html`, or by checking the custom domain after merge.

## 3. Current state

### Live on www (merged + deployed 23 Aug, PRs #23 and #24)
- Account deletion — modal, non-dismissible pending banner, `lib/accountService.ts`.
  Same two Supabase Edge Functions and same `account_deletion_requests` row as
  mobile, so a deletion scheduled on either surface shows on both.
- **Session refresh middleware** (`web/src/middleware.ts`). `@supabase/ssr` keeps
  sessions in cookies with short-lived tokens and nothing refreshed them
  server-side, so returning users were bounced to /login despite a valid refresh
  token. Calls `getUser()`, never `getSession()`. Refresh only, no redirects.
- Profile pane opens from the **left**.
- News-card image fallback renders the **"integra" wordmark** over the brand
  gradient, matching mobile build 88.
- **Divergence badge** on news cards. The feed always sent `divergence*` fields
  (~⅓ of articles); `NewsItem` never declared them.
- Landing "Key Management" card → **MCP connector card**. It and **Webhooks**
  now carry "Soon" pills — neither is reachable by a customer.
- Removed `@supabase/auth-helpers-nextjs` (deprecated, imported nowhere).

### Mobile
Build 88 **cleared review**. Its in-flight work is committed at `fd1cc16e` in
`/Users/lm/Desktop/integra/integra-markets-2` (branch `build64-exact`): wordmark
component, `alertMatcher`, and 5 regression suites — **43 tests passing**.
`coverage/` and `dist/` deliberately left unstaged.

## 4. Blocking the first dollar

All confirmed in source. Items 1, 2 and 6 are one circuit — **one change closes
all three**: derive scopes server-side from the subscription at mint time, and
re-derive in `verify_api_key` so cancellation revokes.

| # | Blocker | Where | Effect |
|---|---------|-------|--------|
| 1 | Scopes taken from the request body, unvalidated | `backend/api/api_keys.py:77` | Any signed-in free user mints an `archive` key |
| 2 | Nothing writes `api_keys.scopes` on purchase | `backend/api/stripe.py` webhook | Paying customers get `scopes: []` → 403 on what they bought |
| 3 | Depth check measures window **width**, not **age** | `backend/api/sentiment_history.py:163` | Paginate `from=2015-01-01&to=2015-03-01` → full archive |
| 4 | `/v1/agent/ask` unscoped and uncapped | `backend/api/agent_ask.py:94` | Bypasses the gates; ≤13 Groq calls/request. Only unbounded cost |
| 5 | `link-web-tier` takes tier from the body | `backend/api/subscriptions.py` | Self-grant $35 mobile tier; clobbers RevenueCat rows |
| 6 | Cancellation never revokes | `effective_tier` SQL | Expiry lists `'api'` but not `api_basic`/`api_history` |

Also apply with the pricing decision: `HISTORY_DEPTH_CAP_DAYS` **90 → 30**
(`backend/services/api_key_auth.py`), and park `STRIPE_API_HISTORY_PRICE_ID`.

## 5. The archive — it has been building, into tables nothing reads

This is the single most misunderstood area. The backfill **has** been running:
GDELT's cursor advanced 2020-01-26 → 2020-07-20 during this session.

**But none of it is reachable by the API:**
- GDELT writes `historical_events` — **zero endpoints query that table**.
- Wayback writes `raw_documents` — never scored, so never becomes `entity_mentions`.
- `entity_mentions` is the **only** table `/v1/sentiment/*/history` and `/daily`
  read, and its `extracted_at` is `default now()`, never set from publication
  date (`supabase/migrations/20260624_historical_archive.sql:93`). Anything scored
  lands on the backfill date regardless of article age.

Result: **~57 days of queryable depth, 5,733 rows** (measured in migration
`20260814`). More backfilling does not fix this.

Two fixes convert stored work into a sellable archive:
1. A **scoring pass** `raw_documents` → `entity_mentions`.
2. A real **`published_at` axis** on `entity_mentions`, indexed
   `(entity, published_at desc)`, with `/history`, `/daily` and the depth check
   repointed at it.

Throughput, separately: `wayback.py:34` imports `write_cursor` but **not**
`read_cursor`, so every run re-enumerates from 2020-01-01, hits `cap_per_host
2000`, and re-upserts settled documents — burning ~3h and throttling GDELT from
~96 runs/day to ~7. Fixing that one import takes the ETA from **~100 days to ~8**.

## 6. Corrections to earlier beliefs

Recorded because each was believed and acted on:

- **"Bookmarks never sync between mobile and web"** — **false**. `BookmarkProvider.tsx`
  in the live mobile repo reads remote rows, pushes local-only ones, inserts on
  add, deletes on remove. AsyncStorage is a cache. The error came from reading
  `app/` inside *this* repo, which is a stale build-54-era copy.
- **"Production runs code in no git remote"** — **false**. Every file is on
  `Centori/integra-markets@main`; a local clone had corrupted objects.
- **"PyJWT/stripe missing → everything 503s"** and **"/kalshi/* fully
  unauthenticated"** — **false in production**. Live probes return 401, not 503.
- Alert preferences **are** half-synced: mobile upserts the Supabase row but
  `AlertsScreen.loadAlertPreferences()` reads only AsyncStorage. **One-way.**

## 7. Next steps

### Blocking
1. **Derive scopes server-side** — closes blockers 1, 2, 6.
2. Fix `link-web-tier` the same way.
3. Age-not-width; scope-gate and cap `/v1/agent/ask`.
4. Park the $249 Stripe price; set depth cap to 30.
5. Ship a `data_coverage` envelope. Today a request for a 3-year window returns
   **those dates echoed back** over ~57 days of data — an affirmative
   misstatement on a paid response, and ~20 lines to fix.
6. Read `api_key_usage` once. It has logged every authenticated request and
   nothing has ever queried it. Answer "is anyone using this" before pricing.

### Queued
7. Mobile **alert-prefs read path** — the one-way sync. Pure JS, ships as an OTA
   now that 88 has cleared.
8. **API section in the web profile drawer** — do this *after* step 1. The
   mockup's "choose your scopes" affordance should not exist; the server decides
   from the subscription.
9. Archive: wayback cursor → scoring pass → `published_at` axis.
10. Fill **NAT GAS and COPPER** — live check shows 0 samples each; WHEAT 1,
    CORN 3. Two of six headline commodities are empty. This is the $99 product.

### Infrastructure
11. `@sentry/nextjs` and a web test runner (`vitest` + `@testing-library/react`).
    Web has **zero tests**; mobile has 43. Every bug this session was caught by a
    person looking.
12. Inbound rate limiting (`redis` + `limits`). The only limiter in the tree is
    outbound to Kalshi.

## 8. Loose ends

- A stray Vercel project named **`web`** was created by accident on 23 Aug
  (`web-one-lyart-39.vercel.app`). Inert, no env vars — **delete it**.
- **`Lint + Jest` CI is misconfigured**: the workflow runs `npm install` in
  `app/`, where no `package.json` exists on `main`. It therefore fails on every
  PR regardless of content, and PRs #23/#24 were merged with `--admin` over it.
  CI currently means nothing; fix the path or the checks are theatre.
- Docs still advertise **$199/$699 seat plans** and "webhooks and streaming
  included in every plan". None exist. The landing cards were fixed; `docs/` was not.
- The **Historical Archive** landing card claims "34 commodity and macro topics
  for backtesting" against ~57 days of data. Same overclaim class.

## 9. Reference

- Launch checklist — https://claude.ai/code/artifact/7f27aade-f692-480b-9669-f42c1655b817
- Parity report — https://claude.ai/code/artifact/240b81d9-1ad8-45b1-8b85-320a716d62e1
- Web assessment — https://claude.ai/code/artifact/fddcfa0c-97ff-427c-846a-37e00b544354
- Profile-pane + API mockup (**design intent, not shipped**) —
  https://claude.ai/code/artifact/a4f962c4-f11a-41f0-bbf3-e1d2f0cfe703
