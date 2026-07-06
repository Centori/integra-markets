# Handoff — 2026-07-06

## 1. Goal

Ship a stable native iOS build (green icon, all recent Session A/B/C work included) and expose the dashboard routes (`/api-tier`, `/api-keys`, `/mcp`, `/login`) under `www.integramarkets.app` — no separate subdomain — so users can log in and access the API tier from the main marketing URL.

Longer-term: complete Sessions A/1/2/3 rollout (paywall, Stripe web checkout, MCP connector, backend `/v1/*`, historical backfill), then Phase B (RevenueCat + ASC products), then Phase C (Jeremiah reblds native with correct assets).

## 2. Current State

### Working

- **Backend on Railway** — API deployed. `/v1/*` public routes, Stripe checkout endpoint (`/api/stripe/checkout`), server-side tier enforcement all live.
- **Dashboard on Vercel** — deployed at `https://integra-dashboard-ten.vercel.app`. Build succeeds.
- **www.integramarkets.app path rewrites** — deployed. Confirmed live:
  - `https://www.integramarkets.app/` → 200 (marketing site restored)
  - `https://www.integramarkets.app/mcp` → 200 (full MCP docs page with copy-to-clipboard install snippet)
  - `https://www.integramarkets.app/login` → 200
- **npm MCP package** — `mcp/integra-mcp/` scaffolded, compiles clean, smoke-tested. Not yet published to npm registry.
- **Backend backfill pipeline** — scripts written for GDELT / CFTC COT / World Bank Pink Sheet (all functional) plus stubs for Kalshi / Polymarket / USDA / IMF. Wayback Machine ingester complete. Orchestrator ready. Nothing has been RUN yet.
- **5 new RSS feeds** wired into the live news pipeline (Rigzone, Hellenic Shipping, CNBC Energy, Mining.com, USDA).

### Broken / needs attention

- **iOS Build 63 crashed on launch** on iPhone 15 / iOS 26.5 — `expo.controller.errorRecoveryQueue` → SIGABRT. Crash log captured in session history.
- **iOS Build 64** (stripped 3 native deps to unblock launch) was submitted to ASC — user reported "the build failed again" but exact failure not confirmed (crash on launch vs Apple processing rejection vs something else). Not yet diagnosed.
- **`/api-tier` and `/api-keys`** return HTTP 500 under both `www.integramarkets.app` and `integra-dashboard-ten.vercel.app`. Root cause: three env vars not set on the Vercel `integra-dashboard` project. Fix requires user to paste `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a secret) into Vercel's dashboard.
- **No profile / navigation UX** in dashboard yet. After login there's no landing page or menu grouping API Tier + API Keys under a user account view.

### Pending user decisions

- Which UX pattern for the "API section in user profile" — three options were surfaced, no choice made yet:
  1. Top nav bar on every dashboard page with an "API" dropdown
  2. New `/account` landing page after login, with cards linking to /api-tier and /api-keys
  3. Merge `/api-tier` and `/api-keys` into ONE `/account/api` page (tier-gated view)
- Whether to strip deps further or investigate Build 64's specific failure mode.

## 3. Active Files

Grouped by area. All paths are relative to `/Users/lm/Desktop/integra/integra-markets-2/`.

### Mobile — iOS build (still stabilizing)

- `assets/icon.png`, `assets/splash.png`, `assets/adaptive-icon.png`, `assets/favicon.png`, `assets/notification-icon.png` — freshly rendered black + emerald-500 (`#10b981`) mark. Verified pixel-by-pixel.
- `scripts/render_app_icon.py` — the Pillow-based renderer that produced them; deterministic re-run.
- `app.json` — `splash.backgroundColor` changed from `#ffffff` to `#000000`.
- `app/services/supabaseService.ts` — NetInfo replaced with lazy require + "assume connected" fallback.
- `app/utils/supabaseConfig.ts` — `react-native-url-polyfill/auto` wrapped in try/catch.
- `app/components/AISentimentModal.js` — removed unused `expo-clipboard` import.
- `package.json` — removed `@react-native-community/netinfo`, `expo-clipboard`, `react-native-url-polyfill`.
- `patches/react-native+0.76.9.patch` — Xcode 26 fmt v9 patch (untouched, load-bearing).
- `MainApp.js` — imports `PaywallProvider` + `bootstrapEntitlements` (from earlier Session A).

### Web dashboard (Next.js under `dashboard/`)

- `dashboard/lib/supabase-server.ts` (**new**) — server-only Supabase client, uses `next/headers`.
- `dashboard/lib/supabase-browser.ts` (**new**) — browser-only Supabase client.
- `dashboard/lib/supabase.ts` — kept as re-export shim (browser only).
- `dashboard/app/api-keys/page.tsx` — updated import to `supabase-server`. Tier-gated on `tier === 'api'`.
- `dashboard/app/api-keys/ConnectClaude.tsx` — the reusable "Connect to Claude" panel with install snippets.
- `dashboard/app/api-tier/page.tsx` — landing page with $99/mo Stripe checkout + "Also works with Claude" callout linking to /mcp.
- `dashboard/app/api-tier/ApiTierPanel.tsx` — client Stripe checkout button.
- `dashboard/app/mcp/page.tsx` — public MCP docs page.
- `dashboard/app/login/page.tsx` — uses browser client.
- `dashboard/app/auth/callback/route.ts` — OAuth callback, uses `supabase-server`.

