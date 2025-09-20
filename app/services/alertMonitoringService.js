import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendMarketAlert, sendNewsAlert } from './notificationService';
import { addAlert } from './alertService';

// Mock market data - in a real app, this would come from an API
const mockMarketData = {
  'Gold': { price: 2050, change: 2.5, volume: 1250000 },
  'Silver': { price: 24.80, change: -1.2, volume: 850000 },
  'Oil': { price: 78.50, change: 3.1, volume: 2100000 },
  'Bitcoin': { price: 43500, change: -2.8, volume: 15000000 },
  'Ethereum': { price: 2650, change: 1.9, volume: 8500000 },
  'S&P 500': { price: 4750, change: 0.8, volume: 3200000 },
  'NASDAQ': { price: 15200, change: 1.4, volume: 2800000 },
  'EUR/USD': { price: 1.0850, change: -0.3, volume: 5500000 }
};

// Mock news data
const mockNewsData = [
  {
    headline: 'Federal Reserve announces interest rate decision',
    source: 'Reuters',
    impact: 'high',
    category: 'monetary_policy'
  },
  {
    headline: 'Major tech earnings beat expectations',
    source: 'Bloomberg',
    impact: 'medium',
    category: 'earnings'
  },
  {
    headline: 'Oil prices surge on supply concerns',
    source: 'CNBC',
    impact: 'high',
    category: 'commodities'
  }
];

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

      // Initialize last prices
      this.lastPrices = { ...mockMarketData };

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
      // Simulate price changes
      const updatedData = this.simulateMarketChanges();

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
      // Simulate random news alerts
      if (Math.random() < 0.1) { // 10% chance per check
        const randomNews = mockNewsData[Math.floor(Math.random() * mockNewsData.length)];
        
        await sendNewsAlert(
          'Breaking News',
          randomNews.headline,
          {
            source: randomNews.source,
            impact: randomNews.impact,
            category: randomNews.category,
            severity: randomNews.impact === 'high' ? 'high' : 'medium'
          }
        );
      }
    } catch (error) {
      console.error('Error checking news alerts:', error);
    }
  }

  // Simulate market data changes
  simulateMarketChanges() {
    const updated = {};
    
    for (const [commodity, data] of Object.entries(mockMarketData)) {
      // Simulate price changes (-3% to +3%)
      const changePercent = (Math.random() - 0.5) * 6;
      const newPrice = data.price * (1 + changePercent / 100);
      
      // Simulate volume changes
      const volumeChange = (Math.random() - 0.5) * 0.4; // -20% to +20%
      const newVolume = Math.floor(data.volume * (1 + volumeChange));
      
      updated[commodity] = {
        price: Math.round(newPrice * 100) / 100,
        change: changePercent,
        volume: newVolume
      };
    }
    
    return updated;
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
      await this.checkMarketConditions(preferences);
      await this.checkNewsAlerts(preferences);
      
      await addAlert({
        type: 'system',
        severity: 'low',
        title: 'Manual Check Completed',
        message: 'Market conditions and news have been checked manually.'
      });
    } catch (error) {
      console.error('Error in manual check:', error);
    }
  }
}

// Export singleton instance
export default new AlertMonitoringService();