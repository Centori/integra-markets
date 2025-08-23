/**
 * MockDataGenerator - Mock Data Generation Utility
 * Generates realistic mock data for testing purposes
 */

export class MockDataGenerator {
  constructor() {
    this.userCounter = 1;
    this.articleCounter = 1;
  }

  /**
   * Generate mock user data
   */
  generateUser(overrides = {}) {
    const baseUser = {
      id: `user_${this.userCounter++}`,
      email: `testuser${this.userCounter}@example.com`,
      name: `Test User ${this.userCounter}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.userCounter}`,
      createdAt: new Date().toISOString(),
      preferences: {
        notifications: true,
        theme: 'light',
        language: 'en'
      },
      subscription: {
        plan: 'free',
        expiresAt: null
      }
    };

    return { ...baseUser, ...overrides };
  }

  /**
   * Generate mock news article data
   */
  generateNewsArticle(overrides = {}) {
    const commodities = ['Gold', 'Silver', 'Oil', 'Copper', 'Wheat', 'Corn', 'Natural Gas'];
    const sentiments = ['positive', 'negative', 'neutral'];
    
    const baseArticle = {
      id: `article_${this.articleCounter++}`,
      title: `Market Analysis: ${commodities[Math.floor(Math.random() * commodities.length)]} Trends`,
      content: `This is a mock news article about commodity market trends. The analysis shows various market indicators and predictions for the upcoming trading period.`,
      summary: `Brief summary of the ${commodities[Math.floor(Math.random() * commodities.length)]} market situation.`,
      source: 'Mock News Source',
      publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
      commodities: [commodities[Math.floor(Math.random() * commodities.length)]],
      confidence: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
      imageUrl: `https://picsum.photos/400/200?random=${this.articleCounter}`,
      tags: ['market', 'analysis', 'trading'],
      isBookmarked: false
    };

    return { ...baseArticle, ...overrides };
  }

  /**
   * Generate mock chat message data
   */
  generateChatMessage(overrides = {}) {
    const messageTypes = ['user', 'assistant'];
    const contexts = ['general', 'market_analysis', 'news_summary', 'price_prediction'];
    
    const baseMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: 'This is a mock chat message for testing purposes.',
      type: messageTypes[Math.floor(Math.random() * messageTypes.length)],
      context: contexts[Math.floor(Math.random() * contexts.length)],
      timestamp: new Date().toISOString(),
      metadata: {
        tokens: Math.floor(Math.random() * 100) + 10,
        processingTime: Math.random() * 2000 + 500
      }
    };

    return { ...baseMessage, ...overrides };
  }

  /**
   * Generate mock market data
   */
  generateMarketData(overrides = {}) {
    const commodities = [
      { name: 'Gold', symbol: 'XAU', unit: 'oz' },
      { name: 'Silver', symbol: 'XAG', unit: 'oz' },
      { name: 'Oil', symbol: 'CL', unit: 'barrel' },
      { name: 'Copper', symbol: 'HG', unit: 'lb' },
      { name: 'Wheat', symbol: 'ZW', unit: 'bushel' }
    ];

    const commodity = commodities[Math.floor(Math.random() * commodities.length)];
    const basePrice = Math.random() * 1000 + 50;
    const change = (Math.random() - 0.5) * 20;
    
    const baseData = {
      symbol: commodity.symbol,
      name: commodity.name,
      price: parseFloat(basePrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(((change / basePrice) * 100).toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 10000,
      high: parseFloat((basePrice + Math.random() * 10).toFixed(2)),
      low: parseFloat((basePrice - Math.random() * 10).toFixed(2)),
      open: parseFloat((basePrice + (Math.random() - 0.5) * 5).toFixed(2)),
      timestamp: new Date().toISOString(),
      unit: commodity.unit
    };

    return { ...baseData, ...overrides };
  }

  /**
   * Generate mock API response
   */
  generateAPIResponse(type = 'success', overrides = {}) {
    const baseResponses = {
      success: {
        status: 'success',
        data: {},
        message: 'Operation completed successfully',
        timestamp: new Date().toISOString()
      },
      error: {
        status: 'error',
        error: {
          code: 'MOCK_ERROR',
          message: 'This is a mock error for testing purposes'
        },
        timestamp: new Date().toISOString()
      },
      loading: {
        status: 'loading',
        message: 'Processing request...',
        timestamp: new Date().toISOString()
      }
    };

    return { ...baseResponses[type], ...overrides };
  }

  /**
   * Generate mock authentication token
   */
  generateAuthToken(overrides = {}) {
    const baseToken = {
      access_token: `mock_access_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      refresh_token: `mock_refresh_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'read write',
      issued_at: new Date().toISOString()
    };

    return { ...baseToken, ...overrides };
  }

  /**
   * Generate mock notification data
   */
  generateNotification(overrides = {}) {
    const types = ['info', 'warning', 'error', 'success'];
    const categories = ['market_alert', 'news_update', 'system_message', 'user_action'];
    
    const baseNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: 'Mock Notification',
      message: 'This is a mock notification for testing purposes.',
      type: types[Math.floor(Math.random() * types.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: null,
      metadata: {
        source: 'test_suite',
        priority: Math.floor(Math.random() * 3) + 1
      }
    };

    return { ...baseNotification, ...overrides };
  }

  /**
   * Generate mock error data
   */
  generateError(type = 'generic', overrides = {}) {
    const errorTypes = {
      network: {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        details: 'Unable to connect to the server'
      },
      auth: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        details: 'Invalid credentials or expired token'
      },
      validation: {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        details: 'One or more fields contain invalid data'
      },
      server: {
        code: 'SERVER_ERROR',
        message: 'Internal server error',
        details: 'An unexpected error occurred on the server'
      },
      generic: {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
        details: 'Please try again later'
      }
    };

    const baseError = {
      ...errorTypes[type],
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    return { ...baseError, ...overrides };
  }

  /**
   * Generate multiple items of a specific type
   */
  generateMultiple(type, count = 5, overrides = {}) {
    const generators = {
      users: () => this.generateUser(overrides),
      articles: () => this.generateNewsArticle(overrides),
      messages: () => this.generateChatMessage(overrides),
      marketData: () => this.generateMarketData(overrides),
      notifications: () => this.generateNotification(overrides)
    };

    const generator = generators[type];
    if (!generator) {
      throw new Error(`Unknown generator type: ${type}`);
    }

    return Array.from({ length: count }, () => generator());
  }

  /**
   * Reset counters
   */
  reset() {
    this.userCounter = 1;
    this.articleCounter = 1;
  }

  /**
   * Generate realistic test dataset
   */
  generateTestDataset() {
    return {
      users: this.generateMultiple('users', 3),
      articles: this.generateMultiple('articles', 10),
      messages: this.generateMultiple('messages', 8),
      marketData: this.generateMultiple('marketData', 5),
      notifications: this.generateMultiple('notifications', 6)
    };
  }
}

export default MockDataGenerator;