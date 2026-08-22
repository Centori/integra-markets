/**
 * Apple 5.1.1(v) regression guards: the deletion flow must be VISIBLE.
 *
 * Build-87 bug: DeleteAccountModal succeeded server-side but App.js never
 * passed onAccountDeletionScheduled and never rendered PendingDeletionBanner,
 * so the user saw "nothing happens" and had no way to restore.
 */
const fs = require('fs');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app', 'App.js'), 'utf8');

describe('account deletion is visible and restorable (App.js wiring)', () => {
  test('App imports the banner and the pending-deletion query', () => {
    expect(app).toMatch(/import PendingDeletionBanner from '\.\/components\/PendingDeletionBanner'/);
    expect(app).toMatch(/import \{ getPendingDeletion \} from '\.\/services\/accountService'/);
  });

  test('pending deletion is loaded on auth and cleared on sign-out', () => {
    expect(app).toMatch(/getPendingDeletion\(\)/);
    expect(app).toMatch(/setPendingDeletionExpiresAt\(res\.data\?\.expires_at \?\? null\)/);
    expect(app).toMatch(/setPendingDeletionExpiresAt\(null\)/);
  });

  test('ProfileScreen receives onAccountDeletionScheduled with a confirmation Alert', () => {
    expect(app).toMatch(/onAccountDeletionScheduled=\{\(expiresAt\) => \{/);
    expect(app).toMatch(/Account scheduled for deletion/);
  });

  test('the restore banner renders on both Profile and Today surfaces', () => {
    const renders = app.match(/<PendingDeletionBanner/g) || [];
    expect(renders.length).toBeGreaterThanOrEqual(2);
    expect(app).toMatch(/Account restored/);
  });
});
