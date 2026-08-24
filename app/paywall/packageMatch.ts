// Pure package-resolution logic for the paywall. Deliberately free of React
// and native imports so it can be unit-tested without pulling the whole
// component (and @expo/vector-icons) through the jest transform.

export type Billing = 'monthly' | 'annual';

// The two live App Store products, verified against App Store Connect
// 2026-08-24. Note they are named inconsistently — one says `pro.monthly`,
// the other `basic_markets_annual`. That inconsistency is exactly what broke
// the previous substring-based matcher, so it is only ever a last resort here.
export const MONTHLY_PRODUCT_ID = 'com.centori.integramarkets.pro.monthly';
export const ANNUAL_PRODUCT_ID = 'com.centori.integramarkets.basic_markets_annual';

/**
 * Find the RevenueCat package for a billing period without relying on product
 * naming. Ordered most- to least-authoritative:
 *
 *   1. `packageType`         — RevenueCat's own enum, derived from the store
 *   2. `$rc_monthly` / `$rc_annual` — the standard package identifiers
 *   3. `subscriptionPeriod`  — ISO 8601 duration straight off StoreKit
 *   4. the known product IDs — last resort, breaks if a product is renamed
 *
 * Returns undefined rather than guessing. Reporting "unavailable" is better
 * than resolving monthly to the annual package and charging a year.
 */
export function findPackageFor(offering: any, billing: Billing): any | undefined {
  const pkgs: any[] = offering?.availablePackages ?? [];
  if (!pkgs.length) return undefined;
  const annual = billing === 'annual';

  const wantType = annual ? 'ANNUAL' : 'MONTHLY';
  const wantId = annual ? '$rc_annual' : '$rc_monthly';
  const wantPeriod = annual ? 'P1Y' : 'P1M';
  const wantProductId = annual ? ANNUAL_PRODUCT_ID : MONTHLY_PRODUCT_ID;

  return (
    pkgs.find((p) => String(p?.packageType).toUpperCase() === wantType) ??
    pkgs.find((p) => p?.identifier === wantId) ??
    pkgs.find((p) => p?.product?.subscriptionPeriod === wantPeriod) ??
    pkgs.find((p) => p?.product?.identifier === wantProductId)
  );
}
