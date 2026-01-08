/**
 * Polymarket API Service for Integra Markets
 * Handles prediction markets for commodities, metals, agriculture and weather
 */

const API_BASE_URL = 'http://localhost:8000';
const POLYMARKET_API = `${API_BASE_URL}/api/polymarket`;

// Common API configuration
const API_CONFIG = {
  timeout: 15000,
  retries: 2,
  retryDelay: 1000,
};

/**
 * Fetch with timeout helper
 */
const fetchWithTimeout = async (url, options = {}, timeout = API_CONFIG.timeout) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

/**
 * Market categories for filtering
 */
export const MarketCategories = {
  ALL: null,
  OIL_ENERGY: 'Oil & Energy',
  METALS: 'Metals',
  AGRICULTURE: 'Agriculture',
  WEATHER: 'Weather',
  COMMODITIES: 'Commodities',
  ECONOMICS: 'Economics',
  INTEREST_RATES: 'Interest Rates',
  INFLATION: 'Inflation',
  CENTRAL_BANKS: 'Central Banks',
  FOREX: 'Foreign Exchange',
  GEOPOLITICS: 'Geopolitics',
  OPEC: 'OPEC',
};

/**
 * Geopolitically significant regions for commodity markets
 */
export const GeopoliticalRegions = {
  // Oil & Energy hotspots
  VENEZUELA: { name: 'Venezuela', commodities: ['oil'], significance: 'OPEC member, heavy crude' },
  IRAN: { name: 'Iran', commodities: ['oil', 'gas'], significance: 'OPEC member, sanctions' },
  IRAQ: { name: 'Iraq', commodities: ['oil'], significance: 'OPEC member, major producer' },
  SAUDI_ARABIA: { name: 'Saudi Arabia', commodities: ['oil'], significance: 'OPEC leader' },
  RUSSIA: { name: 'Russia', commodities: ['oil', 'gas', 'wheat', 'palladium'], significance: 'OPEC+' },
  STRAIT_OF_HORMUZ: { name: 'Strait of Hormuz', commodities: ['oil', 'lng'], significance: '20% global oil' },
  RED_SEA: { name: 'Red Sea', commodities: ['oil', 'shipping'], significance: 'Houthi disruptions' },
  SOMALILAND: { name: 'Somaliland', commodities: ['shipping'], significance: 'Gulf of Aden' },
  LIBYA: { name: 'Libya', commodities: ['oil'], significance: 'OPEC, supply disruptions' },
  NIGERIA: { name: 'Nigeria', commodities: ['oil', 'cocoa'], significance: 'OPEC, Africa' },
  
  // Metals hotspots
  CONGO_DRC: { name: 'Congo DRC', commodities: ['cobalt', 'copper'], significance: '70% global cobalt' },
  CHILE: { name: 'Chile', commodities: ['copper', 'lithium'], significance: 'Largest copper producer' },
  SOUTH_AFRICA: { name: 'South Africa', commodities: ['gold', 'platinum', 'palladium'], significance: 'PGMs' },
  INDONESIA: { name: 'Indonesia', commodities: ['nickel', 'tin', 'palm_oil'], significance: 'Nickel controls' },
  CHINA: { name: 'China', commodities: ['rare_earths', 'steel'], significance: 'Demand driver' },
  
  // Agriculture hotspots
  UKRAINE: { name: 'Ukraine', commodities: ['wheat', 'corn', 'sunflower'], significance: 'Breadbasket' },
  BRAZIL: { name: 'Brazil', commodities: ['soybeans', 'coffee', 'sugar'], significance: 'Agri superpower' },
  ARGENTINA: { name: 'Argentina', commodities: ['soybeans', 'corn', 'wheat'], significance: 'Grain exporter' },
  IVORY_COAST: { name: 'Ivory Coast', commodities: ['cocoa'], significance: '40% global cocoa' },
};

/**
 * Central banks for rate decisions
 */
