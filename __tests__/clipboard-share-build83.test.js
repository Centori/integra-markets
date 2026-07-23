/**
 * Guards the build-83 copy/bookmark fixes on NewsCard + Integra Analysis overlay.
 *
 *  - RN-core `Clipboard` is undefined on RN 0.76 (removed from core), so both the
 *    NewsCard "Copy Link" action and the overlay copy button were broken. Both now
 *    use `expo-clipboard` (`setStringAsync`).
 *  - The overlay copy must NOT leak Pro-gated key-drivers / market-impact to Free
 *    users (paywall parity with the on-screen blur gate).
 *  - The overlay bookmark button previously guarded on `analysis`, making it a
 *    silent no-op before the internal analysis populated; it now guards on newsData
 *    only and uses the fallback `analysisData`.
 */
const fs = require('fs');
const path = require('path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

describe('NewsCard clipboard', () => {
  const src = read('app/components/NewsCard.tsx');
  test('uses expo-clipboard, not RN-core Clipboard', () => {
    expect(src).toMatch(/import \* as Clipboard from 'expo-clipboard'/);
    expect(src).not.toMatch(/Clipboard[,\s].*from 'react-native'/);
    expect(src).not.toMatch(/Clipboard\.setString\b/); // the removed core API
    expect(src).toMatch(/Clipboard\.setStringAsync/);
  });
});

describe('NewsCard card-image share (screenshot → native sheet)', () => {
  const src = read('app/components/NewsCard.tsx');
  test('captures the card view and shares the file via expo-sharing', () => {
    expect(src).toMatch(/import \{ captureRef \} from 'react-native-view-shot'/);
    expect(src).toMatch(/import \* as Sharing from 'expo-sharing'/);
    expect(src).toMatch(/const handleImageShare/);
    expect(src).toMatch(/captureRef\(cardRef/);
    expect(src).toMatch(/Sharing\.shareAsync/);
  });
  test('the card root carries the capture ref and is not collapsed away', () => {
    expect(src).toMatch(/ref=\{cardRef\}/);
    expect(src).toMatch(/collapsable=\{false\}/);
  });
  test('the share menu exposes a "Share Card Image" action', () => {
    expect(src).toMatch(/Share Card Image/);
  });
});

describe('Integra Analysis overlay clipboard + gating + bookmark', () => {
  const src = read('app/components/AIAnalysisOverlay.tsx');

  test('uses expo-clipboard', () => {
    expect(src).toMatch(/import \* as Clipboard from 'expo-clipboard'/);
    expect(src).not.toMatch(/Clipboard\.setString\b/);
    expect(src).toMatch(/Clipboard\.setStringAsync/);
  });

  test('copy is gated: Free users do not get key drivers / market impact', () => {
    expect(src).toMatch(/if \(!isPro\)/);
    expect(src).toMatch(/Upgrade to Pro for key drivers/i);
  });

  test('bookmark guard no longer requires analysis (works before it loads)', () => {
    expect(src).not.toMatch(/if \(!newsData \|\| !analysis\) return;/);
    expect(src).toMatch(/if \(!newsData\) return;/);
  });
});
