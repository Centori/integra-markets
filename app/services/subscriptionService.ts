// Thin wrapper around RevenueCat SDK. Nothing in the rest of the app should
// import `react-native-purchases` directly — always come through here so we
// can swap the vendor later without touching the UI.
//
// Requires the native module `react-native-purchases` to be installed AND
// present in the native binary (`npx expo install react-native-purchases`
// + a new native build via `eas build`). Until Jeremiah ships Build 65 with
// this module, all methods here degrade gracefully to `free_trial`.

import { Platform } from 'react-native';
import type { Tier } from './entitlementGate';

// ⚠️ REPLACE_ME — paste your iOS Public SDK key from RevenueCat dashboard
// (Project Settings → API Keys → iOS). Starts with `appl_`. This is public;
// safe to commit. Do NOT paste the Secret V2 key here.
const REVENUECAT_IOS_API_KEY = 'appl_KkZPpwqYwBZmRDTIcKjfBRdUdjB';

// Entitlement identifiers as configured in RevenueCat dashboard. When a user
// subscribes to `basic_markets_monthly_v1`, RC should grant both entitlements
// (configured server-side — see docs).
const ENTITLEMENT_IDS = {
  basic: 'basic',
  basic_markets: 'basic_markets',
} as const;

let _initialized = false;
let _cachedTier: Tier = 'free_trial';

// react-native-purchases is now installed and linked into the native binary
// (build 83+, via `npx expo install react-native-purchases`). The historical
// SIGABRT came from lazy-requiring a MISSING module — Metro's guardedLoadModule
// routes that outermost failure to ErrorUtils.reportFatalError, bypassing any
// local try/catch. With the module present AND the require guarded to iOS (the
// only wired platform), it resolves cleanly; web/Android bundles never execute
// the require and fall back to free_trial.
function loadPurchases(): typeof import('react-native-purchases') | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-purchases');
  } catch (err) {
    console.warn('[subscriptions] react-native-purchases not linked:', err);
    return null;
  }
}

/**
 * True when the native react-native-purchases SDK is actually linked into this
 * binary. Lets the paywall distinguish "this build has no purchases SDK" (a real
 * build problem — needs a new TestFlight build) from "the SDK is here but the
 * plan/offering isn't live yet" (a RevenueCat / App Store Connect config gap —
 * a rebuild won't help). iOS-only; false on every other platform.
 */
export function isPurchasesAvailable(): boolean {
  return loadPurchases() != null;
}

export async function initSubscriptions(userId?: string): Promise<void> {
  if (_initialized) return;
  const Purchases = loadPurchases();
  if (!Purchases) {
    console.warn('[subscriptions] react-native-purchases not linked; running in free_trial fallback');
    _initialized = true;
    return;
  }
  if (Platform.OS !== 'ios') {
    // Android/web not wired yet — keep free_trial default.
    _initialized = true;
    return;
  }
  try {
    Purchases.default.configure({
      apiKey: REVENUECAT_IOS_API_KEY,
      appUserID: userId ?? null,
    });
    _initialized = true;
  } catch (err) {
    console.warn('[subscriptions] configure failed:', err);
    _initialized = true; // don't retry-loop on repeated failures
  }
}

// Reads the user's current tier from RevenueCat (which is the source of
// truth for what they've paid for). Called on app startup + after purchase.
// App-facing tier strength. Only mobile tiers rank here — an API-only tier
// (api_basic/api_history) grants NO in-app features, so it maps to free_trial
// for the app. A bundle that includes mobile makes the backend return
// basic_markets directly.
const APP_TIER_RANK: Record<string, number> = {
  expired: 0,
  free_trial: 0,
  basic: 1,
  basic_markets: 2,
};

function strongerTier(a: Tier, b: Tier): Tier {
  return (APP_TIER_RANK[b] ?? 0) > (APP_TIER_RANK[a] ?? 0) ? b : a;
}

