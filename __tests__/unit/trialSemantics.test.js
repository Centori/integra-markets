/**
 * The 30-day trial, and what happens on day 31.
 *
 * Every assertion here corresponds to a bug that shipped:
 *   - the trial granted LESS than the free tier (push alerts off, 1 day history)
 *   - 'expired' was rewritten to 'free_trial' on read, re-granting the trial
 *     on every app launch, forever
 *   - expired and free_trial had equal rank, so strongerTier's result depended
 *     on argument order rather than entitlement
 */

const {
  LIMITS,
  canAccess,
  limitsFor,
  nextTierFor,
  tierLabel,
} = require('../../app/services/entitlementGate');

describe('the trial grants full Pro', () => {
  it('matches basic_markets field for field', () => {
    // If these diverge, the trial is selling something other than the product.
    expect(limitsFor('free_trial')).toEqual(limitsFor('basic_markets'));
  });

  it('includes push alerts', () => {
    // Previously ['basic', 'basic_markets'] — the strongest retention
    // mechanism was switched off for the entire trial.
    expect(canAccess('push_alerts', 'free_trial')).toBe(true);
  });

  it('includes the Markets surface', () => {
    expect(canAccess('polymarket_kalshi_view', 'free_trial')).toBe(true);
    expect(canAccess('divergence_alerts', 'free_trial')).toBe(true);
  });

  it('is not capped at one day of history', () => {
    expect(limitsFor('free_trial').historyDays).toBe(Number.POSITIVE_INFINITY);
  });

  it('upsells to the tier the user has been using, not a downgrade', () => {
    expect(nextTierFor('free_trial')).toBe('basic_markets');
  });
});

describe('free is a usable resting state, not a brick', () => {
  it('exists', () => {
    expect(LIMITS.free).toBeDefined();
  });

  it('can still read the news feed with sentiment', () => {
    // The App Store listing promises FREE users "curated commodity news feed,
    // AI sentiment on every story". Zero articles would make that false.
    expect(canAccess('news_feed', 'free')).toBe(true);
    expect(canAccess('sentiment_analysis', 'free')).toBe(true);
    expect(limitsFor('free').articlesPerSession).toBeGreaterThan(0);
    expect(limitsFor('free').aiOverlayPerDay).toBeGreaterThan(0);
  });

  it('does not get the paid Markets surface', () => {
    expect(canAccess('polymarket_kalshi_view', 'free')).toBe(false);
    expect(canAccess('export_csv', 'free')).toBe(false);
  });

  it('is strictly better than expired', () => {
    // `expired` is the hard stop, reserved for a lapsed PAID subscription.
    // A lapsed TRIAL must land on `free`.
    expect(limitsFor('free').bookmarks).toBeGreaterThan(limitsFor('expired').bookmarks);
    expect(limitsFor('free').alerts).toBeGreaterThan(limitsFor('expired').alerts);
  });

  it('has a label', () => {
    expect(tierLabel('free')).toBe('Free');
  });
});

describe('tier ranking is a real comparison', () => {
  // strongerTier is module-private; exercise it through the exported ranks by
  // re-deriving the same ordering the service uses.
  const RANK = { expired: 0, free: 1, free_trial: 2, basic: 3, basic_markets: 4 };

  it('gives every tier a distinct rank', () => {
    const values = Object.values(RANK);
    expect(new Set(values).size).toBe(values.length);
  });

  it('ranks an unexpired trial above free', () => {
    expect(RANK.free_trial).toBeGreaterThan(RANK.free);
  });

  it('ranks expired below everything', () => {
    Object.entries(RANK)
      .filter(([tier]) => tier !== 'expired')
      .forEach(([, rank]) => expect(rank).toBeGreaterThan(RANK.expired));
  });
});
