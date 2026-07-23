/**
 * Guards the two build-83 divergence fixes:
 *
 *  1. The Alerts divergence toggle is bridged to the Supabase `alert_preferences`
 *     row that backend `jobs/divergence_monitor.py` polls (`divergence_alerts_enabled`).
 *     Before this, the toggle wrote AsyncStorage only, so the monitor never saw the
 *     user and divergence push alerts could not fire.
 *
 *  2. A one-off mock divergence card is injected into the Today feed only while no
 *     live divergence article exists, and self-replaces when live data arrives —
 *     without mutating or reordering other live cards.
 *
 * Source-assertion style (matches the rest of this suite): read the files and
 * assert the wiring is present, so a future refactor that silently drops it fails.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

describe('Divergence alert toggle → backend bridge', () => {
  const service = read('app/services/supabaseService.js');
  const alerts = read('app/components/AlertsScreen.js');

  test('supabaseService exposes saveDivergenceAlertPreferences', () => {
    expect(service).toMatch(/async\s+saveDivergenceAlertPreferences/);
  });

  test('it upserts the exact columns the monitor filters on', () => {
    expect(service).toMatch(/divergence_alerts_enabled/);
    expect(service).toMatch(/divergence_threshold/);
    expect(service).toMatch(/divergence_topics/);
    expect(service).toMatch(/divergence_providers/);
    expect(service).toMatch(/onConflict:\s*'user_id'/);
  });

  test('empty topics default to a non-empty set (monitor skips empty topics)', () => {
    // The monitor returns 0 for users with no topics, so the bridge must supply a default.
    expect(service).toMatch(/DEFAULT_TOPICS\s*=/);
    expect(service).toMatch(/crude_oil/);
  });

  test('AlertsScreen imports and calls the bridge from persistDivergencePrefs', () => {
    expect(alerts).toMatch(/import\s+supabaseService\s+from\s+'\.\.\/services\/supabaseService'/);
    expect(alerts).toMatch(/saveDivergenceAlertPreferences\s*\(/);
    // The call lives inside persistDivergencePrefs (the toggle's persistence path).
    const fn = alerts.slice(alerts.indexOf('persistDivergencePrefs = async'));
    expect(fn).toMatch(/saveDivergenceAlertPreferences/);
  });
});

describe('One-off mock divergence card', () => {
  const app = read('app/App.js');

  test('a DIVERGENCE-tagged mock card constant exists with a provider mark', () => {
    expect(app).toMatch(/MOCK_DIVERGENCE_CARD\s*=/);
    expect(app).toMatch(/__isMockDivergence:\s*true/);
    expect(app).toMatch(/divergenceStatus:\s*'DIVERGENCE'/);
    expect(app).toMatch(/divergenceProvider:\s*'polymarket'/);
  });

  test('it is injected only when no live divergence card is present', () => {
    expect(app).toMatch(/const\s+withMockDivergence\s*=/);
    // Guard: bail out when a real (non-mock) divergence card already exists.
    expect(app).toMatch(/n\.divergenceStatus === 'DIVERGENCE' && !n\.__isMockDivergence/);
    expect(app).toMatch(/if\s*\(hasLiveDivergence\)\s*return items;/);
  });

  test('getFilteredNews routes the All view through withMockDivergence', () => {
    expect(app).toMatch(/return withMockDivergence\(liveNews\)/);
  });
});

describe('Divergence methodology disclaimer (info button)', () => {
  const ov = read('app/components/AIAnalysisOverlay.tsx');

  test('the Prediction Market section has a tappable info button', () => {
    expect(ov).toMatch(/const showDivergenceInfo/);
    expect(ov).toMatch(/onPress=\{showDivergenceInfo\}/);
    expect(ov).toMatch(/name="info-outline"/);
    expect(ov).toMatch(/How divergence works/);
  });

  test('the disclaimer does NOT leak proprietary model internals', () => {
    const body = ov.slice(ov.indexOf('const showDivergenceInfo'), ov.indexOf('const copyToClipboard'));
    for (const secret of [/lexicon/i, /VADER/i, /Henry/i, /SentiBignomics/i, /weight/i, /threshold value/i, /lookback/i]) {
      expect(body).not.toMatch(secret);
    }
  });
});
