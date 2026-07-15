/**
 * Contract test for app/services/supabaseService.js
 *
 * Build 71-79 regression: a stripped supabaseService.ts (only verify* methods)
 * shadowed the full April service, so EditProfileModal / EditAlertsModal /
 * AIAnalysisOverlay called methods that didn't exist — profile, alert saves,
 * and poll votes all failed at runtime. The service must expose the full API
 * the UI calls, hit the tables that actually exist in the live database
 * (user_profiles does NOT), and import the hardened client.
 */
const fs = require('fs');
const path = require('path');

const SERVICE_PATH = path.join(__dirname, '..', 'app', 'services', 'supabaseService.js');
const src = fs.readFileSync(SERVICE_PATH, 'utf8');

describe('supabaseService contract', () => {
  test('exposes every method the UI calls', () => {
    const requiredMethods = [
      'getProfile',
      'updateProfile',
      'uploadAvatar',
      'getAlertPreferences',
      'saveAlertPreferences',
      'submitPollVote',
      'getPollResults',
      'getUserVote',
      'getCurrentUserId',
      'registerPushToken',
      'signOut',
    ];
    for (const method of requiredMethods) {
      expect(src).toMatch(new RegExp(`async ${method}\\(`));
    }
  });

  test('uses live tables, never the nonexistent user_profiles', () => {
    for (const table of ['profiles', 'alert_preferences', 'sentiment_votes']) {
      expect(src).toContain(`.from('${table}')`);
    }
    expect(src).toContain(".rpc('get_poll_results'");
    expect(src).not.toContain('user_profiles');
  });

  test('imports the hardened guarded client, not the web lib', () => {
    expect(src).toContain("from '../utils/supabaseConfig'");
    expect(src).not.toContain("from '../../lib/supabase'");
  });

  test('the .ts stub that shadowed this service stays deleted', () => {
    expect(fs.existsSync(SERVICE_PATH.replace(/\.js$/, '.ts'))).toBe(false);
  });

  test('no other app code reads user_profiles', () => {
    const servicesDir = path.join(__dirname, '..', 'app', 'services');
    for (const file of fs.readdirSync(servicesDir)) {
      if (!/\.(js|ts|tsx)$/.test(file)) continue;
      const content = fs.readFileSync(path.join(servicesDir, file), 'utf8');
      expect({ file, hasUserProfiles: content.includes("from('user_profiles')") })
        .toEqual({ file, hasUserProfiles: false });
    }
  });
});