export const CentralBanks = {
  FED: { name: 'Federal Reserve', currency: 'USD', region: 'United States' },
  ECB: { name: 'European Central Bank', currency: 'EUR', region: 'Eurozone' },
  BOE: { name: 'Bank of England', currency: 'GBP', region: 'United Kingdom' },
  BOJ: { name: 'Bank of Japan', currency: 'JPY', region: 'Japan' },
  PBOC: { name: "People's Bank of China", currency: 'CNY', region: 'China' },
  RBA: { name: 'Reserve Bank of Australia', currency: 'AUD', region: 'Australia' },
  SNB: { name: 'Swiss National Bank', currency: 'CHF', region: 'Switzerland' },
  BOC: { name: 'Bank of Canada', currency: 'CAD', region: 'Canada' },
};

/**
 * OPEC members list
 */
export const OPECMembers = [
  'Saudi Arabia', 'Iraq', 'Iran', 'UAE', 'Kuwait', 'Venezuela',
  'Libya', 'Nigeria', 'Algeria', 'Angola', 'Congo', 'Equatorial Guinea', 'Gabon'
];

export const OPECPlusMembers = [
  ...OPECMembers,
  'Russia', 'Kazakhstan', 'Azerbaijan', 'Bahrain', 'Brunei',
  'Malaysia', 'Mexico', 'Oman', 'South Sudan', 'Sudan'
];

/**
 * Fetch prediction markets
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} List of markets
 */
