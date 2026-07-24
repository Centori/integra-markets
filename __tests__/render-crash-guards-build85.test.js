/**
 * Guards the build-85 device-crash fixes (build 83/84 regressions, reproduced
 * via react-test-renderer then fixed):
 *
 *  1. AIAnalysisOverlay crashed on card tap ("Something went wrong") — the Key
 *     Sentiment Drivers render did `toTitle(driver.text).replace(...)` where
 *     driver.text was undefined, because keywords arrive as BOTH plain strings
 *     and {word} objects and getDirectKeywords assumed `.word`. Fixed at source
 *     (normalize both shapes, drop empties) AND render (null-safe toTitle + filter).
 *  2. Profile "failed to load" — ProfileScreen re-fetched via getCurrentUser
 *     (live session + .single() that throws on a missing row) and blanked the
 *     whole screen (locking out the paywall) instead of falling back to the
 *     userProfile prop App.js already resolved.
 *  3. Second Profile crash path: frequency.charAt on undefined (Supabase stores
 *     alert_frequency, not frequency).
 */
const fs = require('fs');
const path = require('path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

describe('AIAnalysisOverlay — driver render is crash-safe', () => {
  const src = read('app/components/AIAnalysisOverlay.tsx');
  test('toTitle is null-safe', () => {
    expect(src).toMatch(/toTitle\s*=\s*\(s\?: string\)\s*=>\s*\(s \|\| ''\)\.replace/);
  });
  test('keyword extraction normalizes string OR {word} shapes', () => {
    expect(src).toMatch(/typeof k === 'string' \? k : String\(k\?\.word \?\? k\?\.text \?\? ''\)/);
  });
  test('drivers without text are filtered before mapping', () => {
    expect(src).toMatch(/keyDrivers\.filter\(\(d\) => d && d\.text\)/);
  });
  test('poll articleId does not assume title is defined', () => {
    expect(src).toMatch(/\(newsData\.title \|\| ''\)\.replace/);
  });
});

describe('ProfileScreen — loads even when the fresh fetch fails', () => {
  const src = read('app/components/ProfileScreen.js');
  test('falls back to the userProfile prop instead of erroring', () => {
    expect(src).toMatch(/else if \(userProfile\)/);
    expect(src).toMatch(/setResolvedProfile\(userProfile\)/);
  });
  test('frequency render is guarded against undefined', () => {
    expect(src).not.toMatch(/defaultAlertPreferences\.frequency\.charAt/);
    expect(src).toMatch(/defaultAlertPreferences\.frequency \|\| defaultAlertPreferences\.alert_frequency \|\| 'Daily'/);
  });
});

describe('userService.getCurrentUser — tolerant of a missing profile row', () => {
  const src = read('app/services/userService.ts');
  test('uses maybeSingle(), not single()', () => {
    expect(src).toMatch(/\.maybeSingle\(\)/);
    expect(src).not.toMatch(/\.eq\('id', user\.id\)\s*\.single\(\)/);
  });
});
