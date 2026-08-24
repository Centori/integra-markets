/**
 * Paywall package resolution.
 *
 * The bug this pins, found on TestFlight 2026-08-24: matching was
 * `p.product.identifier.includes(rcId)` with rcIds 'basic_markets_monthly' /
 * 'basic_markets_annual'. The two live App Store products are named
 * inconsistently:
 *
 *   com.centori.integramarkets.basic_markets_annual   contains the rcId  ✓
 *   com.centori.integramarkets.pro.monthly            does not           ✗
 *
 * So annual resolved and monthly never did. Monthly fell through to a
 * hardcoded "$35" — shown to a customer in Nigeria whose actual price is
 * ₦59,900 — and the purchase handler hit `!proPackage`, reporting
 * "Subscriptions unavailable" for every monthly subscriber.
 *
 * Product IDs verified against App Store Connect the same day.
 */

const { findPackageFor } = require('../../app/paywall/packageMatch');

const MONTHLY_PRODUCT = 'com.centori.integramarkets.pro.monthly';
const ANNUAL_PRODUCT = 'com.centori.integramarkets.basic_markets_annual';

const pkg = (over) => ({
  identifier: '$rc_custom',
  packageType: undefined,
  product: { identifier: 'x', subscriptionPeriod: undefined, priceString: '₦0' },
  ...over,
});

describe('findPackageFor — the real product lineup', () => {
  // Exactly what RevenueCat returns for this app: standard package types,
  // inconsistently named products underneath.
  const offering = {
    availablePackages: [
      pkg({
        identifier: '$rc_monthly',
        packageType: 'MONTHLY',
        product: { identifier: MONTHLY_PRODUCT, subscriptionPeriod: 'P1M', priceString: '₦59,900.00' },
      }),
      pkg({
        identifier: '$rc_annual',
        packageType: 'ANNUAL',
        product: { identifier: ANNUAL_PRODUCT, subscriptionPeriod: 'P1Y', priceString: '₦599,900.00' },
      }),
    ],
  };

  it('resolves monthly despite the product not being named *_monthly', () => {
    expect(findPackageFor(offering, 'monthly')?.product.identifier).toBe(MONTHLY_PRODUCT);
  });

  it('resolves annual', () => {
    expect(findPackageFor(offering, 'annual')?.product.identifier).toBe(ANNUAL_PRODUCT);
  });

  it('returns the localized price, not a USD guess', () => {
    expect(findPackageFor(offering, 'monthly').product.priceString).toBe('₦59,900.00');
  });
});

describe('findPackageFor — degraded metadata', () => {
  it('falls back to the $rc_ identifier when packageType is missing', () => {
    const offering = {
      availablePackages: [
        pkg({ identifier: '$rc_monthly', product: { identifier: MONTHLY_PRODUCT } }),
        pkg({ identifier: '$rc_annual', product: { identifier: ANNUAL_PRODUCT } }),
      ],
    };
    expect(findPackageFor(offering, 'monthly')?.identifier).toBe('$rc_monthly');
  });

  it('falls back to the ISO-8601 subscription period', () => {
    const offering = {
      availablePackages: [
        pkg({ product: { identifier: 'whatever.a', subscriptionPeriod: 'P1M' } }),
        pkg({ product: { identifier: 'whatever.b', subscriptionPeriod: 'P1Y' } }),
      ],
    };
    expect(findPackageFor(offering, 'annual')?.product.identifier).toBe('whatever.b');
  });

  it('falls back to the known product ids when all else is absent', () => {
    const offering = {
      availablePackages: [
        pkg({ product: { identifier: MONTHLY_PRODUCT } }),
        pkg({ product: { identifier: ANNUAL_PRODUCT } }),
      ],
    };
    expect(findPackageFor(offering, 'monthly')?.product.identifier).toBe(MONTHLY_PRODUCT);
  });

  it('never cross-matches monthly to the annual package', () => {
    const offering = {
      availablePackages: [
        pkg({ packageType: 'ANNUAL', product: { identifier: ANNUAL_PRODUCT, subscriptionPeriod: 'P1Y' } }),
      ],
    };
    // Better to report "unavailable" than to charge a year for a month.
    expect(findPackageFor(offering, 'monthly')).toBeUndefined();
  });
});

describe('findPackageFor — nothing to match', () => {
  it.each([undefined, null, {}, { availablePackages: [] }])('handles %p', (offering) => {
    expect(findPackageFor(offering, 'monthly')).toBeUndefined();
    expect(findPackageFor(offering, 'annual')).toBeUndefined();
  });
});
