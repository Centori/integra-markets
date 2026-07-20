/**
 * Privacy Policy and Terms of Service must mirror the web app
 * (www.integramarkets.app/settings/{privacy,terms}) and stay dated together.
 * Found during the 2026-07 forensic sweep: ToS still said "December 2024"
 * while Privacy had already been mirrored to "April 2026" the week before —
 * a plain content-drift bug, not something a user misread.
 */
const fs = require('fs');
const path = require('path');

const PRIVACY = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'components', 'PrivacyPolicyModal.js'),
  'utf8'
);
const TERMS = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'components', 'TermsOfServiceModal.js'),
  'utf8'
);

describe('Legal document date parity', () => {
  test('Privacy Policy is dated April 2026', () => {
    expect(PRIVACY).toContain('April 2026');
  });

  test('Terms of Service is dated April 2026 (matches Privacy)', () => {
    expect(TERMS).toContain('April 2026');
  });

  test('neither document is still on the stale December 2024 date', () => {
    expect(PRIVACY).not.toContain('December 2024');
    expect(TERMS).not.toContain('December 2024');
  });

  test('both documents use the standing support address', () => {
    expect(PRIVACY).toContain('contact@integramarkets.app');
    expect(TERMS).toContain('contact@integramarkets.app');
  });
});
