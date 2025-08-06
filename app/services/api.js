/**
 * API Service for Integra Markets
 * Handles communication with the Python FastAPI backend
 */

const API_BASE_URL = 'http://172.20.10.7:8000';
const API_URL = `${API_BASE_URL}/api`;

/**
 * Fetches market sentiment data from the Python backend
 * @returns {Promise<Object>} Market sentiment data
 */
export const fetchMarketSentiment = async () => {
  try {
    const response = await fetch(`${API_URL}/sentiment/market`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching market sentiment:', error);
    // Return default data if API is unreachable
    return {
      overall: 'NEUTRAL',
      confidence: 50,
      commodities: [
        { name: 'OIL', change: 0.0 },
        { name: 'NAT GAS', change: 0.0 },
        { name: 'WHEAT', change: 0.0 },
        { name: 'GOLD', change: 0.0 },
      ]
    };
  }
};

/**
 * Fetches top market movers data
 * @returns {Promise<Array>} Top market movers
 */
export const fetchTopMovers = async () => {
  try {
    const response = await fetch(`${API_URL}/sentiment/movers`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching top movers:', error);
    return [
      { symbol: 'OIL', sentiment: 0.0, trend: 'neutral' },
      { symbol: 'CORN', sentiment: 0.0, trend: 'neutral' },
      { symbol: 'COPPER', sentiment: 0.0, trend: 'neutral' },
      { symbol: 'SILVER', sentiment: 0.0, trend: 'neutral' },
    ];
  }
};

/**
 * Fetches latest news analysis
 * @returns {Promise<Array>} News items with sentiment analysis
 */
export const fetchNewsAnalysis = async () => {
  try {
    const response = await fetch(`${API_URL}/news/analysis`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching news analysis:', error);
    return [];
  }
};

/**
 * Fetches latest weather alerts
 * @returns {Promise<Object>} Weather alerts
 */
export const fetchWeatherAlerts = async () => {
  try {
    const response = await fetch(`${API_URL}/weather/alerts`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching weather alerts:', error);
    return null;
  }
};

/**
 * Checks status of the Python backend
 * @returns {Promise<boolean>} True if backend is online
 */
export const checkApiStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.warn('API not available:', error);
    return false;
  }
};

/**
 * Preprocesses raw news text
 * @param {string} rawText - Raw news text
 * @returns {Promise<Object>} Preprocessed news data
 */
export const preprocessNews = async (rawText) => {
  try {
    const response = await fetch(`${API_URL}/preprocess-news`, {
      method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` }),
      },
      body: JSON.stringify({ text: rawText }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('News preprocessing failed:', error);
    // Fallback to basic preprocessing
    return {
      commodity: 'general',
      event_type: 'market_movement',
      region: 'Global',
      entities: [],
      trigger_keywords: [],
      market_impact: 'neutral',
      severity: 'low',
      confidence_score: 0.1,
      summary: rawText.substring(0, 200) + '...',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Fetches enhanced news data
 * @returns {Promise<Array>} Enhanced news items
 */
export const getEnhancedNews = async () => {
  try {
    const response = await fetch(`${API_URL}/news/enhanced`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Enhanced news fetch failed:', error);
    return [];
  }
};

/**
 * Performs sentiment analysis on text
 * @param {string} text - Text to analyze
 * @param {string|null} commodity - Optional commodity context
 * @returns {Promise<Object>} Sentiment analysis result
 */
export const getSentimentAnalysis = async (text, commodity = null) => {
  try {
    const response = await fetch(`${API_URL}/sentiment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text, 
        commodity,
        enhanced: true // Request enhanced analysis
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Sentiment analysis failed:', error);
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      commodity_specific: false
    };
  }
};