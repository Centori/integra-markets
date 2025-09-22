import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendMarketAlert, sendNewsAlert } from './notificationService';
import { addAlert } from './alertService';

// API configuration
const API_BASE_URL = 'http://localhost:8000';
const API_URL = `${API_BASE_URL}/api`;

// Market data symbols mapping
const MARKET_SYMBOLS = {
  'Gold': { type: 'commodity', symbol: 'XAU' },
  'Silver': { type: 'commodity', symbol: 'XAG' },
  'Oil': { type: 'commodity', symbol: 'WTI' },
  'EUR/USD': { type: 'fx', from: 'EUR', to: 'USD' },
  'GBP/USD': { type: 'fx', from: 'GBP', to: 'USD' },
  'USD/JPY': { type: 'fx', from: 'USD', to: 'JPY' }
};

// Fetch real market data from backend API
async function fetchRealMarketData() {
  const marketData = {};
  
  try {
    // Fetch commodity and FX data from backend
    for (const [name, config] of Object.entries(MARKET_SYMBOLS)) {
      try {
        let response;
        if (config.type === 'commodity') {
          response = await fetch(`${API_URL}/market-data/commodities/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: config.symbol })
          });
        } else if (config.type === 'fx') {
          response = await fetch(`${API_URL}/market-data/fx/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              from_symbol: config.from, 
              to_symbol: config.to 
            })
          });
        }
        
        if (response && response.ok) {
          const data = await response.json();
          marketData[name] = {
            price: parseFloat(data.price || data.rate || 0),
            change: parseFloat(data.change_percent || 0),
            volume: parseInt(data.volume || 0)
          };
        }
      } catch (error) {
        console.warn(`Failed to fetch data for ${name}:`, error);
        // Keep previous data if available
      }
    }
    
    return marketData;
  } catch (error) {
    console.error('Error fetching real market data:', error);
    return {};
  }
}

// Fetch real news data from backend API
async function fetchRealNewsData() {
  try {
    const response = await fetch(`${API_URL}/news/latest`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const newsData = await response.json();
      return newsData.slice(0, 10).map(article => ({
        headline: article.title,
        source: article.source,
        impact: article.sentiment === 'bullish' || article.sentiment === 'bearish' ? 'high' : 'medium',
        category: article.category || 'general'
      }));
    }
  } catch (error) {
    console.error('Error fetching real news data:', error);
  }
  
  return [];
}

class AlertMonitoringService {
  constructor() {
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.lastPrices = {};
  }

