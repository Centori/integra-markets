/**
 * The "refresh summary" button in Integra Analysis (AIAnalysisOverlay.tsx)
 * called `dashboardApi.getArticleSummary`, which did not exist anywhere in
 * app/services/api.js — every tap threw a TypeError, caught by the
 * surrounding try/catch and shown as "Failed / Could not load full article."
 *
 * Two bugs, fixed together:
 *   1. The function didn't exist at all (this test pins its existence).
 *   2. Backend POST /api/summarize/article returns `summary` (a string[])
 *      on success, or {error, fallback:true, message} when its extraction
 *      library isn't available server-side — it NEVER returns a
 *      `full_summary` field. The mobile caller must map `summary` ->
 *      `full_summary` and treat `fallback`/`error` as a distinct
 *      "unavailable" case, not silently fall through to "no extra content."
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'services', 'api.js'),
  'utf8'
);

const OVERLAY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'components', 'AIAnalysisOverlay.tsx'),
  'utf8'
);

describe('dashboardApi.getArticleSummary', () => {
  test('exists on dashboardApi', () => {
    expect(SRC).toMatch(/getArticleSummary:\s*async/);
  });

  test('calls the real backend endpoint', () => {
    expect(SRC).toContain('/summarize/article');
  });

  test('maps the backend\'s summary array into full_summary', () => {
    expect(SRC).toContain('result.summary.join');
    expect(SRC).toContain('full_summary: summaryText');
  });

  test('distinguishes the fallback/unavailable shape from a real empty result', () => {
    expect(SRC).toContain('result.fallback');
    expect(SRC).toContain('unavailable: true');
  });
});

describe('AIAnalysisOverlay refresh-summary handler', () => {
  test('surfaces the unavailable case with its own message', () => {
    expect(OVERLAY_SRC).toContain('result?.unavailable');
    expect(OVERLAY_SRC).toContain('temporarily unavailable');
  });
});
