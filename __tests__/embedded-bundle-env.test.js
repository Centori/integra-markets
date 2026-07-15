/**
 * Root-cause regression guard (2026-07-14).
 *
 * The perennial startup SIGABRT (builds 62-64, 71) was caused by eas.json
 * shipping EXPO_PUBLIC_SUPABASE_URL but NOT EXPO_PUBLIC_SUPABASE_ANON_KEY.
 * The embedded bundle then ran createClient(url, undefined), which throws
 * at module load — before any error boundary — and expo-updates' error
 * recovery aborted (expo.controller.errorRecoveryQueue).
 *
 * These tests fail the suite if that configuration ever regresses.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const easJson = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));

describe('embedded bundle env (startup crash prevention)', () => {
  const env = (easJson.build && easJson.build.production && easJson.build.production.env) || {};

  test('eas.json production env has EXPO_PUBLIC_SUPABASE_URL', () => {
    expect(env.EXPO_PUBLIC_SUPABASE_URL).toMatch(/^https:\/\/.+supabase\.co$/);
  });

  test('eas.json production env has EXPO_PUBLIC_SUPABASE_ANON_KEY (missing key = createClient throws at module load)', () => {
    expect(typeof env.EXPO_PUBLIC_SUPABASE_ANON_KEY).toBe('string');
    expect(env.EXPO_PUBLIC_SUPABASE_ANON_KEY.length).toBeGreaterThan(100);
  });

  test('eas.json production profile has an update channel (without it, devices can NEVER receive OTA updates)', () => {
    expect(easJson.build.production.channel).toBe('production');
  });

  test('supabaseConfig guards createClient behind a stub fallback', () => {
    const src = fs.readFileSync(path.join(root, 'app/utils/supabaseConfig.ts'), 'utf8');
    expect(src).toMatch(/makeStubClient/);
    expect(src).toMatch(/\(supabaseUrl && supabaseAnonKey\)/);
  });
});
