/**
 * Guards the build-87 UX/data-integrity fixes (production-readiness batch):
 *
 *  1. News feed no longer blanks until multiple refreshes — saveFeedCache never
 *     persists an empty array, and an empty/failed fetch restores the last-good
 *     cache instead of wiping the UI + cache.
 *  2. Profile commodities count reflects REAL preferences — App.js passes the
 *     alertPreferences prop and loads it on auth; ProfileScreen no longer
 *     fabricates a 3-item default.
 *  3. Divergence "i" opens a styled modal (tour-card look), not an OS Alert.
 *  4. Loading screen shows the bar only — the 0-100% numeric countdown is gone.
 *  5. Live divergence + Kalshi cross-market fields pass through the feed mapping
 *     and the overlay renders the Markets-Split line.
 */
const fs = require('fs');
const path = require('path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

describe('Feed cache — never blank on a transient empty fetch', () => {
  const src = read('app/App.js');
  test('saveFeedCache refuses to persist an empty array', () => {
    expect(src).toMatch(/if \(!Array\.isArray\(items\) \|\| items\.length === 0\) return;/);
  });
  test('empty fetch restores last-good cache instead of saveFeedCache([])', () => {
    expect(src).not.toMatch(/saveFeedCache\(\[\]\)/);
    expect(src).toMatch(/if \(mapped\.length === 0\) \{[\s\S]*?loadCachedFeed\(\)/);
  });
});

describe('Profile reflects real alert preferences', () => {
  const app = read('app/App.js');
  const profile = read('app/components/ProfileScreen.js');
  test('App.js passes alertPreferences to ProfileScreen', () => {
    expect(app).toMatch(/alertPreferences=\{alertPreferences\}/);
  });
  test('alertPreferences is loaded on auth', () => {
    expect(app).toMatch(/loadAlertPreferences\(\)[\s\S]*?userData\?\.id/);
  });
  test('ProfileScreen default no longer fabricates 3 commodities', () => {
    expect(profile).not.toMatch(/commodities: \['Crude Oil', 'Gold', 'Natural Gas'\]/);
    expect(profile).toMatch(/commodities: \[\]/);
  });
});

describe('Divergence info is a styled modal, not an Alert', () => {
  const src = read('app/components/AIAnalysisOverlay.tsx');
  test('has a showDivergenceModal state opened by showDivergenceInfo', () => {
    expect(src).toMatch(/showDivergenceModal/);
    expect(src).toMatch(/showDivergenceInfo = \(\) => setShowDivergenceModal\(true\)/);
  });
  test('renders the divergence copy in a tourCard modal', () => {
    expect(src).toMatch(/visible=\{showDivergenceModal\}/);
    expect(src).toMatch(/DIVERGENCE_INFO_TITLE/);
  });
});

describe('Loading screen — bar only, no numeric percentage', () => {
  const src = read('app/components/IntegraLoadingPage.js');
  test('the {progress}% text is removed', () => {
    expect(src).not.toMatch(/\{Math\.round\(progress\)\}%/);
  });
});

describe('Divergence + cross-market fields reach the card', () => {
  const app = read('app/App.js');
  const overlay = read('app/components/AIAnalysisOverlay.tsx');
  test('feed mapping passes divergence + cross-market fields through', () => {
    expect(app).toMatch(/divergenceStatus: a\.divergenceStatus/);
    expect(app).toMatch(/crossMarketStatus: a\.crossMarketStatus/);
    expect(app).toMatch(/kalshiImplied: a\.kalshiImplied/);
  });
  test('overlay renders the Kalshi-vs-Polymarket Markets-Split line', () => {
    expect(overlay).toMatch(/crossMarketStatus === 'DIVERGENCE'/);
    expect(overlay).toMatch(/Markets Split/);
  });
});
