// Single source of truth for what each subscription tier includes.
// Limits ship via OTA — changing a number here + `eas update` propagates
// to users on next app launch. See CLAUDE.md → paywall section.

// `free` is the post-trial resting state — what the App Store listing calls
// FREE. A lapsed trial lands here, NOT on `expired`, whose limits are all zero
// and would brick the app on day 31.
// `expired` is reserved for a lapsed PAID subscription.
// Strings match the backend's user_subscriptions.tier values exactly; display
// names ("Free", "Pro") are a presentation concern, see labelForTier below.
export type Tier = 'free' | 'free_trial' | 'basic' | 'basic_markets' | 'expired';

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
  // Post-trial resting state. Deliberately usable: the App Store listing
  // promises FREE users "curated commodity news feed, AI sentiment on every
  // story", so this tier has to deliver that.
  free: {
    bookmarks: 5,
    alerts: 3,
    commodities: 2,
    customRssUrls: 0,
    aiOverlayPerDay: 5,
    historyDays: 7,
    articlesPerSession: 20,
    alertTypes: ['news'],
    pushMode: 'batched',
    pushPerDay: 5,
  },
  // The 30-day trial grants FULL Pro (== basic_markets). It previously granted
  // LESS than `free` above — historyDays was 1 and push_alerts excluded
  // free_trial entirely, so the window meant to prove value had the strongest
  // retention mechanism switched off. Keep this identical to basic_markets;
  // __tests__/trialSemantics.test.js asserts they never diverge.
  free_trial: {
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

// `free_trial` appears everywhere `basic_markets` does — the trial IS Pro.
// `free` gets the reading experience the App Store listing promises, and
// nothing that costs money to deliver.
const FEATURE_ACCESS: Record<Feature, Tier[]> = {
  news_feed: ['free', 'free_trial', 'basic', 'basic_markets'],
  sentiment_analysis: ['free', 'free_trial', 'basic', 'basic_markets'],
  ai_analysis_overlay: ['free', 'free_trial', 'basic', 'basic_markets'],
  sentiment_poll_vote: ['free', 'free_trial', 'basic', 'basic_markets'],
  // Was ['basic', 'basic_markets'] — free_trial was excluded, so push
  // notifications were OFF for the entire trial. The strongest retention
  // mechanism, disabled in exactly the window meant to prove value.
  push_alerts: ['free_trial', 'basic', 'basic_markets'],
  divergence_alerts: ['free_trial', 'basic_markets'],
  polymarket_kalshi_view: ['free_trial', 'basic_markets'],
  divergence_filter: ['free_trial', 'basic_markets'],
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
    case 'free': return 'Free';
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
    // A trial user has been USING Pro for 30 days, so the honest upsell is the
    // tier they already have, not a downgrade to basic.
    case 'free_trial': return 'basic_markets';
    case 'free': return 'basic';
    case 'expired': return 'basic';
    case 'basic': return 'basic_markets';
    case 'basic_markets': return null;
  }
}
