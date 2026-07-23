/**
 * Guards that build 83 ships with the LIVE RevenueCat purchase path wired
 * (previously stubbed to free_trial because the native SDK wasn't installed).
 *
 *  - react-native-purchases is a real dependency.
 *  - loadPurchases() actually requires it (iOS-guarded), no longer `return null`.
 *  - the SDK is bootstrapped on startup (App.js effect → bootstrapEntitlements).
 *  - the paywall package identifiers match the entitlement/package contract the
 *    RevenueCat dashboard must be configured with.
 */
const fs = require('fs');
const path = require('path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('react-native-purchases is a declared dependency', () => {
  const pkg = JSON.parse(read('package.json'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  expect(deps['react-native-purchases']).toBeDefined();
});

describe('subscriptionService is live, not stubbed', () => {
  const src = read('app/services/subscriptionService.ts');
  test('loadPurchases requires the SDK (iOS-guarded) instead of returning null', () => {
    expect(src).toMatch(/require\('react-native-purchases'\)/);
    expect(src).toMatch(/Platform\.OS !== 'ios'/);
    // the old permanent stub must be gone
    expect(src).not.toMatch(/function loadPurchases\(\)[^}]*\breturn null;\s*}/s);
  });
  test('entitlement identifiers are basic / basic_markets', () => {
    expect(src).toMatch(/basic_markets:\s*'basic_markets'/);
    expect(src).toMatch(/basic:\s*'basic'/);
  });
});

test('App.js bootstraps entitlements on startup', () => {
  const app = read('app/App.js');
  expect(app).toMatch(/import \{ bootstrapEntitlements \} from '\.\/hooks\/useEntitlement'/);
  expect(app).toMatch(/bootstrapEntitlements\(userData\.id\)/);
});

test('paywall package ids match the RevenueCat contract', () => {
  const pw = read('app/paywall/PaywallScreen.tsx');
  expect(pw).toMatch(/rcId:\s*'basic_markets_monthly'/);
  expect(pw).toMatch(/rcId:\s*'basic_markets_annual'/);
});
