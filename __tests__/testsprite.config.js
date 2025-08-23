/**
 * TestSprite Configuration
 * AI-powered testing framework for Integra Markets
 */

const TestSpriteConfig = {
  // Test environment settings
  environment: {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8000',
    testTimeout: 30000,
    retryAttempts: 3,
    parallel: true,
  },

  // Frontend component testing configuration
  frontend: {
    components: [
      'ChatInterface',
      'NewsCard', 
      'AuthButtons',
      'TodayDashboard',
      'AIAnalysisOverlay',
      'OnboardingForm',
      'NotificationSettings',
      'WelcomeScreen'
    ],
    testTypes: [
      'render',
      'interaction',
      'accessibility',
      'performance',
      'state_management'
    ],
    mockData: {
      newsItem: {
        id: 1,
        title: 'Test News Article',
        content: 'Test content for news analysis',
        summary: 'Test summary',
        source: 'Test Source',
        sentiment: 'BULLISH',
        sentimentScore: 0.8,
        timeAgo: '1h ago'
      },
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'Trader'
      },
      chatMessage: {
        id: 'msg-123',
        role: 'user',
        content: 'What is the market outlook for oil?',
        timestamp: new Date()
      }
    }
  },

  // API endpoint testing configuration
  api: {
    endpoints: [
      {
        name: 'Health Check',
        path: '/health',
        method: 'GET',
        requiresAuth: false,
        expectedStatus: 200
      },
      {
        name: 'Root Endpoint',
        path: '/',
        method: 'GET',
        requiresAuth: false,
        expectedStatus: 200
      },
      {
        name: 'Sentiment Analysis',
        path: '/analyze-sentiment',
        method: 'POST',
        requiresAuth: false,
        payload: {
          text: 'The market is looking very bullish today with strong gains across commodities.',
          user_id: 'test-user-123'
        },
        expectedStatus: 200
      }
    ],
    testTypes: [
      'response_validation',
      'error_handling',
      'authentication',
      'rate_limiting',
      'data_integrity'
    ]
  },

  // Authentication flow testing (disabled - no auth endpoints in backend yet)
  auth: {
    flows: [
      // Note: Authentication endpoints not yet implemented in backend
      // Uncomment and configure when /login, /register endpoints are added
    ],
    testScenarios: [
      // 'valid_credentials',
      // 'invalid_credentials', 
      // 'expired_session',
      // 'concurrent_sessions',
      // 'password_reset',
      // 'account_lockout'
    ]
  },

  // AI-powered test generation settings
  ai: {
    enabled: true,
    testGeneration: {
      maxTestsPerComponent: 10,
      includeEdgeCases: true,
      generatePerformanceTests: true,
      generateAccessibilityTests: true
    },
    analysis: {
      detectAntiPatterns: true,
      suggestOptimizations: true,
      generateTestReports: true
    }
  },

  // Reporting and analytics
  reporting: {
    formats: ['json', 'html', 'junit'],
    outputDir: '__tests__/reports',
    includeScreenshots: true,
    includeCoverage: true,
    generateTrends: true
  }
};

export default TestSpriteConfig;