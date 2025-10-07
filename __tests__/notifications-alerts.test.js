/**
 * Notifications and Alerts Tests
 * Verifies notification and alert functionality with real-time integration
 */

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:8000',
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 1000
};

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock push notification service
const mockPushService = {
  register: jest.fn(),
  unregister: jest.fn(),
  sendNotification: jest.fn(),
  getPermissions: jest.fn()
};

describe('Notifications and Alerts Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    mockPushService.register.mockClear();
    mockPushService.sendNotification.mockClear();
  });

  describe('Push Notification Registration', () => {
    test('should register device for push notifications', async () => {
      const registrationData = {
        token: 'device_token_12345',
        platform: 'ios',
        app_version: '1.0.0',
        device_id: 'device_12345'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          subscription_id: 'sub_67890',
          message: 'Device registered successfully'
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/push/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.subscription_id).toBeDefined();
    });

    test('should handle registration errors gracefully', async () => {
      const invalidData = {
        token: '', // Invalid empty token
        platform: 'unknown'
      };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid token or platform',
          code: 'INVALID_REGISTRATION'
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/push/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('INVALID_REGISTRATION');
    });

    test('should update existing device registration', async () => {
      const updateData = {
        token: 'updated_token_12345',
        platform: 'ios',
        preferences: {
          market_alerts: true,
          news_updates: false,
          price_changes: true
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Registration updated',
          preferences_applied: 3
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/push/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.preferences_applied).toBe(3);
    });
  });

  describe('Notification Preferences Management', () => {
    test('should get current notification preferences', async () => {
      const mockPreferences = {
        push_enabled: true,
        email_enabled: false,
        market_alerts: true,
        news_updates: true,
        price_threshold: 2.5,
        sentiment_alerts: true,
        quiet_hours: {
          enabled: true,
          start: '22:00',
          end: '08:00'
        },
        categories: ['forex', 'commodities', 'crypto']
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPreferences
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/notifications/preferences`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer test_token' }
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.push_enabled).toBe(true);
      expect(data.price_threshold).toBe(2.5);
      expect(data.categories).toContain('forex');
    });

    test('should update notification preferences', async () => {
      const newPreferences = {
        market_alerts: false,
        news_updates: true,
        price_threshold: 5.0,
        sentiment_threshold: 0.8,
        frequency: 'hourly',
        categories: ['forex', 'stocks']
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Preferences updated successfully',
          active_rules: 8
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.active_rules).toBe(8);
    });

    test('should validate preference constraints', async () => {
      const invalidPreferences = {
        price_threshold: -1, // Invalid negative threshold
        sentiment_threshold: 1.5, // Invalid threshold > 1
        frequency: 'invalid_frequency'
      };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid preference values',
          details: {
            price_threshold: 'Must be positive',
            sentiment_threshold: 'Must be between 0 and 1',
            frequency: 'Invalid frequency option'
          }
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPreferences)
      });
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.details.price_threshold).toBeDefined();
    });
  });

  describe('Real-time Alert Generation', () => {
    test('should generate price-based market alerts', async () => {
      const priceAlert = {
        symbol: 'EUR/USD',
        current_price: 1.0950,
        previous_price: 1.0900,
        change_percent: 0.46,
        threshold: 0.25,
        alert_type: 'price_movement',
        direction: 'up'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          alert_generated: true,
          alert_id: 'alert_12345',
          recipients: 245,
          delivery_status: 'sent',
          message: 'EUR/USD up 0.46% - threshold exceeded'
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/alerts/price-movement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(priceAlert)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.alert_generated).toBe(true);
      expect(data.recipients).toBeGreaterThan(0);
      expect(data.alert_id).toBeDefined();
    });

    test('should generate sentiment-based news alerts', async () => {
      const sentimentAlert = {
        article_id: 456,
        title: 'Federal Reserve Announces Interest Rate Decision',
        sentiment: 'BEARISH',
        confidence: 0.92,
        impact_score: 9.2,
        categories: ['monetary_policy', 'interest_rates'],
        alert_type: 'sentiment_change'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          alert_generated: true,
          alert_id: 'sentiment_alert_789',
          priority: 'high',
          estimated_impact: 'significant',
          affected_markets: ['forex', 'bonds', 'stocks']
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/alerts/sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sentimentAlert)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.alert_generated).toBe(true);
      expect(data.priority).toBe('high');
      expect(data.affected_markets).toContain('forex');
    });

    test('should handle volume-based commodity alerts', async () => {
      const volumeAlert = {
        symbol: 'GOLD',
        current_volume: 150000,
        average_volume: 100000,
        volume_spike: 50,
        price: 2015.50,
        alert_type: 'volume_spike'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          alert_generated: true,
          alert_id: 'volume_alert_321',
          spike_percentage: 50,
          market_significance: 'high',
          related_news: 2
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/alerts/volume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(volumeAlert)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.alert_generated).toBe(true);
      expect(data.spike_percentage).toBe(50);
      expect(data.market_significance).toBe('high');
    });
  });

  describe('Test Notification Delivery', () => {
    test('should send test notification successfully', async () => {
      const testNotification = {
        title: 'Test Market Alert',
        body: 'This is a test notification from Integra Markets',
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
          source: 'test_suite'
        },
        priority: 'normal'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          delivered: true,
          delivery_time_ms: 180,
          notification_id: 'test_notif_123',
          status: 'success'
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/notifications/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testNotification)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.delivered).toBe(true);
      expect(data.delivery_time_ms).toBeLessThan(1000);
      expect(data.notification_id).toBeDefined();
    });

    test('should handle test notification failures', async () => {
      const testNotification = {
        title: 'Test Alert',
        body: 'Test message',
        invalid_field: 'should_cause_error'
      };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          delivered: false,
          error: 'Invalid notification format',
          error_code: 'INVALID_FORMAT'
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/notifications/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testNotification)
      });
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.delivered).toBe(false);
      expect(data.error).toBeDefined();
    });

    test('should verify notification delivery status', async () => {
      const notificationId = 'test_notif_456';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          notification_id: notificationId,
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          delivery_attempts: 1,
          recipient_count: 1
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/notifications/status/${notificationId}`, {
        method: 'GET'
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.status).toBe('delivered');
      expect(data.delivery_attempts).toBe(1);
      expect(data.delivered_at).toBeDefined();
    });
  });

  describe('Alert Customization and Scheduling', () => {
    test('should create custom alert templates', async () => {
      const customTemplate = {
        name: 'High Impact News Alert',
        trigger_conditions: {
          sentiment_threshold: 0.85,
          impact_score_min: 8.0,
          categories: ['monetary_policy', 'economic_data']
        },
        message_template: {
          title: 'High Impact: {title}',
          body: 'Sentiment: {sentiment} ({confidence}%) - Impact: {impact_score}/10',
          actions: [
            { label: 'View Details', action: 'open_article' },
            { label: 'Dismiss', action: 'dismiss' }
          ]
        },
        delivery_settings: {
          priority: 'high',
          sound: 'alert_high.wav',
          vibration: true
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          template_created: true,
          template_id: 'template_789',
          active: true,
          estimated_triggers_per_day: 3
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/alerts/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customTemplate)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.template_created).toBe(true);
      expect(data.template_id).toBeDefined();
      expect(data.estimated_triggers_per_day).toBeGreaterThan(0);
    });

    test('should schedule time-based alerts', async () => {
      const scheduledAlert = {
        name: 'Daily Market Open Alert',
        schedule: {
          type: 'daily',
          time: '09:30',
          timezone: 'America/New_York',
          weekdays_only: true
        },
        content: {
          title: 'Market Opening',
          body: 'US markets are now open. Check your watchlist.',
          data: { type: 'market_open' }
        },
        active: true
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          schedule_created: true,
          schedule_id: 'schedule_456',
          next_trigger: '2024-01-15T14:30:00Z',
          active: true
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/alerts/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduledAlert)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.schedule_created).toBe(true);
      expect(data.next_trigger).toBeDefined();
      expect(data.active).toBe(true);
    });

    test('should manage alert frequency limits', async () => {
      const frequencySettings = {
        max_alerts_per_hour: 5,
        max_alerts_per_day: 50,
        cooldown_period_minutes: 15,
        priority_override: true,
        duplicate_suppression: true
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          settings_updated: true,
          current_hour_count: 2,
          current_day_count: 18,
          next_available_slot: new Date(Date.now() + 900000).toISOString()
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/alerts/frequency`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(frequencySettings)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.settings_updated).toBe(true);
      expect(data.current_hour_count).toBeLessThanOrEqual(5);
      expect(data.current_day_count).toBeLessThanOrEqual(50);
    });
  });

  describe('Alert History and Analytics', () => {
    test('should retrieve alert history', async () => {
      const historyParams = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        alert_types: ['price_movement', 'sentiment'],
        limit: 50
      };

      const mockHistory = {
        alerts: [
          {
            id: 'alert_001',
            type: 'price_movement',
            symbol: 'EUR/USD',
            triggered_at: '2024-01-15T10:30:00Z',
            delivered: true,
            recipients: 150
          },
          {
            id: 'alert_002',
            type: 'sentiment',
            article_title: 'Fed Decision Impact',
            triggered_at: '2024-01-15T14:00:00Z',
            delivered: true,
            recipients: 200
          }
        ],
        total_count: 2,
        delivery_rate: 0.98,
        avg_delivery_time_ms: 220
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockHistory
      });

      const queryString = new URLSearchParams(historyParams).toString();
      const response = await fetch(`${TEST_CONFIG.baseURL}/api/alerts/history?${queryString}`, {
        method: 'GET'
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.alerts).toHaveLength(2);
      expect(data.delivery_rate).toBeGreaterThan(0.9);
      expect(data.avg_delivery_time_ms).toBeLessThan(1000);
    });

    test('should provide alert analytics', async () => {
      const analyticsData = {
        period: '30_days',
        total_alerts: 156,
        by_type: {
          price_movement: 89,
          sentiment: 45,
          volume_spike: 22
        },
        delivery_stats: {
          success_rate: 0.97,
          avg_delivery_time_ms: 185,
          failed_deliveries: 5
        },
        user_engagement: {
          open_rate: 0.68,
          action_rate: 0.34,
          dismiss_rate: 0.32
        },
        top_symbols: [
          { symbol: 'EUR/USD', alert_count: 23 },
          { symbol: 'GOLD', alert_count: 18 },
          { symbol: 'BTC/USD', alert_count: 15 }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => analyticsData
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/alerts/analytics`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer test_token' }
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.total_alerts).toBe(156);
      expect(data.delivery_stats.success_rate).toBeGreaterThan(0.9);
      expect(data.user_engagement.open_rate).toBeGreaterThan(0.5);
      expect(data.top_symbols).toHaveLength(3);
    });

    test('should track alert performance metrics', async () => {
      const performanceMetrics = {
        alert_id: 'alert_12345',
        delivery_time_ms: 150,
        opened: true,
        opened_at: '2024-01-15T10:31:30Z',
        action_taken: 'view_details',
        user_feedback: 'helpful',
        market_impact_accuracy: 0.85
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          metrics_recorded: true,
          alert_id: 'alert_12345',
          performance_score: 8.5,
          contributes_to_model: true
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/alerts/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(performanceMetrics)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.metrics_recorded).toBe(true);
      expect(data.performance_score).toBeGreaterThan(7);
      expect(data.contributes_to_model).toBe(true);
    });
  });

  describe('Integration with Real-time Market Data', () => {
    test('should correlate alerts with live market data streams', async () => {
      const marketDataStream = {
        symbols: ['EUR/USD', 'GBP/USD', 'GOLD'],
        data_points: [
          { symbol: 'EUR/USD', price: 1.0850, change: 0.0025, timestamp: new Date().toISOString() },
          { symbol: 'GBP/USD', price: 1.2650, change: -0.0015, timestamp: new Date().toISOString() },
          { symbol: 'GOLD', price: 2015.50, change: 12.25, timestamp: new Date().toISOString() }
        ],
        alert_triggers: [
          { symbol: 'GOLD', reason: 'price_threshold_exceeded', threshold: 2000 }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          stream_processed: true,
          alerts_generated: 1,
          data_points_processed: 3,
          next_check_in_ms: 5000
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/alerts/market-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(marketDataStream)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.stream_processed).toBe(true);
      expect(data.alerts_generated).toBe(1);
      expect(data.data_points_processed).toBe(3);
    });

    test('should integrate news sentiment with alert generation', async () => {
      const newsStreamData = {
        articles: [
          {
            id: 789,
            title: 'Central Bank Policy Shift Expected',
            sentiment: 'BEARISH',
            confidence: 0.91,
            impact_score: 8.7,
            affected_symbols: ['EUR/USD', 'GBP/USD'],
            timestamp: new Date().toISOString()
          }
        ],
        sentiment_summary: {
          bullish: 2,
          bearish: 5,
          neutral: 3
        },
        market_correlation: {
          forex_impact: 'high',
          commodity_impact: 'medium',
          crypto_impact: 'low'
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          news_processed: true,
          sentiment_alerts_generated: 2,
          affected_users: 340,
          market_impact_predicted: 'significant'
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/alerts/news-sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newsStreamData)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.news_processed).toBe(true);
      expect(data.sentiment_alerts_generated).toBe(2);
      expect(data.affected_users).toBeGreaterThan(0);
    });
  });
});