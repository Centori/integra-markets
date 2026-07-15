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
const REVENUECAT_IOS_API_KEY = 'appl_REPLACE_WITH_YOUR_KEY';

// Entitlement identifiers as configured in RevenueCat dashboard. When a user
// subscribes to `basic_markets_monthly_v1`, RC should grant both entitlements
// (configured server-side — see docs).
const ENTITLEMENT_IDS = {
  basic: 'basic',
  basic_markets: 'basic_markets',
} as const;

let _initialized = false;
let _cachedTier: Tier = 'free_trial';

// react-native-purchases is NOT installed (not in package.json / the binary).
// DO NOT lazy-require it: Metro's guardedLoadModule routes an outermost
// runtime require failure to ErrorUtils.reportFatalError — it NEVER reaches
// a local try/catch — which SIGABRT'd every build since 65 at startup
// (proven via on-device stack: unknownModuleError -> guardedLoadModule ->
// metroRequire -> loadPurchases). Short-circuit to the free_trial fallback.
// When RevenueCat is really added: `npx expo install react-native-purchases`,
// new native build, THEN restore the require here.
function loadPurchases(): typeof import('react-native-purchases') | null {
  return null;
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
export async function fetchTier(): Promise<Tier> {
  const Purchases = loadPurchases();
  if (!Purchases || !_initialized) return 'free_trial';
  try {
    const info = await Purchases.default.getCustomerInfo();
    const active = info.entitlements.active;
    if (active[ENTITLEMENT_IDS.basic_markets]) {
      _cachedTier = 'basic_markets';
    } else if (active[ENTITLEMENT_IDS.basic]) {
      _cachedTier = 'basic';
    } else if (info.firstSeen && !info.originalPurchaseDate) {
      // Never purchased anything. Trial state is tracked server-side (Supabase).
      _cachedTier = 'free_trial';
    } else {
      _cachedTier = 'expired';
    }
    return _cachedTier;
  } catch (err) {
    console.warn('[subscriptions] fetchTier failed:', err);
    return _cachedTier;
  }
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
