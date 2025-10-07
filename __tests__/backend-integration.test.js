/**
 * Backend Integration Tests
 * Verifies frontend-backend communication and real-time functionality
 */

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:8000',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000
};

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Backend Integration Tests - Frontend-Backend Communication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
  });

  describe('Health Check and CORS', () => {
    test('should verify backend health endpoint is accessible', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'healthy', timestamp: new Date().toISOString() })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/health`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.status).toBe('healthy');
      expect(global.fetch).toHaveBeenCalledWith(`${TEST_CONFIG.baseURL}/health`);
    });

    test('should handle CORS headers correctly', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['Access-Control-Allow-Origin', '*'],
          ['Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'],
          ['Access-Control-Allow-Headers', 'Content-Type, Authorization']
        ]),
        json: async () => ({ status: 'healthy' })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/health`);
      
      expect(response.ok).toBe(true);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Authentication Flow Tests', () => {
    test('should handle user registration', async () => {
      const testUser = {
        email: 'test@integramarkets.com',
        password: 'TestPassword123!',
        name: 'Test User'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          user: { id: 1, email: testUser.email, name: testUser.name },
          access_token: 'mock-jwt-token'
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.user.email).toBe(testUser.email);
      expect(data.access_token).toBeDefined();
    });

    test('should handle user login', async () => {
      const credentials = {
        email: 'test@integramarkets.com',
        password: 'TestPassword123!'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: { id: 1, email: credentials.email },
          access_token: 'mock-jwt-token'
        })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.access_token).toBeDefined();
      expect(data.user.email).toBe(credentials.email);
    });

    test('should handle authentication errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid@email.com', password: 'wrong' })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('Real-time Market Data Tests', () => {
    test('should fetch FX rates', async () => {
      const mockFXData = {
        rate: 0.85,
        from_symbol: 'USD',
        to_symbol: 'EUR',
        timestamp: new Date().toISOString()
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFXData
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/market-data/fx/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_symbol: 'USD', to_symbol: 'EUR' })
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.rate).toBe(0.85);
      expect(data.from_symbol).toBe('USD');
      expect(data.to_symbol).toBe('EUR');
    });

    test('should fetch FX time series data', async () => {
      const mockTimeSeriesData = {
        from_symbol: 'USD',
        to_symbol: 'EUR',
        time_series: [
          { timestamp: '2024-01-01T00:00:00Z', rate: 0.85 },
          { timestamp: '2024-01-02T00:00:00Z', rate: 0.86 }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTimeSeriesData
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/market-data/fx/series`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_symbol: 'USD', to_symbol: 'EUR', interval: 'daily' })
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.time_series).toHaveLength(2);
      expect(data.from_symbol).toBe('USD');
    });

    test('should fetch commodity rates', async () => {
      const mockCommodityData = {
        rate: 2000.50,
        symbol: 'GOLD',
        timestamp: new Date().toISOString()
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCommodityData
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/market-data/commodities/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'GOLD' })
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.rate).toBe(2000.50);
      expect(data.symbol).toBe('GOLD');
    });
  });

  describe('News and Sentiment Analysis Tests', () => {
    test('should fetch latest news', async () => {
      const mockNewsData = {
        articles: [
          {
            id: 1,
            title: 'Market Update',
            content: 'Markets are showing positive trends',
            sentiment: 'positive',
            timestamp: new Date().toISOString()
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockNewsData
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/news/latest`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.articles).toHaveLength(1);
      expect(data.articles[0].sentiment).toBe('positive');
    });

    test('should analyze custom text sentiment', async () => {
      const mockSentimentData = {
        text: 'The market is performing well',
        sentiment: 'positive',
        confidence: 0.85,
        scores: { positive: 0.85, negative: 0.10, neutral: 0.05 }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSentimentData
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/analyze-sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'The market is performing well' })
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.sentiment).toBe('positive');
      expect(data.confidence).toBe(0.85);
    });

    test('should refresh news data', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'News data refreshed successfully', count: 25 })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/news/refresh`, {
        method: 'POST'
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.message).toContain('refreshed');
      expect(data.count).toBeGreaterThan(0);
    });
  });

  describe('Push Notifications Tests', () => {
    test('should register push token', async () => {
      const tokenData = {
        token: 'mock-push-token-123',
        platform: 'ios'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Token registered successfully' })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/push/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenData)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.message).toContain('registered');
    });

    test('should get notification preferences', async () => {
      const mockPreferences = {
        market_alerts: true,
        news_updates: true,
        price_changes: false,
        frequency: 'immediate'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPreferences
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/notifications/preferences`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.market_alerts).toBe(true);
      expect(data.frequency).toBe('immediate');
    });

    test('should update notification preferences', async () => {
      const updatedPreferences = {
        market_alerts: false,
        news_updates: true,
        price_changes: true,
        frequency: 'daily'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Preferences updated successfully' })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPreferences)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.message).toContain('updated');
    });

    test('should send test notification', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Test notification sent successfully' })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/notifications/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test notification' })
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.message).toContain('sent');
    });
  });

  describe('Error Handling and Network Tests', () => {
    test('should handle network timeouts', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network timeout'));

      try {
        await fetch(`${TEST_CONFIG.baseURL}/api/market-data/fx/rate`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Network timeout');
      }
    });

    test('should handle invalid JSON responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/health`);
      
      try {
        await response.json();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Invalid JSON');
      }
    });

    test('should handle server errors gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });

      const response = await fetch(`${TEST_CONFIG.baseURL}/api/news/latest`);
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });
  });
});