### Web marketing site (root `www.integramarkets.app`)

- `vercel.json` — rewrites map `/login`, `/api-tier`, `/api-keys`, `/mcp`, `/auth/*`, `/_next/*` to the dashboard project; `/(.*)` catch-all to `/index.html` (marketing SPA).
- `.npmrc` — `legacy-peer-deps=true` to unblock Vercel install step.
- `dist/index.html` — restored from git history (blob `8419880c`) after being wiped locally.

### Backend (FastAPI under `backend/`)

- `backend/api/v1_public.py` (**new**) — `/v1/sentiment`, `/v1/narratives`, `/v1/brief`, `/v1/historical/analogs`. Tier-clamped windows.
- `backend/api/stripe.py` — CheckoutRequest accepts `api_basic` / `api_history`; webhook preserves current tier from DB.
- `backend/api/subscriptions.py` — `LinkWebTierRequest.tier` pattern widened.
- `backend/services/tier_enforcement.py` — `api_basic` (90d) + `api_history` (unlimited); legacy `api` aliases to `api_basic`; `can_query_historical()` helper.
- `backend/main.py` — registered `v1_public_router`.
- `backend/data_sources.py` — `_EXTRA_RSS_FEEDS` list + `_fetch_generic_rss` helper; 5 new feeds wired into `fetch_all_sources`.
- `backend/scripts/backfill/` (**new dir**) — `common.py`, `run_all.py`, `gdelt.py`, `cftc_cot.py`, `worldbank_pink.py` (all full), plus stubs `kalshi.py`, `polymarket.py`, `usda_nass.py`, `imf_pcp.py`, `wayback.py` (full impl for Wayback).

### MCP package (`mcp/integra-mcp/`)

- `mcp/integra-mcp/package.json`, `tsconfig.json`, `README.md`, `.gitignore`
- `mcp/integra-mcp/src/index.ts`, `client.ts`, `util-zod-schema.ts`
- `mcp/integra-mcp/src/tools/sentiment.ts`, `divergence.ts`, `narratives.ts`, `brief.ts`

### Supabase migrations

- `supabase/migrations/20260703_historical_backfill_tables.sql` (**new, not yet applied**) — 5 tables: `historical_prices`, `historical_positioning`, `historical_events`, `historical_settled_markets`, `backfill_cursors`. RLS enabled with no policies (default-deny).

## 4. Changes Made

Commits in this session, oldest to newest:

| Commit | What |
|---|---|
| `67c2fdd2` | MCP scaffold + dashboard integration (/api-keys panel, /api-tier callout, /mcp docs) |
| `1de3a078` | Session 2a — `/v1/*` backend routes + Stripe SKU split (`api_basic` $99 / `api_history` $249) |
| `aa4cc2f1` | Session 2b/2c — historical backfill schema + pipeline (GDELT / CFTC / WorldBank full, others stubs) |
| `b546f570` | 5 new RSS feeds + Wayback Machine historical ingester |
| `163f6143` | Render black + emerald green icon + splash for iOS Build 68 (produced Build 63) |
| `7c006c49` | Strip 3 suspect native deps (netinfo, expo-clipboard, url-polyfill) → Build 64 |
| `de4ddd78` | Split `dashboard/lib/supabase` into server/browser for Vercel build |
| `2b3e80be` | Vercel rewrites to proxy `/login`, `/api-tier`, `/api-keys`, `/mcp`, `/auth/*` from www to dashboard |
| `76736642` | `.npmrc` with `legacy-peer-deps=true` for Vercel install |
| `b60d3f96` | Disable Vercel framework autodetection so `dist/` ships as-is |

Two Vercel deployments produced:
- `integra-dashboard` project (new) → live at `integra-dashboard-ten.vercel.app`.
- `integra-web` project (existing) → redeployed with the rewrites and restored `dist/index.html`.

One OTA update pushed:
- `eas update:roll-back-to-embedded --branch production --runtime-version 1.0.1 --message "Force Build 63 to use its embedded bundle"` — update group ID `9776c9e3-7acd-419a-b75a-4fcbe0be27c4`. Turned out not to be the fix.

## 5. Failed Attempts

Being blunt about what didn't work so we don't retread tomorrow.