  // Start monitoring alerts based on user preferences
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('Alert monitoring already running');
      return;
    }

    try {
      const preferences = await this.loadAlertPreferences();
      if (!preferences.enabled) {
        console.log('Alert monitoring disabled in preferences');
        return;
      }

      this.isMonitoring = true;
      console.log('Starting alert monitoring service...');

      // Initialize last prices with real market data
      const initialData = await fetchRealMarketData();
      this.lastPrices = { ...initialData };

      // Start monitoring interval
      this.monitoringInterval = setInterval(async () => {
        await this.checkMarketConditions(preferences);
        await this.checkNewsAlerts(preferences);
      }, preferences.checkInterval || 30000); // Default 30 seconds

      // Send initial system alert
      await addAlert({
        type: 'system',
        severity: 'low',
        title: 'Alert Monitoring Started',
        message: 'Real-time alert monitoring is now active based on your preferences.'
      });

    } catch (error) {
      console.error('Error starting alert monitoring:', error);
      this.isMonitoring = false;
    }
  }

  // Stop monitoring
  async stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Alert monitoring service stopped');

    // Send system alert
    await addAlert({
      type: 'system',
      severity: 'low',
      title: 'Alert Monitoring Stopped',
      message: 'Real-time alert monitoring has been disabled.'
    });
  }

  // Check market conditions and generate alerts
  async checkMarketConditions(preferences) {
    try {
      // Fetch real market data
      const updatedData = await fetchRealMarketData();

      for (const [commodity, data] of Object.entries(updatedData)) {
        const lastPrice = this.lastPrices[commodity]?.price || data.price;
        const priceChange = ((data.price - lastPrice) / lastPrice) * 100;

        // Check price movement thresholds
        if (preferences.priceMovements && Math.abs(priceChange) >= preferences.priceThreshold) {
          const severity = Math.abs(priceChange) >= 5 ? 'high' : 'medium';
          const direction = priceChange > 0 ? 'increased' : 'decreased';
          
          await sendMarketAlert(
            `${commodity} Price Alert`,
            `${commodity} ${direction} by ${Math.abs(priceChange).toFixed(2)}% to $${data.price}`,
            {
              commodity,
              priceChange,
              newPrice: data.price,
              oldPrice: lastPrice,
              severity
            }
          );
        }

        // Check volume alerts
        if (preferences.volumeAlerts && data.volume > (preferences.volumeThreshold || 1000000)) {
          await sendMarketAlert(
            `${commodity} Volume Alert`,
            `High trading volume detected: ${(data.volume / 1000000).toFixed(1)}M`,
            {
              commodity,
              volume: data.volume,
              severity: 'medium'
            }
          );
        }
      }

      // Update last prices
      this.lastPrices = updatedData;

    } catch (error) {
      console.error('Error checking market conditions:', error);
    }
  }

  // Check for news alerts
  async checkNewsAlerts(preferences) {
    if (!preferences.breakingNews) {
      return;
    }

    try {
      // Fetch real news data
      const newsData = await fetchRealNewsData();
      
      // Check for high-impact news
      const highImpactNews = newsData.filter(news => news.impact === 'high');
      
      for (const news of highImpactNews.slice(0, 3)) { // Limit to 3 alerts per check
        await sendNewsAlert(
          'Breaking News',
          news.headline,
          {
            source: news.source,
            impact: news.impact,
            category: news.category,
            severity: news.impact === 'high' ? 'high' : 'medium'
          }
        );
      }
    } catch (error) {
      console.error('Error checking news alerts:', error);
    }
  }

  // Calculate price changes from real market data
  calculatePriceChanges(currentData, previousData) {
    const changes = {};
    
    for (const [commodity, current] of Object.entries(currentData)) {
      const previous = previousData[commodity];
      if (previous && previous.price > 0) {
        const changePercent = ((current.price - previous.price) / previous.price) * 100;
        changes[commodity] = {
          ...current,
          change: changePercent
        };
      } else {
        changes[commodity] = current;
      }
    }
    
    return changes;
  }

  // Load alert preferences
  async loadAlertPreferences() {
    try {
      const stored = await AsyncStorage.getItem('alertPreferences');
      const defaultPreferences = {
        enabled: true,
        priceMovements: true,
        breakingNews: true,
        volumeAlerts: false,
        priceThreshold: 2.0, // 2% price change
        volumeThreshold: 1000000,
        checkInterval: 30000 // 30 seconds
      };
      
      return stored ? { ...defaultPreferences, ...JSON.parse(stored) } : defaultPreferences;
    } catch (error) {
      console.error('Error loading alert preferences:', error);
      return {
        enabled: true,
        priceMovements: true,
        breakingNews: true,
        volumeAlerts: false,
        priceThreshold: 2.0,
        volumeThreshold: 1000000,
        checkInterval: 30000
      };
    }
  }

  // Get monitoring status
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      hasInterval: !!this.monitoringInterval,
      lastPricesCount: Object.keys(this.lastPrices).length
    };
  }

  // Trigger manual market check
  async triggerManualCheck() {
    try {
      const preferences = await this.loadAlertPreferences();
      
      // Fetch current market data
      const currentData = await fetchRealMarketData();
      if (Object.keys(currentData).length === 0) {
        throw new Error('Failed to fetch market data');
      }
      
      // Calculate changes and check conditions
      const updatedData = this.calculatePriceChanges(currentData, this.lastPrices);
      await this.checkMarketConditions(preferences);
      
      // Update last prices and check news
      this.lastPrices = currentData;
      await this.checkNewsAlerts(preferences);
      
      await addAlert({
        type: 'system',
        severity: 'low',
        title: 'Manual Check Completed',
        message: 'Real-time market conditions and news have been checked.'
      });
    } catch (error) {
      console.error('Error in manual check:', error);
      await addAlert({
        type: 'system',
        severity: 'high',
        title: 'Manual Check Failed',
        message: `Error checking market conditions: ${error.message}`
      });
    }
  }
}

// Export singleton instance
export default new AlertMonitoringService();