export const fetchPredictionMarkets = async (options = {}) => {
  try {
    const { commodity, category, status = 'open', limit = 50 } = options;
    
    const params = new URLSearchParams();
    if (commodity) params.append('commodity', commodity);
    if (category) params.append('category', category);
    params.append('status', status);
    params.append('limit', limit.toString());
    
    const response = await fetchWithTimeout(
      `${POLYMARKET_API}/markets?${params.toString()}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.markets || [];
    
  } catch (error) {
    console.error('Error fetching prediction markets:', error);
    // Return mock data on error
    return getMockMarkets();
  }
};

/**
 * Fetch market statistics
 * @returns {Promise<Object>} Market stats
 */
export const fetchMarketStats = async () => {
  try {
    const response = await fetchWithTimeout(`${POLYMARKET_API}/stats`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Error fetching market stats:', error);
    // Return mock stats
    return {
      monthly_volume: 3660700,
      active_markets: 5,
      resolving_soon: 3,
      total_traders: 20135,
      categories: {
        'Oil & Energy': 2,
        'Metals': 2,
        'Agriculture': 1,
      },
    };
  }
};

/**
 * Fetch details for a specific market
 * @param {string} marketId - Market ID
 * @returns {Promise<Object>} Market details
 */
export const fetchMarketDetails = async (marketId) => {
  try {
    const response = await fetchWithTimeout(
      `${POLYMARKET_API}/markets/${marketId}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.market;
    
  } catch (error) {
    console.error('Error fetching market details:', error);
    return null;
  }
};

/**
 * Fetch trending markets
 * @param {number} limit - Number of markets to fetch
 * @returns {Promise<Array>} Trending markets
 */
export const fetchTrendingMarkets = async (limit = 10) => {
  try {
    const response = await fetchWithTimeout(
      `${POLYMARKET_API}/markets/trending?limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.markets || [];
    
  } catch (error) {
    console.error('Error fetching trending markets:', error);
    return [];
  }
};

/**
 * Place an order on a prediction market
 * @param {Object} order - Order details
 * @returns {Promise<Object>} Order result
 */
export const placeOrder = async (order) => {
  try {
    const { marketId, side, amount, price } = order;
    
    const response = await fetchWithTimeout(`${POLYMARKET_API}/orders`, {
      method: 'POST',
      body: JSON.stringify({
        market_id: marketId,
        side,
        amount,
        price,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API error: ${response.status}`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Error placing order:', error);
    return {
      status: 'error',
      message: error.message,
    };
  }
};

/**
 * Create a new commodity prediction market
 * @param {Object} market - Market details
 * @returns {Promise<Object>} Created market
 */
export const createMarket = async (market) => {
  try {
    const { commodity, targetPrice, resolveDate, marketType = 'price_target' } = market;
    
    const response = await fetchWithTimeout(`${POLYMARKET_API}/markets/create`, {
      method: 'POST',
      body: JSON.stringify({
        commodity,
        target_price: targetPrice,
        resolve_date: resolveDate,
        market_type: marketType,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API error: ${response.status}`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Error creating market:', error);
    return {
      status: 'error',
      message: error.message,
    };
  }
};

/**
 * Fetch user positions
 * @param {string} userAddress - User's wallet address
 * @returns {Promise<Array>} User positions
 */
export const fetchUserPositions = async (userAddress) => {
  try {
    const response = await fetchWithTimeout(
      `${POLYMARKET_API}/users/${userAddress}/positions`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.positions || [];
    
  } catch (error) {
    console.error('Error fetching user positions:', error);
    return [];
  }
};

/**
 * Fetch market orderbook
 * @param {string} marketId - Market ID
 * @returns {Promise<Object>} Orderbook data
 */
export const fetchOrderbook = async (marketId) => {
  try {
    const response = await fetchWithTimeout(
      `${POLYMARKET_API}/markets/${marketId}/orderbook`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.orderbook || { bids: [], asks: [] };
    
  } catch (error) {
    console.error('Error fetching orderbook:', error);
    return { bids: [], asks: [] };
  }
};

/**
 * Get mock markets for development/fallback
 * Includes commodities, macroeconomics, central banks, FX, and geopolitics
 */
const getMockMarkets = () => [
  // Oil & Energy
  {
    id: 'mock_wti_50',
    title: 'Will WTI Crude oil close above $50 by end of month?',
    description: 'Market resolves YES if WTI crude futures close above $50/barrel',
    category: 'Oil & Energy',
    status: 'open',
    yesPrice: 72,
    noPrice: 28,
    volume: 534300,
    liquidity: 100000,
    traderCount: 5343,
    resolveDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(),
    commodityTicker: 'WTI',
    targetPrice: 50,
    tags: ['OIL', 'ENERGY', 'WTI'],
    yesLowPrice: 100,
    yesHighPrice: 138,
    noLowPrice: 100,
    noHighPrice: 357,
  },
  {
    id: 'mock_brent_80',
    title: 'Will Brent Crude hit $80 by January 31, 2026?',
    description: 'Market resolves YES if Brent crude futures close at or above $80',
    category: 'Oil & Energy',
    status: 'open',
    yesPrice: 65,
    noPrice: 35,
    volume: 445200,
    liquidity: 90000,
    traderCount: 4452,
    resolveDate: '2026-01-31T00:00:00Z',
    commodityTicker: 'BRENT',
    targetPrice: 80,
    tags: ['OIL', 'ENERGY', 'BRENT'],
    yesLowPrice: 100,
    yesHighPrice: 154,
    noLowPrice: 100,
    noHighPrice: 286,
  },
  
  // Metals
  {
    id: 'mock_gold_2100',
    title: 'Will Gold exceed $2100/oz by February 2026?',
    description: 'Market resolves YES if spot gold price exceeds $2100 per ounce',
    category: 'Metals',
    status: 'open',
    yesPrice: 45,
    noPrice: 55,
    volume: 287400,
    liquidity: 75000,
    traderCount: 2874,
    resolveDate: '2026-02-15T00:00:00Z',
    commodityTicker: 'GOLD',
    targetPrice: 2100,
    tags: ['GOLD', 'METALS', 'PRECIOUS', 'SAFE HAVEN'],
    yesLowPrice: 100,
    yesHighPrice: 222,
    noLowPrice: 100,
    noHighPrice: 182,
  },
  {
    id: 'mock_cobalt_congo',
    title: 'Will DRC cobalt exports face >20% disruption in Q1 2026?',
    description: 'Resolves YES if Congo DRC cobalt exports decrease >20% in Q1 2026',
    category: 'Geopolitics',
    status: 'open',
    yesPrice: 35,
    noPrice: 65,
    volume: 189000,
    liquidity: 45000,
    traderCount: 1890,
    resolveDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    commodityTicker: 'COBALT',
    tags: ['COBALT', 'CONGO', 'DRC', 'EV', 'BATTERIES', 'GEOPOLITICS'],
    yesLowPrice: 100,
    yesHighPrice: 286,
    noLowPrice: 100,
    noHighPrice: 154,
  },
  
  // Agriculture
  {
    id: 'mock_wheat_weather',
    title: 'Will US wheat production decrease >10% due to winter weather?',
    description: 'Resolves YES if USDA reports >10% decrease in winter wheat production',
    category: 'Agriculture',
    status: 'open',
    yesPrice: 38,
    noPrice: 62,
    volume: 156200,
    liquidity: 50000,
    traderCount: 1562,
    resolveDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    commodityTicker: 'WHEAT',
    tags: ['WHEAT', 'AGRICULTURE', 'WEATHER'],
    yesLowPrice: 100,
    yesHighPrice: 263,
    noLowPrice: 100,
    noHighPrice: 161,
  },
  {
    id: 'mock_coffee_brazil',
    title: 'Will Arabica coffee exceed $3/lb on Brazil drought by Q2 2026?',
    description: 'Resolves YES if ICE Arabica coffee futures exceed $3.00/lb',
    category: 'Agriculture',
    status: 'open',
    yesPrice: 42,
    noPrice: 58,
    volume: 234500,
    liquidity: 55000,
    traderCount: 2345,
    resolveDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
    commodityTicker: 'COFFEE',
    targetPrice: 3.0,
    tags: ['COFFEE', 'BRAZIL', 'DROUGHT', 'AGRICULTURE'],
    yesLowPrice: 100,
    yesHighPrice: 238,
    noLowPrice: 100,
    noHighPrice: 172,
  },
  
  // Central Banks & Interest Rates
  {
    id: 'mock_fed_rate_jan',
    title: 'Will the Fed cut rates by 25bps at the January 2026 FOMC meeting?',
    description: 'Resolves YES if Federal Reserve announces 25bps rate cut at January FOMC',
    category: 'Central Banks',
    status: 'open',
    yesPrice: 68,
    noPrice: 32,
    volume: 1245000,
    liquidity: 250000,
    traderCount: 12450,
    resolveDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['FED', 'FOMC', 'INTEREST RATES', 'MONETARY POLICY'],
    yesLowPrice: 100,
    yesHighPrice: 147,
    noLowPrice: 100,
    noHighPrice: 313,
  },
  {
    id: 'mock_ecb_rate_q1',
    title: 'Will the ECB cut rates below 3% by end of Q1 2026?',
    description: 'Resolves YES if ECB main refinancing rate falls below 3.00%',
    category: 'Central Banks',
    status: 'open',
    yesPrice: 55,
    noPrice: 45,
    volume: 876000,
    liquidity: 180000,
    traderCount: 8760,
    resolveDate: new Date(Date.now() + 83 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['ECB', 'EUROZONE', 'INTEREST RATES', 'MONETARY POLICY'],
    yesLowPrice: 100,
    yesHighPrice: 182,
    noLowPrice: 100,
    noHighPrice: 222,
  },
  {
    id: 'mock_boj_negative',
    title: 'Will the Bank of Japan end negative rates by mid-2026?',
    description: 'Resolves YES if BOJ raises rates above 0% before July 1, 2026',
    category: 'Central Banks',
    status: 'open',
    yesPrice: 72,
    noPrice: 28,
    volume: 654000,
    liquidity: 140000,
    traderCount: 6540,
    resolveDate: new Date(Date.now() + 175 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['BOJ', 'JAPAN', 'INTEREST RATES', 'YEN'],
    yesLowPrice: 100,
    yesHighPrice: 139,
    noLowPrice: 100,
    noHighPrice: 357,
  },
  
  // Inflation
  {
    id: 'mock_us_cpi_3',
    title: 'Will US Core CPI fall below 3% by March 2026?',
    description: 'Resolves YES if US Core CPI YoY falls below 3.0%',
    category: 'Inflation',
    status: 'open',
    yesPrice: 62,
    noPrice: 38,
    volume: 945000,
    liquidity: 200000,
    traderCount: 9450,
    resolveDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['INFLATION', 'CPI', 'US', 'FEDERAL RESERVE'],
    yesLowPrice: 100,
    yesHighPrice: 161,
    noLowPrice: 100,
    noHighPrice: 263,
  },
  {
    id: 'mock_eu_inflation',
    title: 'Will Eurozone inflation return to 2% target by Q2 2026?',
    description: 'Resolves YES if Eurozone HICP falls to or below 2.0% YoY',
    category: 'Inflation',
    status: 'open',
    yesPrice: 48,
    noPrice: 52,
    volume: 567000,
    liquidity: 120000,
    traderCount: 5670,
    resolveDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['INFLATION', 'EUROZONE', 'ECB', 'HICP'],
    yesLowPrice: 100,
    yesHighPrice: 208,
    noLowPrice: 100,
    noHighPrice: 192,
  },
  
  // Foreign Exchange
  {
    id: 'mock_eurusd_parity',
    title: 'Will EUR/USD reach parity (1.00) by mid-2026?',
    description: 'Resolves YES if EUR/USD touches 1.0000 or below',
    category: 'Foreign Exchange',
    status: 'open',
    yesPrice: 25,
    noPrice: 75,
    volume: 789000,
    liquidity: 165000,
    traderCount: 7890,
    resolveDate: new Date(Date.now() + 175 * 24 * 60 * 60 * 1000).toISOString(),
    targetPrice: 1.0,
    tags: ['FOREX', 'EUR/USD', 'EURO', 'DOLLAR'],
    yesLowPrice: 100,
    yesHighPrice: 400,
    noLowPrice: 100,
    noHighPrice: 133,
  },
  {
    id: 'mock_usdjpy_160',
    title: 'Will USD/JPY break above 160 in Q1 2026?',
    description: 'Resolves YES if USD/JPY exceeds 160.00',
    category: 'Foreign Exchange',
    status: 'open',
    yesPrice: 40,
    noPrice: 60,
    volume: 543000,
    liquidity: 115000,
    traderCount: 5430,
    resolveDate: new Date(Date.now() + 83 * 24 * 60 * 60 * 1000).toISOString(),
    targetPrice: 160.0,
    tags: ['FOREX', 'USD/JPY', 'YEN', 'BOJ INTERVENTION'],
    yesLowPrice: 100,
    yesHighPrice: 250,
    noLowPrice: 100,
    noHighPrice: 167,
  },
  {
    id: 'mock_dxy_110',
    title: 'Will the Dollar Index (DXY) exceed 110 by February 2026?',
    description: 'Resolves YES if DXY closes above 110.00',
    category: 'Foreign Exchange',
    status: 'open',
    yesPrice: 35,
    noPrice: 65,
    volume: 432000,
    liquidity: 95000,
    traderCount: 4320,
    resolveDate: new Date(Date.now() + 53 * 24 * 60 * 60 * 1000).toISOString(),
    targetPrice: 110.0,
    tags: ['FOREX', 'DXY', 'DOLLAR INDEX', 'USD'],
    yesLowPrice: 100,
    yesHighPrice: 286,
    noLowPrice: 100,
    noHighPrice: 154,
  },
  
  // OPEC
  {
    id: 'mock_opec_cut',
    title: 'Will OPEC+ announce additional production cuts in Q1 2026?',
    description: 'Resolves YES if OPEC+ announces new cuts >500k bpd',
    category: 'OPEC',
    status: 'open',
    yesPrice: 58,
    noPrice: 42,
    volume: 678000,
    liquidity: 145000,
    traderCount: 6780,
    resolveDate: new Date(Date.now() + 83 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['OPEC', 'OPEC+', 'OIL', 'PRODUCTION CUTS', 'SAUDI'],
    yesLowPrice: 100,
    yesHighPrice: 172,
    noLowPrice: 100,
    noHighPrice: 238,
  },
  {
    id: 'mock_saudi_price_war',
    title: 'Will Saudi Arabia initiate oil price war in 2026?',
    description: 'Resolves YES if Saudi increases production unilaterally by >1M bpd',
    category: 'OPEC',
    status: 'open',
    yesPrice: 15,
    noPrice: 85,
    volume: 345000,
    liquidity: 75000,
    traderCount: 3450,
    resolveDate: new Date(Date.now() + 358 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['OPEC', 'SAUDI ARABIA', 'OIL', 'PRICE WAR'],
    yesLowPrice: 100,
    yesHighPrice: 667,
    noLowPrice: 100,
    noHighPrice: 118,
  },
  
  // Geopolitics
  {
    id: 'mock_hormuz_disruption',
    title: 'Will Strait of Hormuz face major shipping disruption in Q1 2026?',
    description: 'Resolves YES if >10% reduction in tanker traffic for >7 days',
    category: 'Geopolitics',
    status: 'open',
    yesPrice: 22,
    noPrice: 78,
    volume: 456000,
    liquidity: 100000,
    traderCount: 4560,
    resolveDate: new Date(Date.now() + 83 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['STRAIT OF HORMUZ', 'IRAN', 'OIL', 'SHIPPING', 'GEOPOLITICS'],
    yesLowPrice: 100,
    yesHighPrice: 455,
    noLowPrice: 100,
    noHighPrice: 128,
  },
  {
    id: 'mock_venezuela_sanctions',
    title: 'Will US ease Venezuela oil sanctions further in 2026?',
    description: 'Resolves YES if US Treasury expands Venezuela export licenses',
    category: 'Geopolitics',
    status: 'open',
    yesPrice: 45,
    noPrice: 55,
    volume: 234000,
    liquidity: 50000,
    traderCount: 2340,
    resolveDate: new Date(Date.now() + 358 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['VENEZUELA', 'SANCTIONS', 'OIL', 'US POLICY'],
    yesLowPrice: 100,
    yesHighPrice: 222,
    noLowPrice: 100,
    noHighPrice: 182,
  },
  {
    id: 'mock_red_sea_shipping',
    title: 'Will Red Sea shipping disruptions continue through Q2 2026?',
    description: 'Resolves YES if major shipping lines maintain route diversions',
    category: 'Geopolitics',
    status: 'open',
    yesPrice: 68,
    noPrice: 32,
    volume: 567000,
    liquidity: 125000,
    traderCount: 5670,
    resolveDate: new Date(Date.now() + 175 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['RED SEA', 'HOUTHI', 'SHIPPING', 'SUEZ', 'GEOPOLITICS'],
    yesLowPrice: 100,
    yesHighPrice: 147,
    noLowPrice: 100,
    noHighPrice: 313,
  },
  {
    id: 'mock_iran_nuclear',
    title: 'Will Iran nuclear deal negotiations resume in 2026?',
    description: 'Resolves YES if formal JCPOA negotiations resume',
    category: 'Geopolitics',
    status: 'open',
    yesPrice: 30,
    noPrice: 70,
    volume: 189000,
    liquidity: 40000,
    traderCount: 1890,
    resolveDate: new Date(Date.now() + 358 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['IRAN', 'NUCLEAR', 'SANCTIONS', 'OIL', 'GEOPOLITICS'],
    yesLowPrice: 100,
    yesHighPrice: 333,
    noLowPrice: 100,
    noHighPrice: 143,
  },
  {
    id: 'mock_ukraine_grain',
    title: 'Will Black Sea grain corridor be fully restored by mid-2026?',
    description: 'Resolves YES if Ukraine grain exports return to pre-war levels',
    category: 'Geopolitics',
    status: 'open',
    yesPrice: 28,
    noPrice: 72,
    volume: 345000,
    liquidity: 75000,
    traderCount: 3450,
    resolveDate: new Date(Date.now() + 175 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['UKRAINE', 'GRAIN', 'BLACK SEA', 'WHEAT', 'GEOPOLITICS'],
    yesLowPrice: 100,
    yesHighPrice: 357,
    noLowPrice: 100,
    noHighPrice: 139,
  },
  {
    id: 'mock_nigeria_oil',
    title: 'Will Nigeria oil production exceed 2M bpd in 2026?',
    description: 'Resolves YES if Nigeria production exceeds 2M bpd for any month',
    category: 'Geopolitics',
    status: 'open',
    yesPrice: 42,
    noPrice: 58,
    volume: 178000,
    liquidity: 38000,
    traderCount: 1780,
    resolveDate: new Date(Date.now() + 358 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['NIGERIA', 'OIL', 'AFRICA', 'OPEC'],
    yesLowPrice: 100,
    yesHighPrice: 238,
    noLowPrice: 100,
    noHighPrice: 172,
  },
  
  // Economics
  {
    id: 'mock_us_recession',
    title: 'Will the US enter recession in 2026?',
    description: 'Resolves YES if NBER declares US recession beginning in 2026',
    category: 'Economics',
    status: 'open',
    yesPrice: 25,
    noPrice: 75,
    volume: 1567000,
    liquidity: 350000,
    traderCount: 15670,
    resolveDate: new Date(Date.now() + 358 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['RECESSION', 'US', 'GDP', 'ECONOMY'],
    yesLowPrice: 100,
    yesHighPrice: 400,
    noLowPrice: 100,
    noHighPrice: 133,
  },
  {
    id: 'mock_china_gdp',
    title: 'Will China GDP growth exceed 5% in 2026?',
    description: 'Resolves YES if China official GDP growth exceeds 5.0%',
    category: 'Economics',
    status: 'open',
    yesPrice: 48,
    noPrice: 52,
    volume: 876000,
    liquidity: 190000,
    traderCount: 8760,
    resolveDate: new Date(Date.now() + 380 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['CHINA', 'GDP', 'ECONOMY', 'GROWTH'],
    yesLowPrice: 100,
    yesHighPrice: 208,
    noLowPrice: 100,
    noHighPrice: 192,
  },
];

/**
 * Calculate potential payout for a trade
 * @param {number} amount - Trade amount in USDC
 * @param {number} price - Current price (0-100)
 * @param {string} side - 'yes' or 'no'
 * @returns {Object} Payout calculation
 */
export const calculatePayout = (amount, price, side) => {
  const priceDecimal = price / 100;
  const shares = amount / priceDecimal;
  const potentialPayout = shares; // Each share pays $1 if correct
  const potentialProfit = potentialPayout - amount;
  const roi = ((potentialProfit / amount) * 100).toFixed(1);
  
  return {
    shares: shares.toFixed(2),
    potentialPayout: potentialPayout.toFixed(2),
    potentialProfit: potentialProfit.toFixed(2),
    roi,
  };
};

/**
 * Format volume for display
 * @param {number} volume - Volume in USD
 * @returns {string} Formatted volume string
 */
export const formatVolume = (volume) => {
  if (!volume) return '$0';
  if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
  if (volume >= 1000) return `$${Math.round(volume / 1000)}K`;
  return `$${volume.toLocaleString()}`;
};

/**
 * Calculate time until resolution
 * @param {string} resolveDate - ISO date string
 * @returns {string} Formatted time string
 */
export const getTimeToResolve = (resolveDate) => {
  if (!resolveDate) return 'TBD';
  
  const now = new Date();
  const resolve = new Date(resolveDate);
  const diffMs = resolve - now;
  
  if (diffMs <= 0) return 'Resolving Soon';
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 30) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours > 0) return `${diffHours}h`;
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  return `${diffMins}m`;
};

export default {
  fetchPredictionMarkets,
  fetchMarketStats,
  fetchMarketDetails,
  fetchTrendingMarkets,
  placeOrder,
  createMarket,
  fetchUserPositions,
  fetchOrderbook,
  calculatePayout,
  formatVolume,
  getTimeToResolve,
  MarketCategories,
};