- **Diagnosed the `assets/icon.png` as corrupted early on** — I was wrong. The identical-SHA-across-5-files pattern was Expo's default init, not corruption. Build 51 shipped that same file fine for months. Wasted ~10 min chasing this before user pushed back with the Build 51 metadata proving it.
- **Assumed Build 66's "different logo" was a repo-side issue** — actually turned out to be Jeremiah having built from his own fork / stale local clone that lacked our Centori-only commits. Correct diagnosis but user got there faster than my explanations.
- **Bet that Build 62's OTA rollback fix would generalize to Build 63** — it didn't. The rollback is fingerprinted per embedded bundle. New build → new fingerprint → old rollback doesn't cover it. Published a fresh rollback for Build 63; user's crash log confirmed it wasn't OTA-related anyway.
- **Bet the crash was fingerprint mismatch** — crash log timing (crashed 2h after rollback published) plus queue name (`expo.controller.errorRecoveryQueue`) pointed at native module init failure, not OTA.
- **Bet stripping netinfo + expo-clipboard + url-polyfill in Build 64 would fix the crash** — user reported "the build failed again" but the specific failure wasn't confirmed. Could still be right (different crash), could be wrong. Needs Build 64 crash log or Apple processing rejection message to know.
- **First Vercel deploy of the dashboard failed** — `next/headers` server-only import leaked into browser bundle via unified `lib/supabase.ts`. Fixed by splitting into `-server.ts` / `-browser.ts`.
- **Second Vercel deploy failed** — TS strict mode caught untyped `items` parameter. Fixed with explicit type.
- **Third redeploy of `integra-web` failed** — `npm install` eresolve conflict from `react-test-renderer` peer dep. Fixed via `.npmrc`.
- **Fourth redeploy failed** — Vercel autodetected Next.js from root `next.config.mjs` and tried to build the Expo app as Next. Fixed by adding `"framework": null` + `"installCommand": "echo skip"` + `"buildCommand": "echo skip"`.
- **Fifth redeploy served `/` as 404** — my `buildCommand: skip` config meant `dist/index.html` wasn't emitted; the folder existed but the entry point was missing. Fixed by restoring `dist/index.html` from git history (blob `8419880c`).
- **`npx expo export --platform web` failed locally** — module resolution error, almost certainly because I'd removed `react-native-url-polyfill` from `package.json`. Didn't retry; restored the static export from git history instead.

## 6. Next Steps

Ordered by priority. Anything requiring user action is marked with **You:**.

### Blocking

1. **Diagnose Build 64's specific failure.**
   - **You:** get the crash log or ASC rejection message. If it's a launch crash on device, share the crash log same way you did for Build 63. If it's an Apple processing rejection, share the email or ASC message.
   - Once we know the exact failure, decide: (a) strip more deps and rebuild, (b) roll back to Build 62's exact code + green icon (Build 65 candidate — guaranteed to launch), or (c) get Build 64's `.ipa` from Jeremiah's EAS.

2. **Finish the Vercel env vars.**
   - **You:** paste `NEXT_PUBLIC_SUPABASE_ANON_KEY` into Vercel dashboard for the `integra-dashboard` project (Production scope). Grab it from https://supabase.com/dashboard/project/zhdcpiopihqwcmicjpca/settings/api → "anon public" key.
   - **You (or me):** also set `NEXT_PUBLIC_SUPABASE_URL=https://zhdcpiopihqwcmicjpca.supabase.co` and `NEXT_PUBLIC_INTEGRA_API_URL=https://api.integramarkets.app` (I can do these two via CLI on your say-so).
   - After Vercel auto-redeploys, `/api-tier` and `/api-keys` under `www.integramarkets.app` will 200 instead of 500.

3. **Decide the profile UX pattern.**
   - Options 1 / 2 / 3 laid out in "Current State" above. My recommendation: **Option 3** (merge `/api-tier` + `/api-keys` into a single `/account/api` view, tier-gated). ~45 min to build.

### Non-blocking (queued for when the above is settled)

4. **Apply the Supabase migration** (`supabase/migrations/20260703_historical_backfill_tables.sql`) via dashboard SQL editor or `supabase db push`.
5. **Kick off backfill** — `SUPABASE_SERVICE_ROLE_KEY=... python -m backend.scripts.backfill.run_all --since 2020-01-01 --until 2026-07-01`. Takes hours, safe to interrupt (cursor-resumable).
6. **Session 2d** — replace the `/v1/historical/analogs` 501 with real analog search over the populated `historical_events` + `historical_prices` tables.
7. **Publish `@integra/mcp` to npm** so `claude mcp add integra -- npx -y @integra/mcp` works for users end-to-end.
8. **Stripe setup** — create Products + Prices in Stripe dashboard for `api_basic` ($99/mo) and `api_history` ($249/mo). Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_API_BASIC_PRICE_ID`, `STRIPE_API_HISTORY_PRICE_ID` in Railway.
9. **Phase B** — RevenueCat signup, iOS SDK key, ASC products (`basic_monthly_v1`, `basic_markets_monthly_v1`), webhook config, `npx expo install react-native-purchases`.
10. **Phase C** — once mobile build is stable, Jeremiah does the RevenueCat-linked build.

### Nice-to-have

- Rebuild the Expo web export properly (`npx expo export --platform web`) once `url-polyfill` is either re-added or the export config is updated to not need it. Currently the marketing site at `/` is a static snapshot from git history, not a fresh build.
- Point custom domain `dashboard.integramarkets.app` at the `integra-dashboard` Vercel project (optional — everything works under `www.integramarkets.app` already).
- Delete `dashboard/app/api-keys/ConnectClaude.tsx` `hasHistoryTier` prop is unused; clean up when we wire tier states more thoroughly.
