/**
 * Guards the build-86 fixes for three related "blocked on slow/hung Supabase
 * auth" bugs the user hit on build 85:
 *
 *  1. Profile tab stuck on "Loading…" forever (Logout unreachable) — the tab
 *     gated all content behind `loadingProfile`, which only cleared when
 *     userService.getCurrentUser() settled, and getCurrentUser() awaited the
 *     NETWORK call supabase.auth.getUser() with no timeout → hung promise →
 *     spinner forever. Fixes: getCurrentUser reads the LOCAL session via
 *     getSession(); ProfileScreen renders from the userProfile prop immediately
 *     (loadingProfile starts !userProfile) and races the refresh against a
 *     timeout so a hang can never freeze the tab.
 *  2. Slow Profile load — same getUser() network round-trip on every mount,
 *     removed by the getSession() switch above.
 *  3. Re-login re-prompts Alerts/Preferences — handleAuthComplete forced the
 *     alerts step whenever the LOCAL alerts_completed flag was missing, even for
 *     a returning user with a populated Supabase profile. Now mirrors the
 *     session-restore path: a complete profile marks alerts done too.
 */
const fs = require('fs');
const path = require('path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

describe('userService.getCurrentUser — local session, no network hang', () => {
  const src = read('app/services/userService.ts');
  // Isolate the getCurrentUser method body (up to the next `async ` method) so
  // the assertion doesn't catch updateUserProfile, which legitimately keeps
  // getUser() for its server-validated write path.
  const body = src.slice(
    src.indexOf('async getCurrentUser'),
    src.indexOf('async updateUserProfile')
  );
  test('reads getSession() instead of the network getUser()', () => {
    expect(body).toMatch(/supabase\.auth\.getSession\(\)/);
    expect(body).not.toMatch(/supabase\.auth\.getUser\(\)/);
  });
});

describe('ProfileScreen — renders from prop, never freezes on a hung fetch', () => {
  const src = read('app/components/ProfileScreen.js');
  test('loading starts false when a userProfile prop is present', () => {
    expect(src).toMatch(/useState\(!userProfile\)/);
  });
  test('the profile fetch is raced against a timeout', () => {
    expect(src).toMatch(/withTimeout\(userService\.getCurrentUser\(\),\s*\d+\)/);
  });
  test('does not re-show the blocking spinner when we already have a prop', () => {
    expect(src).toMatch(/if \(!userProfile\) setLoadingProfile\(true\)/);
  });
});

describe('App.handleAuthComplete — returning user is not re-onboarded for alerts', () => {
  const src = read('app/App.js');
  test('a complete profile marks alerts done instead of forcing the alerts step', () => {
    expect(src).toMatch(/if \(profileComplete \|\| alertsCompleted === 'true'\)/);
    expect(src).toMatch(/setItem\('alerts_completed', 'true'\)/);
  });
});

describe('Deep-link scheme is registered (email confirm / reset / auth callback)', () => {
  const app = JSON.parse(read('app.json'));
  test('app.json declares scheme "integra" so integra:// links reopen the app', () => {
    expect(app.expo.scheme).toBe('integra');
  });
});

describe('Paywall — subscription-unavailable message is diagnostic', () => {
  const svc = read('app/services/subscriptionService.ts');
  const paywall = read('app/paywall/PaywallScreen.tsx');
  test('service exposes isPurchasesAvailable() to detect a missing native SDK', () => {
    expect(svc).toMatch(/export function isPurchasesAvailable\(\): boolean/);
  });
  test('paywall picks the message based on whether the SDK is compiled in', () => {
    expect(paywall).toMatch(/isPurchasesAvailable\(\)\s*\?/);
    expect(paywall).toMatch(/wasn.t compiled with the subscriptions SDK/);
  });
});
