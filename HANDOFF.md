# Integra Markets — Session Handoff

**Date:** 2026-07-20
**Focus:** Emergency OTA rollback → Build 83 prep (auth, paywall, tier-gating, divergence UI, backend sentiment fix)
**Build state:** Build 83 **staged but not built/submitted** — held at user's request pending review. `app.json`: `buildNumber` **83**, `runtimeVersion` **1.0.4** (bumped from 1.0.3 to isolate from the poisoned OTA lineage).

---

## 0. Context: the OTA incident that started this session

- A prior OTA to build 82 (runtime 1.0.3) **crashed on-device** — `Invariant Violation … Registered callable JavaScript modules (n = 0)` (the AppRegistry-corruption signature). Cause: a **locally-exported bundle** whose Hermes bytecode was incompatible with the installed binary; the **hardcoded `runtimeVersion: "1.0.3"`** let it pass EAS's only compatibility gate.
- **Fixed:** rolled back via `eas update:roll-back-to-embedded --branch production --runtime-version 1.0.3` (update group `bf65b4e5`), verified the channel→branch mapping, device recovered to stable build 82.
- **Decision:** no more raw local-export OTAs on this project. Ship fixes in **native builds** (EAS Build compiles JS+native with one Hermes → can't produce this corruption). Build 83 carries everything below.

---

## 1. Auth & onboarding — fixed (all in build 83)

Root cause across the board: handlers fabricated a `Date.now()` user id and never used the real Supabase user; email confirmation was unhandled; onboarding gated on a flag no handler ever set.

- **`app/services/authService.ts`** — rewritten return contract: returns the **real Supabase user** (`mapAuthUser`), `requiresConfirmation` (sign-up with no session), and `needsEmailConfirmation` (sign-in blocked pre-confirm). Native **password-reset crash fixed** (`window.location.origin` → `integra://auth/reset-password` on native).
- **`app/components/AuthLoadingScreen.js`** — email/Apple/Google handlers now pass the **real `user.id`/email**, show a branded **"Check your email (from integramarkets.app)"** flow, and offer resend on unconfirmed sign-in.
- **`app/App.js` `handleAuthComplete`** — onboarding decision now keys off **profile completeness + persisted `onboarding_completed`**, not the never-set `skipOnboarding`. Returning users no longer re-onboard.
- **Loading splash** — the hardcoded ~3.5s bar cut to ~1s (real branding kept).
- **Email confirmation decision (user):** **Keep ON, branded.** Verification email should come from `@integramarkets.app` via **Resend** (DKIM already on the domain). **ACTION FOR USER:** confirm Supabase → Auth → Emails → SMTP Settings points at `smtp.resend.com` (else it uses the generic `noreply@mail.app.supabase.io` and is rate-limited).
- Tests: `__tests__/auth-onboarding-build83.test.js` (17, green).

## 2. Removed dead / unwired UI

- **Today-header bell** (App.js) — called `ensurePushEnabled`/`openSystemSettings`, which are **imported but never exported** → threw silently. **Removed** per user (Today page otherwise untouched). *Note: the notification-help modal's "Open Settings" button has the same missing function — left in place per the "don't touch Today" instruction; flag if you want it fixed.*
- **Alerts-header bookmark button** (`AlertsScreen.js`) — `onNavigateToBookmarks` never passed by App.js → dead. **Removed** per user.
- **API-keys section** (`ProfileScreen.js`) — BYOK is web-dashboard-only. Entire section + state + handlers + prop **removed**.

## 3. Settings dead buttons — fixed (`ProfileScreen.js`)

Screen-name mismatches meant these fell through App.js's router and no-op'd. Renamed to the canonical routes:
`Experience→EditExperience`, `MarketFocus→EditMarketFocus`, `NotificationSettings→NotificationsSettings`, `AlertFrequency→AlertPreferences`.

## 4. Paywall — rebuilt (`app/paywall/PaywallScreen.tsx`)

- Redesigned to a **Free · Pro · API** tier layout (TradingView-style hero + Monthly/Annually toggle + feature checks), Integra palette, RevenueCat wiring preserved.
- **API tier** = "Coming soon", **"Manage on web"** only (no in-app price/buy CTA — App Store compliance).
- Removed the brand icon from the hero (per user); added a **"Manage or cancel subscription"** deep-link (`apps.apple.com/account/subscriptions`) — the compliant cancellation path.
- **Feature lists reflect the new analysis gating** (see §5): Free = summary + sentiment bars; Pro = key drivers + market impact + community poll + real-time alerts + divergence + unlimited + extended feed.
- Pricing is placeholder fallback ($35/mo, $29/mo annual) — **ACTION FOR USER:** set real prices + the `basic_markets_annual` package in RevenueCat.
- Interactive preview: `~/Desktop/integra-paywall-preview.html` (self-contained; double-click to open).

## 5. AI Analysis overlay — tier-gated (`app/components/AIAnalysisOverlay.tsx`)

- **Free** sees **Summary + Sentiment bars**. **Pro** unlocks **Key Sentiment Drivers, Market Impact, Community Poll** — those three are wrapped in a `ProGate` that **blurs** the real content (expo-blur) with an **"Upgrade to Pro for full access"** overlay opening the paywall on tap.
- `isPro = tier === 'basic' || 'basic_markets'`.

## 6. Prediction-market divergence UI + logos

- Card divergence footer (`NewsCard.tsx`) now renders the **provider mark**: `PolymarketIcon` (existing) or new **`app/components/KalshiIcon.js`** (green tile mark).
- Added a **"Prediction Market" divergence line to the analysis overlay** (ungated, shown to all when data present), with the provider mark.
- **Methodology disclaimer (2026-07-21):** the overlay's Prediction Market section header has a tappable **"i" button** (`showDivergenceInfo`) → plain-language Alert explaining news-sentiment-vs-market-implied-probability + under/overpricing, framed as a research signal (not advice). **Deliberately omits proprietary internals** (no lexicon/VADER/Henry/weights/thresholds/lookback) — locked by a test that greps the copy for those terms.
- *Marks are brand-colored drawn components, not the official PNGs — drop official logos in `assets/` and swap to `<Image>` for pixel-exact fidelity.*
- **Divergence data contract confirmed by test** `backend/tests/test_divergence_card_contract.py` (4, green): cards receive `divergenceProvider` (larger |delta| wins), `divergenceStatus`, `divergenceDelta` (signed = news − market), `divergenceTopic`; footer shows only on `DIVERGENCE`.

## 7. Backend — sentiment lexicon fix (needs redeploy)

- **`backend/user_news_service.py`** — the news **feed** was scoring articles with **plain VADER (~54%)** while `main_simple_nlp.py`'s engine used the tuned **Henry + SentiBignomics** lexicon (~69%). Wired the same tuning into the feed. **ACTION:** takes effect only on the next **Railway redeploy** (`railway up --service backend --detach`). This upgrades every card's sentiment bars, drivers, market impact — and the **news leg of divergence** — to ~69%.
- **Answered:** the analysis sections are **lexicon/rule-based, not live ML** (VADER + keyword match + rule thresholds + Supabase poll votes). FinBERT is only an optional remote HF API in the non-canonical `main.py`. Good for reliability — safe to gate behind Pro.

---

## Test status

- **Our work is green:** `auth-onboarding-build83` (17), `test_divergence_card_contract` (4), plus prior suites (profile-avatar-bookmark, supabase-service-contract, legal-docs-parity, alerts-email-toggle, notifications-alerts, user-onboarding).
- **Pre-existing failures (NOT ours):** all `.ts` test files fail with a **ts-jest/Babel config** error ("Jest encountered an unexpected token") — confirmed on `socialFeatures.test.ts` which we never touched. Backend `test_sentiment_accuracy`/`test_news_fetch` fail on a **`supabase` package `create_client` import** + missing pytest-asyncio — environment issues, pre-existing.
- Every source file we edited was babel-parse-verified to compile.

---

## Open decisions / next steps for the user

1. **Build 83** — held per your instruction. When ready: bump is done; run the EAS build + submit.
2. **Backend redeploy** — the lexicon fix (§7) needs `railway up` to take effect.
3. **Supabase SMTP** — verify it points to Resend so confirmation emails are branded (§1).
4. **RevenueCat** — set real Pro prices + the annual package (§4).
5. **Divergence alert toggle → backend bridge — ✅ DONE (2026-07-21).** Added `supabaseService.saveDivergenceAlertPreferences()` (partial upsert of `divergence_alerts_enabled` / `divergence_threshold` / `divergence_topics` / `divergence_providers`, keyed `user_id`, other columns preserved) and called it from `AlertsScreen.persistDivergencePrefs`. Empty topics default to the backend's `DEFAULT_USER_TOPICS` set so the monitor (which skips empty-topic users) can actually fire. *Note: the monitor still needs the `alert_preferences` table to have the `divergence_*` columns — confirm the migration adding them is applied in Supabase before relying on push delivery.*
6. **One-off mock divergence card — ✅ DONE (2026-07-21).** `MOCK_DIVERGENCE_CARD` (App.js) is injected by `withMockDivergence()` inside `getFilteredNews()` only when real news has loaded and no live `divergenceStatus:'DIVERGENCE'` card exists; it self-drops the moment a live divergence card arrives, and never mutates/reorders other cards. Render-only (never cached via `saveFeedCache`), marked `__isMockDivergence`. Shows the Polymarket mark + footer so build 83 always demonstrates divergence.

*Tests for both:* `__tests__/divergence-bridge-mock-card.test.js` (7, green).

## API / dashboard to-do (recorded in memory: `project_api_key_dashboard_backend_fixes`)

The MCP server (`mcp/integra-mcp`) + key endpoint (`POST /api/keys`) already work; the nested dashboard (`dashboard/`, routes `/login`·`/api-keys`·`/api-tier`·`/mcp`) is **scaffolded but not deployed**. Interim = issue keys manually via curl. **Two backend fixes gate self-serve issuance AND charging for the archive:**
1. **JWT auth on `POST /api/keys`** — it currently trusts `user_id` in the body (own TODO). The dashboard already sends `Authorization: Bearer <supabase token>`; derive `user_id` from the JWT instead. Until then the endpoint is spoofable.
2. **Scope/tier enforcement in `verify_api_key`** — currently any valid key reaches `/v1/sentiment/*/history` + analogs; the "$249 archive" gate is only an MCP client-side string. Gate historical routes behind an `archive`/`history` scope + add a pytest.

Do (2) first (pure monetization hole). Neither blocks build 83 — both are backend/web, no app rebuild.

## Copy / bookmark / X-share fixes (2026-07-21) — build 83

Found + fixed real broken buttons (native → couldn't be OTA'd later, so must ship in 83):
- **Copy was broken everywhere** — NewsCard "Copy Link" and the overlay copy button both used RN-core `Clipboard.setString`, which is **undefined on RN 0.76** → "Copy unavailable". **Installed `expo-clipboard@7.0.1`** (SDK-52 matched) and switched both to `setStringAsync`.
- **Overlay copy leaked Pro content** — `formatAnalysisForCopy` copied key drivers + market impact regardless of tier. Now **gated**: Free copies summary + sentiment only (+ upgrade note); Pro gets the full analysis. Matches the on-screen blur gate.
- **Overlay bookmark was a silent no-op before analysis loaded** — guard was `if (!newsData || !analysis) return;` but `analysis` is internal state that populates after open. Relaxed to `if (!newsData) return;` + uses the fallback `analysisData`, so it works immediately.
- **NewsCard bookmark** — verified fully working (BookmarkProvider add/remove + tier-limit gate). No change needed.
- Tests: `__tests__/clipboard-share-build83.test.js` (4, green).

### X / Twitter share — how it actually behaves
`NewsCard.handleTwitterShare` opens `https://x.com/intent/post?text=<title + article URL>` via `Linking.openURL`.
- **Deep-link works** ✅ — opens the X app (universal link) or the web composer, pre-filled, **from the user's own logged-in X account**; the user taps Post.
- **Preview/screenshot** ❌ — the X **Web Intent API cannot attach images/media** (text + URL only). The card that appears on the tweet is X's own **link-preview (OpenGraph) card from the article's source URL** — NOT the Integra news card and NOT a screenshot. To attach the actual Integra card image requires capturing it with `react-native-view-shot` and sharing the file via the **native share sheet** (not the intent URL).

**BUILT (2026-07-21) — screenshot share:** `NewsCard` now snapshots the card view and shares the PNG.
- Installed **`react-native-view-shot@4.0.3`** + **`expo-sharing@13.0.1`** (SDK-52 matched, **autolinked — no app.json/plugin changes**). ⚠️ Native modules → **must be in build 83, cannot be OTA'd.**
- Card root (`TouchableOpacity`) carries `ref={cardRef} collapsable={false}`; `handleImageShare()` = `captureRef(cardRef,{png,0.95})` → `Sharing.shareAsync(uri)` → native sheet → user picks X (or any app) and posts with the **card image attached**.
- **iOS** share menu reordered: *Share Card Image · Share on X (link) · Email · Copy Link · More Options.* **Android** gets an Alert: *Share Card Image / Share Link.*
- Note this is **100% frontend/native** — no backend involvement. The text-only "Share on X (link)" option is kept for those who want the source OG-card preview.
- Tests: `__tests__/clipboard-share-build83.test.js` (now 7, green).

## ▶ RESUME HERE (2026-07-22) — RevenueCat / App Store Connect setup, mid-flight

**Project:** RevenueCat project `5109aaa4`. ASC app `6749469306`, bundle `com.centori.integramarkets`, team `2ABHLWV763`.

**DONE so far:**
- ✅ Code side fully wired: SDK installed, `loadPurchases()` live, `bootstrapEntitlements` called on startup, public key `appl_KkZPpwqYwBZmRDTIcKjfBRdUdjB` in `subscriptionService.ts:16`.
- ✅ RevenueCat **App Store app** "Integra Markets (App Store)" added (earlier the project only had a **Test Store** — products first got created there by mistake; now recreated under App Store).
- ✅ Two **products** exist under the App Store app: `com.centori.integramarkets.basic_markets_monthly` and `…basic_markets_annual`. Status = **"Could not check"** (expected — the App Store Connect subs don't exist yet).
- ✅ **Entitlement `basic_markets`** created with BOTH products attached (App Store). **Complete — don't touch.**
- ✅ **Offering `default`** exists with Monthly + Annual packages, BUT products **not yet attached** to packages.

**BLOCKED ON:** attaching products to the offering packages fails with *"Cannot attach an inactive product."* Products are inactive because the **App Store Connect subscriptions don't exist yet**. They go active automatically once created in ASC.

**NEXT STEPS (in this order):**
1. **App Store Connect → create the 2 subscriptions** → https://appstoreconnect.apple.com/apps/6749469306/distribution/subscriptions
   - Subscription Group: `Integra Pro`
   - Sub 1: Ref name `Integra Pro Monthly`, Product ID `com.centori.integramarkets.basic_markets_monthly`, **1 Month**, **$34.99**
   - Sub 2: Ref name `Integra Pro Annual`, Product ID `com.centori.integramarkets.basic_markets_annual`, **1 Year**, **$349.99**
   - Each needs: Localization (display name + description) + a review screenshot, or it stays incomplete.
   - ⚠️ Price + duration are **permanent** once saved. Annual is discounted on purpose ($349.99 = "2 months free" ≈ 17% off; NOT 34.99×12).
2. Once ASC subs exist → RevenueCat products flip to **active**.
3. **RevenueCat → Offerings → default → Edit** → attach `…monthly` to Monthly package, `…annual` to Annual package → Save. → https://app.revenuecat.com/projects/5109aaa4/product-catalog/offerings
4. Then testable via TestFlight/sandbox purchase.

**STILL PENDING (separate, code side — not started):** re-lock the `free_trial` trial gates in `entitlementGate.ts` + `backend/api/news_feed.py` before charging, or Pro is free. Offered to do this; user hasn't said go.

**Also still open from earlier:** screenshot-share "hide action glyphs on capture?" decision; verify `app.json` has `scheme: "integra"` for auth deep links (flagged, not checked).

---

## RevenueCat — LIVE purchases wired (2026-07-21)

Was fully stubbed (`loadPurchases()` returned `null` → everything degraded to `free_trial`; SDK not installed; `bootstrapEntitlements` never called). Now wired for real:
- **Installed `react-native-purchases@10.4.4`** (autolinked). ⚠️ Native → build 83, cannot OTA. *Verify this version pods-installs on EAS; if it fails, pin to the 8.x line that pairs with SDK 52.*
- **`subscriptionService.loadPurchases()`** now `require('react-native-purchases')`, guarded to `Platform.OS === 'ios'` (the only wired platform) + try/catch. The old lazy-require SIGABRT only happened when the module was **missing**; present + guarded, it resolves.
- **`App.js`** now calls `bootstrapEntitlements(userData.id)` once (a `useRef`-guarded effect that fires when `userData` first appears — covers restore/login/guest).
- Paywall purchase/restore flow verified end-to-end (`fetchCurrentOffering` → `purchasePackage` → `refresh`; handles `userCancelled`).
- Tests: `__tests__/revenuecat-live-build83.test.js` (5, green).

**YOU must configure the dashboards before charging (code can't do this):**
1. **App Store Connect** → create 2 auto-renewable subscriptions. Product IDs must contain `basic_markets_monthly` and `basic_markets_annual`.
2. **RevenueCat** → add both as **packages** in the **current** Offering with identifiers `basic_markets_monthly` / `basic_markets_annual`; create entitlement **`basic_markets`** (and `basic`) granted by those products.
3. ✅ **DONE** — iOS **public** SDK key `appl_KkZPpwqYwBZmRDTIcKjfBRdUdjB` set in `subscriptionService.ts:16` (2026-07-22).
4. Set the real prices in ASC (fallback in code is $35/mo, $29/mo-annual).
- **Until (1)-(3) are done, the paywall shows "Subscriptions unavailable"** (proPackage resolves undefined) — it fails safe, no crash.
- **Also re-lock trial gates before charging** (SYSTEM_MAP punch-list #1): remove `free_trial` from Markets features in `entitlementGate.ts` **and** `backend/api/news_feed.py`.

## Build-83 interactive-element audit (2026-07-21) — ship-once check

Swept every `onPress`/`onValueChange`/`Linking`/nav handler on the **reachable** Free+Pro paths (3 tabs: Today/Alerts/Profile + all modals). **Result: no dead buttons on any reachable path.**
- **Auth, Today (NewsCard star/press/bookmark/source/share), Analysis overlay (source link, refresh-summary, 3× poll vote, bookmark, copy, close, tour, Pro-gate upgrade), Alerts (all toggles + threshold chips + monitoring + clear + refresh + tap/delete + →AlertPrefs), Profile (edit profile/market-focus/experience/alert-prefs/notifications/legal/bookmarks/upgrade/logout/delete), Paywall (subscribe/billing toggle/restore/manage-cancel/dashboard/close), Edit modals (profile + alerts save paths), Legal (close + Contact mailto)** — all wired to real handlers. ProfileScreen settings names all match App.js's `onNavigateToSettings` router.
- **One unreachable stub:** `TodayDashboard.js:491` "available in the next update" Alert — but `TodayDashboard` is NOT mounted (App.js renders `NewsCard` directly), so it's dead code, not a live button.
- **Built-but-dormant screens (NOT wired to nav — intentional, not dead buttons):** `BookmarksScreen.js` (bookmarks ship inline in Profile instead), `PredictionMarketList/Card` + `TradeModal` + `kalshiService` (divergence ships via cards instead), `AISentimentModal` (AI chat — `.disabled` per Build-26 stability). None are promised in the paywall copy, so no overpromise.
- **Ship-once implication:** any NEW nav-visible surface added later needs a native rebuild. The features that improve *without* a rebuild (data, sentiment accuracy, divergence signals, archive, push delivery) are all already surfaced in shipped UI (cards/overlay/alerts + the mock divergence card). The only "decide before 83" item is whether to wire AI chat / a standalone prediction-market browser now vs. accept a future rebuild — **recommendation: keep dormant** (not promised; re-enabling chat risks the Build-26 crash class).

## Phase-2 follow-ups (recorded in memory)

- **Full historical archive → API tier / web dashboard.** Mobile Pro softened to "Extended news feed." `historyDays` is defined but unconsumed; Load More only reveals the current batch. (`project_historical_archive_followup`)
- **Poll as a 3rd divergence leg** (news / crowd / market). Currently the poll never reaches the prediction cards. Verify the `entity_mentions` writer uses the tuned lexicon. (`project_poll_third_divergence_leg`)
- **Web↔mobile parity (items 4/5/8)** — profile category icons differ, web About still has icons (mobile already bulleted), web lacks the poll open/close toggle, web feed ≠ mobile feed. **Blocked:** the web app (`integra-web`) is a **separate Next.js/Vercel project, not in this repo.**
- **Web/mobile sync** — no WhatsApp-QR needed; you already have Supabase accounts (same login = same data). For live cross-device sync use `@supabase/supabase-js` **Realtime** (same code web + RN).

## Source files changed this session

```
app.json                              (buildNumber 83, runtimeVersion 1.0.4)
app/App.js                            (Today bell removed, onboarding fix)
app/services/authService.ts           (real user + confirmation + native reset)
app/components/AuthLoadingScreen.js    (real ids, check-email flow, faster splash)
app/components/ProfileScreen.js        (API keys removed, settings renames)
app/paywall/PaywallScreen.tsx          (Free/Pro/API rebuild, cancel link, gated feature copy)
app/components/AIAnalysisOverlay.tsx   (Pro-gate blur, divergence line + logos)
app/components/NewsCard.tsx            (divergence provider marks)
app/components/KalshiIcon.js           (NEW — Kalshi mark)
app/components/AlertsScreen.js         (dead bookmark button removed)
backend/user_news_service.py           (tuned VADER lexicon — NEEDS REDEPLOY)
app/services/supabaseService.js        (NEW saveDivergenceAlertPreferences — toggle→backend bridge)
app/components/AlertsScreen.js          (persistDivergencePrefs now upserts to Supabase)
app/App.js                             (MOCK_DIVERGENCE_CARD + withMockDivergence injector)
app/components/NewsCard.tsx             (expo-clipboard; card-image capture+share; logo-fallback brand gradient)
app/components/AIAnalysisOverlay.tsx    (expo-clipboard; copy gated Free/Pro; bookmark guard relaxed)
app/services/subscriptionService.ts    (RevenueCat loadPurchases restored — LIVE, iOS-guarded)
app/hooks/useEntitlement.ts             (unchanged; bootstrapEntitlements now actually called)
package.json / package-lock.json        (+expo-clipboard@7.0.1, +react-native-view-shot@4.0.3, +expo-sharing@13.0.1, +expo-linear-gradient@14.0.2, +react-native-purchases@10.4.4 — NATIVE, build 83)
__tests__/clipboard-share-build83.test.js         (NEW — 7 tests)
__tests__/auth-onboarding-build83.test.js         (NEW — 17 tests)
__tests__/divergence-bridge-mock-card.test.js     (NEW — 7 tests)
backend/tests/test_divergence_card_contract.py    (NEW — 4 tests)
```
*(Nothing committed yet — all changes are in the working tree. `coverage/` and `dist/` diffs are auto-generated test artifacts, ignore them.)*
