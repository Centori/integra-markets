/**
 * News-card image fallback: the square "i" icon is replaced by the "integra"
 * wordmark on the brand gradient. The wordmark renders with RN core <Text>
 * (NOT react-native-svg) so it adds no first-time native render path.
 */
const fs = require('fs');
const path = require('path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const exists = (p) => fs.existsSync(path.join(__dirname, '..', p));

describe('NewsCard fallback uses the integra wordmark, not the i icon', () => {
  const src = read('app/components/NewsCard.tsx');
  test('imports and renders IntegraWordmark in the fallback', () => {
    expect(src).toMatch(/import IntegraWordmark from '\.\/brand\/IntegraWordmark'/);
    expect(src).toMatch(/<IntegraWordmark size=\{46\} \/>/);
  });
  test('the fallback no longer requires the square "i" PNG', () => {
    expect(src).not.toMatch(/require\('\.\.\/\.\.\/assets\/NewLogoInt\.png\.png'\)/);
  });
  test('brand gradient (Option A) is retained behind the wordmark', () => {
    expect(src).toMatch(/\['#21403A', '#16241F', '#101815'\]/);
  });
});

describe('IntegraWordmark — text-based, no native-svg risk', () => {
  const src = read('app/components/brand/IntegraWordmark.tsx');
  test('renders RN core Text, not react-native-svg', () => {
    expect(src).toMatch(/from 'react-native'/);
    // must not IMPORT react-native-svg (mentioning it in a comment is fine)
    expect(src).not.toMatch(/from 'react-native-svg'/);
    expect(src).not.toMatch(/import\s+\{[^}]*Svg/);
    expect(src).toMatch(/>\s*integra\s*</);
  });
  test('uses the brand green by default', () => {
    expect(src).toMatch(/#4ECCA3/);
  });
});

describe('conventional vector asset exists', () => {
  test('assets/integra-wordmark.svg is present with the brand green', () => {
    expect(exists('assets/integra-wordmark.svg')).toBe(true);
    expect(read('assets/integra-wordmark.svg')).toMatch(/#4ECCA3/);
    expect(read('assets/integra-wordmark.svg')).toMatch(/integra/);
  });
});
