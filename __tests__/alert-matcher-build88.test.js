/**
 * Guards the mobile↔web alert matcher, and specifically the substring bug
 * that put a "Tin" chip on nearly every card on the web /alerts page.
 */
const {
  matchArticleToPreferences,
  containsTerm,
  normalizeSentiment,
} = require('../app/services/alertMatcher');

describe('containsTerm word boundaries', () => {
  it.each([
    ['existing', 'tin'],
    ['reporting', 'tin'],
    ['meeting supply targets', 'tin'],
    ['traders reassess', 'tin'],
    ['continuing', 'tin'],
  ])('does not match %p against %p', (text, term) => {
    expect(containsTerm(text, term)).toBe(false);
  });

  it.each([
    ['Tin prices climb', 'tin'],
    ['prices of tin, copper', 'tin'],
    ['LME tin.', 'tin'],
    ['Natural gas glut', 'natural gas'],
  ])('matches %p against %p', (text, term) => {
    expect(containsTerm(text, term)).toBe(true);
  });
});

describe('matchArticleToPreferences', () => {
  const prefs = {
    commodities: ['Tin', 'Crude Oil', 'Copper'],
    regions: ['North America'],
    currencies: [],
    keywords: [],
    websiteURLs: [],
  };

  it('does not tag Tin on an article that merely contains the letters', () => {
    const article = {
      title: 'Oil Prices Rebound as Traders Reassess Iran Deal',
      summary: 'Crude oil prices reversed much of the losses they suffered on Tuesday.',
    };
    const { matchedTags } = matchArticleToPreferences(article, prefs);
    expect(matchedTags).not.toContain('Tin');
    expect(matchedTags).toContain('Crude Oil');
  });

  it('still tags Tin when the article is actually about tin', () => {
    const article = { title: 'Tin supply squeeze deepens', summary: 'LME tin stocks fall.' };
    expect(matchArticleToPreferences(article, prefs).matchedTags).toContain('Tin');
  });

  it('scores commodities above regions and reports no match on an unrelated story', () => {
    const article = { title: 'Copper drives BHP earnings', summary: 'US demand strong.' };
    const { matched, score, matchedTags } = matchArticleToPreferences(article, prefs);
    expect(matched).toBe(true);
    expect(matchedTags).toEqual(expect.arrayContaining(['Copper', 'North America']));
    expect(score).toBe(15); // 10 commodity + 5 region

    const unrelated = matchArticleToPreferences(
      { title: 'Cocoa harvest update', summary: 'Ghana output steady.' },
      prefs
    );
    expect(unrelated.matched).toBe(false);
    expect(unrelated.matchedTags).toHaveLength(0);
  });

  it('matches website sources by domain', () => {
    const article = { title: 'Report', summary: '', source_url: 'https://www.oilprice.com/x' };
    const { matchedTags } = matchArticleToPreferences(article, {
      websiteURLs: ['https://oilprice.com'],
    });
    expect(matchedTags).toContain('Source: https://oilprice.com');
  });

  it('tolerates missing article fields and missing preferences', () => {
    expect(matchArticleToPreferences({}, {}).matched).toBe(false);
    expect(matchArticleToPreferences(null, null).matchedTags).toEqual([]);
  });
});

describe('normalizeSentiment', () => {
  it('collapses feed variants to three values', () => {
    expect(normalizeSentiment('bullish')).toBe('BULLISH');
    expect(normalizeSentiment('VERY_BEARISH')).toBe('BEARISH');
    expect(normalizeSentiment(undefined)).toBe('NEUTRAL');
  });
});
