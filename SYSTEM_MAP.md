# Integra Markets — System Map & Debugging Reference

> **Purpose:** a surgical-debugging reference. When a feature misbehaves, find it
> below, jump to its files/endpoint, and check the listed failure modes before
> changing anything. Keep this current when features move.
>
> Last full assessment: 2026-07 (build 82 era). Visual version: published Artifact
> "Integra Markets — System Map & Assessment".

## What the app is

Commodity-trading **sentiment intelligence**. Ingests financial news (oil/gas/ag/
metals) → scores it with a stack of models (VADER + FinBERT + commodity lexicons +
Groq LLM) → bullish/neutral/bearish + score. Signature feature: **divergence** —
news sentiment vs prediction-market (Polymarket/Kalshi) implied probability, flagging
where the crowd and the news disagree. Three surfaces over one Supabase backbone:
iOS app (Expo/RN), web app (Next.js/Vercel), and a productized data API (`/v1/*`).

## Architecture

- **Mobile:** Expo SDK 52, RN 0.76. Root = `app/App.js` (~2100 lines) gating 3 tabs behind auth.
- **Web:** Next.js on Vercel (`integra-web` project, `render-deploy` branch). Live at www.integramarkets.app.
- **Backend:** FastAPI on Railway (project `integra-markets-backend`, service `backend`). Entry = `backend/main.py` (a bridge that also mounts `main_simple_nlp.py`'s legacy routes). API at api.integramarkets.app.
- **Data:** Supabase Postgres (project ref `zhdcpiopihqwcmicjpca`), RLS keyed to `auth.uid()`.
- **Accounts:** EAS builds on **ak88** (proj `e9868cd6`); OTA channel `production` on the same project. See `PROJECT_RULES` / memory for account map.

## The #1 debugging rule

**Most "not working" user-facing bugs = no session.** RLS blocks profile, alerts,
votes, and cross-device sync when there's no signed-in user. Before debugging any of
those individually, confirm sign-in succeeded (`supabase.auth.getSession()` non-null).
One successful sign-in heals the whole downstream set.

---

## Mobile — feature → files → failure modes

### Auth & onboarding
| Feature | Files | If it fails, check |
|---|---|---|
| Sign in (Google/Apple/email + guest Skip) | `app/components/AuthLoadingScreen.js`, `app/services/authService.ts` | Supabase Google provider: **web client `btsk2…` must be FIRST** in Client IDs; **Skip nonce checks ON**; Apple Client IDs = `com.centori.integramarkets`. Google iOS client = `nk0je…`. Errors "Unacceptable audience"/"nonce" = provider config, not code. |
| Onboarding (profile + alerts setup) | `EditProfileModal.js`, `EditAlertsModal.js` | Writes need a session (RLS). Column names: `profiles` uses `company`/`experience_level`/`avatar_url` (NOT institution/experience/photo). |

### Tab 1 — Today
| Feature | Files | If it fails, check |
|---|---|---|
| News feed (cards) | `app/App.js` (renders `<NewsCard>` in FlatList ~L1544), `app/components/NewsCard.tsx`, `app/services/api.js` (`dashboardApi.getTodayDashboard`) | Feed source = **POST `/api/news/feed`** (NOT `/api/news/analysis` — that's a single-text analyzer that 422s). App.js maps + sorts newest-first (~L427) via `timestamp`. |
| Card image + sentiment pill + long-press | `NewsCard.tsx` | Image = `item.image_url` else `assets/NewLogoInt.png.png` fallback. Needs `expo-haptics` (native → requires build, not OTA). Badge = bottom-left dark pill w/ `formatScore`. |
| Integra Analysis overlay | `app/components/AIAnalysisOverlay.tsx` | Summary refresh = `/api/summarize/article` (needs `newsData.sourceUrl`/`url`). AI overlay count tier-limited. |
| Community poll | `AIAnalysisOverlay.tsx` + `app/services/supabaseService.js` (`submitPollVote`/`getPollResults`/`getUserVote`) | Table `sentiment_votes` + RPC `get_poll_results`. Article key = `title.replace(/\s+/g,'-').toLowerCase().slice(0,50)` (must match web). X-toggle state = `pollCollapsed`. |
| Sentiment filters | `TodayDashboard.js` (`filterOptions`), `entitlementGate.ts` | Divergence chip gated to `basic_markets` via `canAccess('divergence_filter', tier)`. |

### Tab 2 — Alerts
| Feature | Files | If it fails, check |
|---|---|---|
| Alerts feed | `app/components/AlertsScreen.js`, `notificationPersistenceService.js` | — |
| Alert preferences | `EditAlertsModal.js` → `supabaseService.saveAlertPreferences` | Table `alert_preferences`, keyed `user_id`. Custom RSS + divergence alerts tier-gated. |
| Push notifications | `notificationService.js`, `realtimeNotificationService.js` | Register = `/notifications/register-token`. Batched (free) vs realtime (`basic_markets`). |

### Tab 3 — Profile
| Feature | Files | If it fails, check |
|---|---|---|
| Profile + avatar edit | `ProfileScreen.js`, `EditProfileModal.js` → `supabaseService.updateProfile`/`uploadAvatar` | **Edit buttons route via `onNavigateToSettings` in App.js** — cases `EditProfile`/`AlertPreferences` must exist (were missing → silent no-ops, fixed build 82). Avatar → `avatars` storage bucket. |
| Bookmarks | `BookmarksScreen.js`, `app/providers/BookmarkProvider.tsx` | Local-first (AsyncStorage `integra_bookmarks_v2`) + syncs to `bookmarks` table on sign-in. Slug must match web. Tier-limited count. |
| Legal/account | `PrivacyPolicyModal.js`, `TermsOfServiceModal.js`, `About.js`, `DeleteAccountModal.tsx` | Privacy mirrors web `/settings/privacy`. Contact = contact@integramarkets.app. |

### Prediction markets & paywall
| Feature | Files | If it fails, check |
|---|---|---|
| Prediction markets | `PredictionMarketList.js`, `PredictionMarketCard.js`, `kalshiService.js` | Kalshi reads are **keyless** (`api.elections.kalshi.com`). Gated to `basic_markets`. |
| Paywall | `app/paywall/PaywallScreen.tsx`, `PaywallProvider.tsx`, `UpgradePrompt.tsx` | Tiers: Basic $19, Basic+Markets $35. **Trial gates currently OPEN for eval** — `entitlementGate.ts` has `free_trial` added to Markets features; REMOVE before charging. |

---

## Backend — endpoint → purpose → failure modes

Base: `https://api.integramarkets.app` · Health: `GET /health` (returns `supabase_connected`).

### News & sentiment (the data-science core)
| Endpoint | Purpose | Notes / failure modes |
|---|---|---|
| `POST /api/news/feed` | **Live** feed handler | Served by `backend/api/news_feed.py` (NOT main_simple_nlp). Pulls `UserNewsService.get_user_based_news`. Sorts, tier-clamps, enriches divergence + images. |
| `GET /api/news/latest` | Unanalyzed fallback feed | — |
| `POST /api/news/analysis` | Single-text analyzer | **422 on empty body — NOT a feed endpoint.** Do not point the app feed here. |
| `GET /api/sentiment/market`, `/movers` | Market snapshot + movers | — |
| `POST /api/dashboard/sentiment-engine` | Full sentiment engine | VADER+FinBERT+lexicon+Groq. |
| `GET /api/lexicon/commodities[/{c}]` | Commodity sentiment dictionaries | SentiBignomics-derived. |

**Image enrichment** (`user_news_service.py` + `data_sources.py` `enrich_images`/`_extract_image`):
RSS media (yahoo/oilprice/investing) + og:image on direct URLs. **Google News URLs are opaque
stubs → skipped → brand-mark fallback.** Concurrent, 4s timeout, fully isolated (can't break feed).

### Prediction markets & divergence
| Endpoint | Purpose | Notes |
|---|---|---|
| `/kalshi/*` | Kalshi events/markets/portfolio/trade | Reads keyless; trade needs user keys. |
| `/api/prediction-market/polymarket/*` | Polymarket sentiment + connectors | Per-user rows in `prediction_market_connectors`. |
| `GET /v1/markets/divergence[/{topic}]`, `/overlay` | **Divergence engine** | `services/news_enricher.py`: `divergenceDelta` ∈ [-2,+2], status ALIGNED/DIVERGENCE/NO_DATA. **API-key gated.** |

### AI, agent & public API
| Endpoint | Purpose | Notes |
|---|---|---|
| `/ai/analyze`, `/ai/chat`, `/ai/report`, `/api/comprehensive-analysis` | LLM analysis/chat/reports | Backend live; some **mobile chat components are `.disabled`**. |
| `/v1/agent/ask`, `/v1/agent/templates` | Named analyst prompts | Templates: `interpret_today`, `trend_30d`, `divergence_check`. Key-gated. |
| `/v1/commodities`, `/brief`, `/historical/analogs`, `/markets/*` | **Public data API** (sellable) | **Enforces API keys** — unkeyed = `{"detail":"missing or malformed API key"}`. |

### Billing, notifications, keys
| Endpoint | Purpose | Notes |
|---|---|---|
| `/api/stripe/checkout`, `/webhook` | Stripe billing | API tiers $99 (90-day) / $249 (full archive). **Depends on `STRIPE_SECRET_KEY` + `STRIPE_API_*_PRICE_ID` env — verify before charging.** |
| `/api/subscriptions/entitlement`, `/link-web-tier` | Entitlement lookup, web→app link | — |
| `/api/keys` (+ DELETE) | API key management | Backend live; **no web console UI yet**. |
| `/notifications/*` | Push register/prefs/send | Drives mobile Alerts. |
| `/api/feedback`, `/api/news/train`, `/api/metrics/learning` | Learning loop | Feedback → retrain → accuracy metrics. |

### Backend deploy
`railway up --service backend --detach` from repo. Container runs `uvicorn main:app`.
`main.py` bridges `main_simple_nlp.py` routes. Health stays up during deploy (zero-downtime).

---

## Web — routes (Next.js / Vercel)

| Route | Purpose | Status |
|---|---|---|
| `/` | Landing (features, how-it-works, store links) | live |
| `/signup`, `/login` | Auth (Google web login via `btsk2…` client) | live (fixed) |
| `/onboarding` | Profile + alert prefs setup | live |
| `/dashboard` | Today feed + bookmarks + analysis + poll | live |
| `/alerts` | Alert preferences | live |
| `/settings/{privacy,terms,about}` | Legal | live |
| `/account`, `/account/api` | **API console + keys** | **404 — planned, not built** (web's intended lead) |

Web calls the same Supabase tables as mobile (one identity/bookmarks/votes).
Note: web bundle references the old Render backend `integra-markets-9zz1.onrender.com` for some calls.

---

## Data model (Supabase — RLS on `auth.uid()`)

`profiles` (identity, role, `experience_level`, `market_focus`, `company`, `bio`, `linkedin`, `avatar_url`) ·
`alert_preferences` (commodities, regions, currencies, keywords, `website_urls`, frequency, threshold, push/email flags) ·
`sentiment_votes` (+ `get_poll_results` RPC) ·
`bookmarks` (article_id slug, title, url, source, sentiment, sentiment_score) ·
`avatars` (storage bucket) · `saved_analyses` · `push_tokens` · `user_preferences` ·
`prediction_market_connectors` · `account_deletion_requests`

**Gotcha:** mobile-only table `user_profiles` does **not** exist (404). Use `profiles`.

## Tiers (`app/services/entitlementGate.ts` — single source of truth)

| | Free Trial | Basic $19 | Basic+Markets $35 | Data API $99–249 |
|---|---|---|---|---|
| bookmarks | 5 | 50 | ∞ | — |
| alerts | 3 | 10 | ∞ | — |
| commodities | 2 | 5 | ∞ | — |
| AI/day | 5 | ∞ | ∞ | — |
| history | 1d | 30d | ∞ | full archive |
| articles/session | 20 | 50 | 100 | — |
| custom RSS | 0 | 3 | 10 | — |
| alert types | news | +sentiment | +divergence | — |
| push | batched | batched | realtime | — |
| prediction markets | — | — | ✓ | — |
| programmatic API | — | — | — | ✓ keys |

---

## Known symptom → root-cause table (fast triage)

| Symptom | Root cause | Fix location |
|---|---|---|
| Profile won't load | Reading `user_profiles` (404) or no session | `userService.ts`/`supabaseService.js` → `profiles`; confirm sign-in |
| Alerts/profile "error saving" | supabaseService method missing or no session | `supabaseService.js` (full April service must be present) |
| Poll votes vanish | Missing `submitPollVote`/RPC or no session | `supabaseService.js`, `sentiment_votes` table |
| No news cards | Feed hitting `/api/news/analysis` (422) | `api.js` → use `/api/news/feed` |
| Cards all fallback logos | Feed is Google-News-only URLs | add direct feeds in `user_news_service.py` |
| Google sign-in "audience"/"nonce" | Supabase provider config | web client first + Skip-nonce ON |
| Web login `deleted_client` | Supabase using a deleted OAuth client | set primary Client ID to live `btsk2…` |
| App crashes on launch (SIGABRT) | runtime `require()` of missing pkg, or missing anon key, or gutted `app/App.js` | see memory `project_ios_crash_runtimeversion` |
| OTA never arrives | `updates.url` ≠ `projectId`, or wrong account token | app.json `updates.url` must match `extra.eas.projectId` |

## Punch-list before monetizing
1. **Re-lock trial gates** — remove `free_trial` from Markets features in `entitlementGate.ts`.
2. **Verify Stripe** live keys + price IDs in Railway env.
3. **Build web API console** (`/account/api`) — key creation + Mintlify docs.
4. **Re-enable mobile AI chat** (currently `.disabled`).
