/**
 * Agent Mode Configuration for Integra Markets
 * 
 * This enables automated background tasks, data syncing,
 * AI-powered sentiment analysis, weather intelligence,
 * and other agent-based functionality in the app.
 */

const AGENT_CONFIG = {
  enabled: false, // Set to true to enable agent mode
  refreshInterval: 300, // Seconds between data refreshes
  appTier: "free", // free or premium
  features: {
    // Core features
    backgroundSync: true,
    sentimentMonitoring: true,
    weatherAlerts: true,
    priceAlerts: true,
    newsSummary: true,
    
    // Premium-only features
    advancedWeatherAnalysis: false,
    priceImpactForecasting: false,
    infrastructureVulnerability: false,
    supplyChainDisruption: false,
    historicalPatternMatching: false,
    correlationAnalysis: false,
    unlimitedAIInsights: false
  },
  notifications: {
    enabled: true,
    maxPerDay: 10, // Limited for free tier
    quietHours: {
      enabled: true,
      start: "22:00",
      end: "08:00"
    },
    types: {
      sentimentShifts: true,
      weatherAlerts: true,
      priceMovements: true,
      newsAlerts: true,
      aiInsights: true
    }
  },
  performance: {
    lowPowerMode: false,
    dataSaverMode: false,
    cacheStrategy: "moderate", // light, moderate, aggressive
    precomputeAnalytics: false // premium feature
  },
  sentimentAnalysis: {
    model: "vader", // vader, bert, ensemble
    customLexicons: false, // premium feature
    commodities: ["natural gas", "oil", "corn", "wheat"], // Default commodities
    confidenceThreshold: 0.65,
    updateFrequency: 60 // minutes
  },
  weatherIntelligence: {
    alertSeverityThreshold: "moderate", // low, moderate, high
    forecastDays: 3, // More for premium
    regionFocus: "global", // global, custom (premium)
    anomalyDetection: false // premium feature
  },
  dataSources: {
    weather: {
      primary: "openweathermap",
      secondary: "weathergov"
    },
    news: {
      refreshFrequency: 30, // minutes
      maxArticlesPerDay: 100 // Limited for free tier
    },
    market: {
      refreshFrequency: 15, // minutes
      provider: "alphavantage"
    }
  }
};

/**
 * Activates Agent Mode with given tier settings
 * @param {string} tier - "free" or "premium"
 * @returns {Object} Updated agent configuration
 */
export const activateAgentMode = (tier = "free") => {
  console.log(`Activating Agent Mode (${tier} tier)...`);
  AGENT_CONFIG.enabled = true;
  AGENT_CONFIG.appTier = tier;
  
  // Configure premium features if applicable
  if (tier === "premium") {
    enablePremiumFeatures();
  }
  
  return AGENT_CONFIG;
};

/**
 * Enables premium tier features in Agent Config
 */
const enablePremiumFeatures = () => {
  AGENT_CONFIG.features.advancedWeatherAnalysis = true;
  AGENT_CONFIG.features.priceImpactForecasting = true;
  AGENT_CONFIG.features.infrastructureVulnerability = true;
  AGENT_CONFIG.features.supplyChainDisruption = true;
  AGENT_CONFIG.features.historicalPatternMatching = true;
  AGENT_CONFIG.features.correlationAnalysis = true;
  AGENT_CONFIG.features.unlimitedAIInsights = true;
  AGENT_CONFIG.notifications.maxPerDay = 999; // Unlimited for premium
  AGENT_CONFIG.sentimentAnalysis.customLexicons = true;
  AGENT_CONFIG.sentimentAnalysis.model = "ensemble"; // Use better model for premium
  AGENT_CONFIG.weatherIntelligence.forecastDays = 10; // Extended forecast
  AGENT_CONFIG.weatherIntelligence.anomalyDetection = true;
  AGENT_CONFIG.performance.precomputeAnalytics = true;
  AGENT_CONFIG.dataSources.news.maxArticlesPerDay = 1000; // Increased for premium
};

export const deactivateAgentMode = () => {
  console.log("Deactivating Agent Mode...");
  AGENT_CONFIG.enabled = false;
  return AGENT_CONFIG;
};

export const getAgentStatus = () => {
  return {
    active: AGENT_CONFIG.enabled,
    tier: AGENT_CONFIG.appTier,
    lastUpdated: new Date().toISOString(),
    nextRefresh: AGENT_CONFIG.enabled ? 
      new Date(Date.now() + AGENT_CONFIG.refreshInterval * 1000).toISOString() : 
      null,
    activeFeatures: Object.entries(AGENT_CONFIG.features)
      .filter(([_, enabled]) => enabled)
      .map(([feature]) => feature)
  };
};

/**
 * Updates the commodities watchlist for sentiment analysis
 * @param {Array} commodities - Array of commodity names to track
 * @returns {Object} Updated agent configuration
 */
export const updateWatchlist = (commodities) => {
  if (!Array.isArray(commodities)) {
    throw new Error("Commodities must be an array of strings");
  }
  
  // Free tier has a limited watchlist
  const maxItems = AGENT_CONFIG.appTier === "free" ? 5 : 20;
  AGENT_CONFIG.sentimentAnalysis.commodities = commodities.slice(0, maxItems);
  
  return AGENT_CONFIG;
};

/**
 * Updates agent performance settings
 * @param {Object} settings - Performance settings to update
 * @returns {Object} Updated agent configuration
 */
export const updatePerformanceSettings = (settings) => {
  AGENT_CONFIG.performance = {
    ...AGENT_CONFIG.performance,
    ...settings
  };
  
  return AGENT_CONFIG;
};

/**
 * Updates notification settings for the agent
 * @param {Object} settings - Notification settings to update
 * @returns {Object} Updated agent configuration
 */
export const updateNotificationSettings = (settings) => {
  AGENT_CONFIG.notifications = {
    ...AGENT_CONFIG.notifications,
    ...settings
  };
  
  return AGENT_CONFIG;
};

/**
 * Sets the sentiment analysis model and parameters
 * @param {string} model - Model to use ('vader', 'bert', 'ensemble')
 * @param {Object} options - Additional options for sentiment analysis
 * @returns {Object} Updated agent configuration
 */
export const configureSentimentAnalysis = (model, options = {}) => {
  // Check if premium model is requested by free tier user
  if (model === 'ensemble' && AGENT_CONFIG.appTier === 'free') {
    console.warn('Ensemble model is only available for premium tier. Using VADER instead.');
    model = 'vader';
  }
  
  AGENT_CONFIG.sentimentAnalysis = {
    ...AGENT_CONFIG.sentimentAnalysis,
    model,
    ...options
  };
  
  return AGENT_CONFIG;
};

export default AGENT_CONFIG;