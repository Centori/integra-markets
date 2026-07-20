/**
 * The "Email Alerts" switch on the Alerts tab (app/components/AlertsScreen.js)
 * only ever flipped local component state — there is no email-sending
 * capability anywhere in the backend (verified against the live OpenAPI
 * route list: no /email or /mail endpoint exists) for it to control. Removed
 * per user request as dead/misleading UI. This test pins its removal so it
 * can't quietly come back.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'components', 'AlertsScreen.js'),
  'utf8'
);

describe('AlertsScreen email toggle removal', () => {
  test('no Email Alerts label rendered', () => {
    expect(SRC).not.toContain('Email Alerts');
  });

  test('no emailAlerts state or setter remains', () => {
    expect(SRC).not.toMatch(/emailAlerts/i);
  });

  test('the settings switch-case no longer has an email branch', () => {
    expect(SRC).not.toContain("case 'email'");
  });

  test('Push Notifications toggle is untouched (the real, working channel)', () => {
    expect(SRC).toContain('Push Notifications');
    expect(SRC).toContain('pushAlerts');
  });
});
