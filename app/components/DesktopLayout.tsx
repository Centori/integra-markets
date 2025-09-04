import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import StreamingPriceTicker from './StreamingPriceTicker';
import FeaturedAIAnalysis from './FeaturedAIAnalysis';
import EnhancedNewsGrid from './EnhancedNewsGrid';
import MarketSidebar from './MarketSidebar';
import SearchHeader from './SearchHeader';
import DesktopUserProfile from './DesktopUserProfile';

interface DesktopLayoutProps {
  newsData: any[];
  onSearch: (query: string) => void;
  userPreferences: any;
}

const DesktopLayout: React.FC<DesktopLayoutProps> = ({ 
  newsData, 
  onSearch, 
  userPreferences 
}) => {
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredAnalysis, setFeaturedAnalysis] = useState(null);

  useEffect(() => {
    const onChange = (result) => {
      setScreenData(result.window);
    };
    
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  const isDesktop = screenData.width >= 1024;
  
  if (!isDesktop) {
    // Fallback to mobile layout for smaller screens
    return null; // Your existing mobile layout should handle this
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
    
    // Generate AI analysis for search query
    generateFeaturedAnalysis(query);
  };

  const generateFeaturedAnalysis = async (query: string) => {
    // This would integrate with your AI service
    setFeaturedAnalysis({
      question: query,
      answer: `Based on current market conditions and recent news, ${query.toLowerCase()} is influenced by several key factors...`,
      sources: [
        { name: 'Reuters', credibility: 0.95 },
        { name: 'Bloomberg', credibility: 0.93 }
      ],
      relatedQuestions: [
        'How does this affect gas prices?',
        'What are the geopolitical implications?',
        'Impact on inflation?'
      ]
    });
  };

  return (
    <View style={styles.desktopContainer}>
      {/* Header with Search */}
      <SearchHeader 
        onSearch={handleSearch}
        searchQuery={searchQuery}
        onClearSearch={() => setSearchQuery('')}
      />
      
      {/* Streaming Price Ticker */}
      <StreamingPriceTicker 
        symbols={['CL=F', 'GC=F', 'SI=F', 'NG=F', 'HG=F']}
      />
      
      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {/* Left Content (70%) */}
        <View style={styles.leftContent}>
          {/* Featured AI Analysis */}
          {featuredAnalysis && (
            <FeaturedAIAnalysis 
              analysis={featuredAnalysis}
              onRelatedQuestionClick={handleSearch}
            />
          )}
          
          {/* Enhanced News Grid */}
          <EnhancedNewsGrid 
            newsData={newsData}
            searchQuery={searchQuery}
            onAIAnalysis={(article) => {
              // Handle AI analysis click
              console.log('AI Analysis for:', article.title);
            }}
          />
        </View>
        
        {/* Right Sidebar (30%) */}
        <View style={styles.rightSidebar}>
          <MarketSidebar 
            marketOverview={[
              { symbol: 'CL1', name: 'Crude Oil', price: 85.42, change: 2.14, changePercent: 2.57 },
              { symbol: 'GC1', name: 'Gold', price: 2018.50, change: -5.20, changePercent: -0.26 },
              { symbol: 'SI1', name: 'Silver', price: 24.85, change: 0.15, changePercent: 0.61 },
              { symbol: 'NG1', name: 'Natural Gas', price: 2.45, change: -0.12, changePercent: -4.67 },
              { symbol: 'HG1', name: 'Copper', price: 3.75, change: 0.08, changePercent: 2.18 }
            ]}
            watchlist={userPreferences?.watchlist || [
              { symbol: 'CL1', name: 'Crude Oil', price: 85.42, change: 2.14, changePercent: 2.57 },
              { symbol: 'GC1', name: 'Gold', price: 2018.50, change: -5.20, changePercent: -0.26 }
            ]}
            gainers={[
              { symbol: 'CL1', name: 'Crude Oil', price: 85.42, change: 2.14, changePercent: 2.57 },
              { symbol: 'HG1', name: 'Copper', price: 3.75, change: 0.08, changePercent: 2.18 },
              { symbol: 'SI1', name: 'Silver', price: 24.85, change: 0.15, changePercent: 0.61 }
            ]}
            losers={[
              { symbol: 'NG1', name: 'Natural Gas', price: 2.45, change: -0.12, changePercent: -4.67 },
              { symbol: 'GC1', name: 'Gold', price: 2018.50, change: -5.20, changePercent: -0.26 }
            ]}
            majorIndices={[
              { symbol: 'SPX', name: 'S&P 500', price: 4185.47, change: 15.23, changePercent: 0.37 },
              { symbol: 'NDX', name: 'Nasdaq 100', price: 13245.65, change: -28.45, changePercent: -0.21 },
              { symbol: 'DJI', name: 'Dow Jones', price: 33875.40, change: 125.67, changePercent: 0.37 }
            ]}
            onSymbolPress={(symbol) => console.log('Symbol pressed:', symbol)}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    backgroundColor: '#121212',
    minHeight: '100vh',
  },
  mainContent: {
    flexDirection: 'row',
    flex: 1,
    gap: 20,
    padding: 20,
  },
  leftContent: {
    flex: 0.7,
    gap: 20,
  },
  rightSidebar: {
    flex: 0.3,
    maxWidth: 400,
    minWidth: 320,
  },
});

export default DesktopLayout;
