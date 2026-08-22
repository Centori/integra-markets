/**
 * Match a news article against a user's alert preferences.
 *
 * Ported from the web /alerts page so both surfaces derive the same alert
 * list and the same chips from the same article set (mobile↔web parity).
 *
 * ONE DELIBERATE DIFFERENCE FROM THE WEB ORIGINAL: matching is
 * word-boundary anchored. The web version used `text.includes(term)`, which
 * made short commodity names match inside unrelated words — 'tin' fired on
 * "exis|tin|g", "repor|tin|g", "mee|tin|g", "wai|tin|g", so a Tin chip
 * appeared on virtually every article. This is the same class of bug that
 * over-stamped topics in backend/services/topic_taxonomy.py, fixed there the
 * same way. Keep the \b anchors.
 */

const COMMODITY_TERMS = {
  'Crude Oil': ['oil', 'crude', 'brent', 'wti', 'petroleum'],
  'Natural Gas': ['gas', 'lng', 'natural gas'],
  Gold: ['gold', 'bullion'],
  Silver: ['silver'],
  Wheat: ['wheat', 'grain'],
  Corn: ['corn'],
  Copper: ['copper'],
};

const REGION_TERMS = {
  'North America': ['us', 'usa', 'america', 'canada', 'mexico', 'united states'],
  'Middle East': ['middle east', 'saudi', 'iran', 'iraq', 'opec', 'uae', 'dubai'],
  Europe: ['europe', 'eu', 'uk', 'germany', 'france', 'italy'],
  'Asia Pacific': ['asia', 'china', 'japan', 'india', 'pacific', 'australia'],
  'Latin America': ['latin', 'brazil', 'argentina', 'venezuela'],
  Africa: ['africa', 'nigeria', 'libya', 'algeria'],
};

const SCORES = {
  commodity: 10,
  keyword: 8,
  website: 7,
  region: 5,
  currency: 3,
};

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * True when `term` appears in `text` as a whole word (or whole phrase).
 * Falls back to a plain substring test for terms that start or end with a
 * non-word character, where \b would never match.
 */
export function containsTerm(text, term) {
  const cleaned = String(term || '').trim();
  if (!cleaned) return false;

  const source = escapeRegExp(cleaned.toLowerCase());
  const leadingBoundary = /^\w/.test(cleaned) ? '\\b' : '';
  const trailingBoundary = /\w$/.test(cleaned) ? '\\b' : '';

  try {
    return new RegExp(`${leadingBoundary}${source}${trailingBoundary}`, 'i').test(text);
  } catch (error) {
    return String(text).toLowerCase().includes(cleaned.toLowerCase());
  }
}

function domainOf(url) {
  return String(url || '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .toLowerCase();
}

export function matchArticleToPreferences(article, preferences = {}) {
  const {
    commodities = [],
    regions = [],
    currencies = [],
    keywords = [],
    websiteURLs = [],
  } = preferences || {};

  const text = `${article?.title || ''} ${article?.summary || ''}`.toLowerCase();
  const source = String(article?.source || '').toLowerCase();
  const sourceUrl = String(article?.source_url || article?.sourceUrl || article?.url || '').toLowerCase();

  const matchedTags = [];
  let score = 0;

  const collect = (values, termsFor, points) => {
    for (const value of values) {
      const terms = termsFor(value);
      if (terms.some((term) => containsTerm(text, term))) {
        matchedTags.push(value);
        score += points;
      }
    }
  };

  collect(commodities, (c) => COMMODITY_TERMS[c] || [c], SCORES.commodity);
  collect(regions, (r) => REGION_TERMS[r] || [r], SCORES.region);
  collect(currencies, (c) => [c], SCORES.currency);
  collect(keywords, (k) => [k], SCORES.keyword);

  for (const url of websiteURLs) {
    const domain = domainOf(url);
    if (domain && (sourceUrl.includes(domain) || source.includes(domain))) {
      matchedTags.push(`Source: ${url}`);
      score += SCORES.website;
    }
  }

  return { matched: score > 0, score, matchedTags };
}

/** Normalise the many sentiment shapes the feed emits into three values. */
export function normalizeSentiment(raw) {
  const value = String(raw || '').toUpperCase();
  if (value.includes('BULL')) return 'BULLISH';
  if (value.includes('BEAR')) return 'BEARISH';
  return 'NEUTRAL';
}

export default { matchArticleToPreferences, containsTerm, normalizeSentiment };
