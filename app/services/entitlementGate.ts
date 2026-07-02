// Single source of truth for what each subscription tier includes.
// Limits ship via OTA — changing a number here + `eas update` propagates
// to users on next app launch. See CLAUDE.md → paywall section.

export type Tier = 'free_trial' | 'basic' | 'basic_markets' | 'expired';

export type AlertKind = 'news' | 'sentiment' | 'divergence';
export type PushMode = 'batched' | 'realtime';

export type TierLimits = {
  bookmarks: number;
  alerts: number;
  commodities: number;
  customRssUrls: number;
  aiOverlayPerDay: number;
  historyDays: number;
  articlesPerSession: number;
  alertTypes: AlertKind[];
  pushMode: PushMode;
  pushPerDay: number;
};

// Infinity sentinels so callers can treat "unlimited" uniformly:
//   if (usage < limits.bookmarks) allowAdd()
const UNLIMITED = Number.POSITIVE_INFINITY;

export const LIMITS: Record<Tier, TierLimits> = {
  free_trial: {
    bookmarks: 5,
    alerts: 3,
    commodities: 2,
    customRssUrls: 0,
    aiOverlayPerDay: 5,
    historyDays: 1,
    articlesPerSession: 20,
    alertTypes: ['news'],
    pushMode: 'batched',
    pushPerDay: 5,
  },
  basic: {
    bookmarks: 50,
    alerts: 10,
    commodities: 5,
    customRssUrls: 3,
    aiOverlayPerDay: UNLIMITED,
    historyDays: 30,
    articlesPerSession: 50,
    alertTypes: ['news', 'sentiment'],
    pushMode: 'batched',
    pushPerDay: UNLIMITED,
  },
  basic_markets: {
    bookmarks: UNLIMITED,
    alerts: UNLIMITED,
    commodities: UNLIMITED,
    customRssUrls: 10,
    aiOverlayPerDay: UNLIMITED,
    historyDays: UNLIMITED,
    articlesPerSession: 100,
    alertTypes: ['news', 'sentiment', 'divergence'],
    pushMode: 'realtime',
    pushPerDay: UNLIMITED,
  },
  // Expired = "was subscribed, subscription lapsed". Read-only mode.
  expired: {
    bookmarks: 0,
    alerts: 0,
    commodities: 0,
    customRssUrls: 0,
    aiOverlayPerDay: 0,
    historyDays: 0,
    articlesPerSession: 5,
    alertTypes: [],
    pushMode: 'batched',
    pushPerDay: 0,
  },
};

export type Feature =
  | 'news_feed'
  | 'sentiment_analysis'
  | 'ai_analysis_overlay'
  | 'push_alerts'
  | 'divergence_alerts'
  | 'polymarket_kalshi_view'
  | 'divergence_filter'
  | 'sentiment_poll_vote'
  | 'export_csv';

const FEATURE_ACCESS: Record<Feature, Tier[]> = {
  news_feed: ['free_trial', 'basic', 'basic_markets'],
  sentiment_analysis: ['free_trial', 'basic', 'basic_markets'],
  ai_analysis_overlay: ['free_trial', 'basic', 'basic_markets'],
  push_alerts: ['basic', 'basic_markets'],
  divergence_alerts: ['basic_markets'],
  polymarket_kalshi_view: ['basic_markets'],
  divergence_filter: ['basic_markets'],
  sentiment_poll_vote: ['basic', 'basic_markets'],
  export_csv: ['basic_markets'],
};

export function canAccess(feature: Feature, tier: Tier): boolean {
  return FEATURE_ACCESS[feature].includes(tier);
}

export function limitsFor(tier: Tier): TierLimits {
  return LIMITS[tier];
}

// Human-friendly label used in Paywall + UpgradePrompt copy.
export function tierLabel(tier: Tier): string {
  switch (tier) {
    case 'free_trial': return 'Free Trial';
    case 'basic': return 'Basic';
    case 'basic_markets': return 'Basic + Markets';
    case 'expired': return 'Expired';
  }
}

// The next paid tier the user should be prompted to upgrade to.
// Returns null if already on top tier.
export function nextTierFor(current: Tier): Tier | null {
  switch (current) {
    case 'free_trial': return 'basic';
    case 'expired': return 'basic';
    case 'basic': return 'basic_markets';
    case 'basic_markets': return null;
  }
}