// RevenueCat (Apple IAP) — instant post-purchase, but knows nothing about web
// (Stripe) purchases.
async function fetchRevenueCatTier(): Promise<Tier> {
  const Purchases = loadPurchases();
  if (!Purchases || !_initialized) return 'free_trial';
  try {
    const info = await Purchases.default.getCustomerInfo();
    const active = info.entitlements.active;
    if (active[ENTITLEMENT_IDS.basic_markets]) return 'basic_markets';
    if (active[ENTITLEMENT_IDS.basic]) return 'basic';
    if (info.firstSeen && !info.originalPurchaseDate) return 'free_trial';
    return 'expired';
  } catch (err) {
    console.warn('[subscriptions] RevenueCat tier failed:', err);
    return _cachedTier;
  }
}

// Backend entitlement — the authoritative UNION of Apple (via the RevenueCat
// webhook) AND web/Stripe purchases (via /link-web-tier). Lets a web API+archive
// bundle unlock mobile Pro without a rebuild. Only mobile tiers upgrade the app.
async function fetchBackendTier(): Promise<Tier> {
  try {
    const { supabase } = require('../utils/supabaseConfig');
    const Constants = require('expo-constants').default;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return 'free_trial';
    const base = Constants?.expoConfig?.extra?.apiUrl ?? 'https://api.integramarkets.app';
    const res = await fetch(`${base}/api/subscriptions/entitlement`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 'free_trial';
    const data = await res.json();
    const t = data?.tier;
    // Map the backend tier to what it grants IN THE APP. Both paid API tiers
    // ($99 api_basic and the archive bundle api_history) include full mobile Pro
    // — the Databento/Quandl model: paid tiers are comprehensive; only the
    // 30-day trial is limited (via no-export). Only api_trial / free stay gated.
    if (t === 'basic_markets' || t === 'api_basic' || t === 'api_history') return 'basic_markets';
    if (t === 'basic') return 'basic';
    return 'free_trial';
  } catch (err) {
    console.warn('[subscriptions] backend tier failed:', err);
    return 'free_trial';
  }
}

// The user's effective tier = the STRONGER of Apple IAP and the backend union.
// Reading both covers (a) web purchases the app can't see locally and (b) the
// brief RevenueCat-webhook lag right after an in-app purchase.
export async function fetchTier(): Promise<Tier> {
  const [rc, be] = await Promise.all([fetchRevenueCatTier(), fetchBackendTier()]);
  _cachedTier = strongerTier(rc, be);
  return _cachedTier;
}

// Fetches the RevenueCat "Offering" (bundle of packages) that the paywall
// should display. Returns null in fallback mode.
export async function fetchCurrentOffering(): Promise<any | null> {
  const Purchases = loadPurchases();
  if (!Purchases || !_initialized) return null;
  try {
    const offerings = await Purchases.default.getOfferings();
    return offerings.current;
  } catch (err) {
    console.warn('[subscriptions] fetchCurrentOffering failed:', err);
    return null;
  }
}

// Kicks off Apple's native purchase sheet for a specific package (from an
// offering). Returns the resulting tier on success.
export async function purchasePackage(rcPackage: any): Promise<Tier> {
  const Purchases = loadPurchases();
  if (!Purchases || !_initialized) {
    throw new Error('Subscriptions not available on this build');
  }
  const result = await Purchases.default.purchasePackage(rcPackage);
  const active = result.customerInfo.entitlements.active;
  if (active[ENTITLEMENT_IDS.basic_markets]) return 'basic_markets';
  if (active[ENTITLEMENT_IDS.basic]) return 'basic';
  return 'free_trial';
}

// Restores purchases on a new device / after reinstall. Same return shape
// as purchasePackage.
export async function restorePurchases(): Promise<Tier> {
  const Purchases = loadPurchases();
  if (!Purchases || !_initialized) return 'free_trial';
  const info = await Purchases.default.restorePurchases();
  const active = info.entitlements.active;
  if (active[ENTITLEMENT_IDS.basic_markets]) return 'basic_markets';
  if (active[ENTITLEMENT_IDS.basic]) return 'basic';
  return 'free_trial';
}
