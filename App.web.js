import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import WebAuthRouter from './app/components/WebAuthRouter';
import { api } from './app/services/apiClient';
import { fetchNewsAnalysis, fetchMarketSentiment, fetchTopMovers, getEnhancedNews } from './app/services/api';

// Import your existing mobile App component
import MobileApp from './App';


const App = () => {
  const [newsData, setNewsData] = useState([]);
  const [userPreferences, setUserPreferences] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [marketSentiment, setMarketSentiment] = useState(null);
  const [topMovers, setTopMovers] = useState([]);

  // Mock news data for fallback
  const mockNewsData = [
    {
      id: '1',
      title: 'Oil Prices Surge on OPEC+ Production Cuts',
      summary: 'WTI crude jumps 3% as Saudi Arabia extends voluntary production cuts, tightening global supply outlook for Q2.',
      source: 'Reuters',
      timestamp: '2 hours ago',
      sentiment: 'bullish',
      impact: 'high',
      category: 'Energy',
      readTime: 3,
      credibilityScore: 0.94
    },
    {
      id: '2',
      title: 'Gold Holds Steady Amid Fed Rate Speculation',
      summary: 'Precious metals maintain range-bound trading as markets await clarity on Federal Reserve interest rate policy.',
      source: 'MarketWatch',
      timestamp: '4 hours ago',
      sentiment: 'neutral',
      impact: 'medium',
      category: 'Precious Metals',
      readTime: 2,
      credibilityScore: 0.89
    },
    {
      id: '3',
      title: 'Natural Gas Plunges on Weather Outlook',
      summary: 'NYMEX natural gas futures fall 4% as forecasts show milder temperatures reducing heating demand.',
      source: 'Bloomberg',
      timestamp: '6 hours ago',
      sentiment: 'bearish',
      impact: 'high',
      category: 'Energy',
      readTime: 2,
      credibilityScore: 0.96
    }
  ];

  // Transform API news data to match the expected format
  const transformNewsData = (apiData) => {
    if (!Array.isArray(apiData)) return [];
    
    return apiData.map((item, index) => ({
      id: item.id || String(index + 1),
      title: item.title || item.headline || 'Untitled News',
      summary: item.summary || item.description || item.content || '',
      source: item.source || item.publisher || 'Unknown',
      timestamp: item.timestamp || item.published_at || item.created_at || new Date().toISOString(),
      sentiment: item.sentiment || item.sentiment_label || 'neutral',
      impact: item.impact || item.market_impact || 'medium',
      category: item.category || item.commodity || 'General',
      readTime: item.readTime || Math.ceil((item.summary?.length || 100) / 200),
      credibilityScore: item.credibilityScore || item.confidence || 0.85,
      // Include any additional fields from the API
      ...item
    }));
  };

  // Fetch live news data from API
  const fetchLiveNewsData = async () => {
    setIsLoadingNews(true);
    try {
      // Try multiple endpoints to get news data
      const [newsAnalysis, enhancedNews, sentiment, movers] = await Promise.allSettled([
        fetchNewsAnalysis(),
        getEnhancedNews(),
        fetchMarketSentiment(),
        fetchTopMovers()
      ]);

      // Combine news from different sources
      let combinedNews = [];
      
      if (newsAnalysis.status === 'fulfilled' && newsAnalysis.value) {
        combinedNews = [...combinedNews, ...transformNewsData(newsAnalysis.value)];
      }
      
      if (enhancedNews.status === 'fulfilled' && enhancedNews.value) {
        combinedNews = [...combinedNews, ...transformNewsData(enhancedNews.value)];
      }

      // Update market sentiment and movers
      if (sentiment.status === 'fulfilled' && sentiment.value) {
        setMarketSentiment(sentiment.value);
      }
      
      if (movers.status === 'fulfilled' && movers.value) {
        setTopMovers(movers.value);
      }

      // Remove duplicates based on title
      const uniqueNews = combinedNews.filter((item, index, self) =>
        index === self.findIndex((t) => t.title === item.title)
      );

      // Sort by timestamp (newest first)
      uniqueNews.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB - dateA;
      });

      // Use live data if available, otherwise fall back to mock data
      setNewsData(uniqueNews.length > 0 ? uniqueNews : mockNewsData);
    } catch (error) {
      console.error('Error fetching live news:', error);
      // Fall back to mock data on error
      setNewsData(mockNewsData);
    } finally {
      setIsLoadingNews(false);
    }
  };

  useEffect(() => {
    // Fetch live data on mount
    fetchLiveNewsData();
    
    // Set up periodic refresh (every 30 seconds)
    const interval = setInterval(fetchLiveNewsData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleUserUpdate = (user) => {
    setCurrentUser(user);
    // Set auth token if available
    if (user?.access_token) {
      api.setAuthToken(user.access_token);
    }
    console.log('User updated:', user);
  };

  const handleSearch = async (query) => {
    // Filter news data based on search query
    if (!query.trim()) {
      // Reset to original data
      await fetchLiveNewsData();
      return;
    }

    const filteredNews = newsData.filter(article =>
      article.title.toLowerCase().includes(query.toLowerCase()) ||
      article.summary.toLowerCase().includes(query.toLowerCase()) ||
      article.category.toLowerCase().includes(query.toLowerCase())
    );
    
    setNewsData(filteredNews);
  };

  // Refresh data function that can be passed to child components
  const refreshData = () => {
    fetchLiveNewsData();
  };

  // On web, use WebAuthRouter for desktop experience
  if (Platform.OS === 'web') {
    return (
      <WebAuthRouter
        newsData={newsData}
        userPreferences={userPreferences}
        onUserUpdate={handleUserUpdate}
        isLoadingNews={isLoadingNews}
        marketSentiment={marketSentiment}
        topMovers={topMovers}
        onSearch={handleSearch}
        onRefresh={refreshData}
      />
    );
  }

  // On mobile, use existing mobile app
  return <MobileApp />;
};

export default App;
