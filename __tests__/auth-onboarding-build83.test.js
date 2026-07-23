/**
 * Regression tests for the Build 83 auth/onboarding sweep (see SYSTEM_MAP.md).
 *
 * Bugs fixed:
 *  1. Email sign-up/sign-in "errored": the project requires email confirmation
 *     (mailer_autoconfirm=false), but authService returned only {success,error}
 *     with no `requiresConfirmation`, so the UI faked a login with a Date.now()
 *     id and later hit "Email not confirmed".
 *  2. All three auth handlers (email/Apple/Google) passed a fabricated
 *     `id: Date.now().toString()` instead of the real Supabase user id, so
 *     getProfile() never found the real profile.
 *  3. Returning users re-onboarded on every sign-in because handleAuthComplete
 *     only trusted `authData.skipOnboarding` (never set by any handler) and
 *     ignored the persisted `onboarding_completed` flag / profile completeness.
 *  4. Welcome loading bar was a hardcoded ~3.5s artificial delay.
 *  5. Password reset called `window.location.origin` — undefined on native.
 *  6. Today-page alerts bell removed per user request.
 */
const fs = require('fs');
const path = require('path');

const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const AUTH_SERVICE = read('app', 'services', 'authService.ts');
const AUTH_SCREEN = read('app', 'components', 'AuthLoadingScreen.js');
const APP = read('app', 'App.js');

describe('authService returns the real Supabase user + confirmation state', () => {
  test('AuthOutcome exposes user + confirmation flags', () => {
    expect(AUTH_SERVICE).toMatch(/user\?:\s*AuthUser/);
    expect(AUTH_SERVICE).toContain('requiresConfirmation');
    expect(AUTH_SERVICE).toContain('needsEmailConfirmation');
  });

  test('has a mapAuthUser normalizer', () => {
    expect(AUTH_SERVICE).toContain('function mapAuthUser');
  });

  test('sign-up signals confirmation when no session came back', () => {
    expect(AUTH_SERVICE).toMatch(/requiresConfirmation:\s*!data\.session/);
  });

  test('sign-in surfaces email_not_confirmed distinctly', () => {
    expect(AUTH_SERVICE).toContain('email_not_confirmed');
    expect(AUTH_SERVICE).toMatch(/needsEmailConfirmation:\s*true/);
  });

  test('email/Apple/Google all return the mapped real user', () => {
    const count = (AUTH_SERVICE.match(/mapAuthUser\(data\.user\)/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('password reset is platform-aware (no bare window on native)', () => {
    expect(AUTH_SERVICE).toContain('integra://auth/reset-password');
    expect(AUTH_SERVICE).toMatch(/Platform\.OS === 'web'/);
    expect(AUTH_SERVICE).not.toMatch(
      /redirectTo:\s*`\$\{window\.location\.origin\}\/auth\/reset-password`/,
    );
  });
});

describe('AuthLoadingScreen uses the real user, not a fabricated id', () => {
  test('no handler fabricates an account id with Date.now()', () => {
    expect(AUTH_SCREEN).not.toMatch(/id:\s*Date\.now\(\)\.toString\(\)/);
  });

  test('email handler passes the real (guarded) user id', () => {
    expect(AUTH_SCREEN).toMatch(/id:\s*result\.user\.id/);
  });

  test('Apple/Google handlers pass result.user?.id', () => {
    expect(AUTH_SCREEN).toMatch(/id:\s*result\.user\?\.id/);
  });

  test('surfaces the branded confirmation flow', () => {
    expect(AUTH_SCREEN).toContain('requiresConfirmation');
    expect(AUTH_SCREEN).toContain('integramarkets.app');
  });

  test('offers resend on an unconfirmed sign-in', () => {
    expect(AUTH_SCREEN).toContain('needsEmailConfirmation');
    expect(AUTH_SCREEN).toContain('sendVerificationEmail');
  });
});

describe('App.js onboarding no longer traps returning users', () => {
  test('decision keys off profile completeness + persisted flag', () => {
    expect(APP).toContain('profileComplete');
    expect(APP).toContain('alreadyOnboarded');
    expect(APP).toMatch(/onboardingCompletedFlag === 'true'/);
  });

  test('old sole "skipOnboarding" gate is gone', () => {
    expect(APP).not.toContain('User has skipOnboarding=true');
  });
});

describe('Welcome loading bar is a snappy branded splash', () => {
  test('progress interval is ~10ms, not 30ms', () => {
    expect(AUTH_SCREEN).toMatch(/\}, 10\);/);
    expect(AUTH_SCREEN).not.toContain('}, 30); // Faster loading');
  });

  test('post-100% tail is short (120ms), not 500ms', () => {
    expect(AUTH_SCREEN).toContain("setCurrentScreen('auth'), 120)");
    expect(AUTH_SCREEN).not.toContain("setCurrentScreen('auth'), 500)");
  });
});

describe('Today-page alerts bell removed (per user request)', () => {
  test('the notifications-none bell icon is gone', () => {
    expect(APP).not.toMatch(/name="notifications-none"/);
  });

  test('Today header now ends right after the title (no bell button)', () => {
    expect(APP).toMatch(/<Text style=\{styles\.headerTitle\}>Today<\/Text>\s*<\/View>/);
  });
});
