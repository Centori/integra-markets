import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import PredictionMarketList from '../components/PredictionMarketList';
import PredictionMarketCard from '../components/PredictionMarketCard';
import kalshiService from '../services/kalshiService';

// Color palette consistent with the app
const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  bgTertiary: '#252525',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3',
  accentNegative: '#F05454',
  accentNeutral: '#EAB308',
  accentData: '#30A5FF',
  divider: '#333333',
  cardBorder: '#2A2A2A',
};

const { width } = Dimensions.get('window');

const PredictionMarketsScreen = ({ navigation }) => {
  const [trendingMarkets, setTrendingMarkets] = useState([]);
  const [marketStats, setMarketStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('trending');

  // Tab options
  const tabs = [
    { key: 'trending', label: 'Trending', icon: 'trending-up' },
    { key: 'all', label: 'All Markets', icon: 'list' },
    { key: 'politics', label: 'Politics', icon: 'how-to-vote' },
    { key: 'economics', label: 'Economics', icon: 'attach-money' },
    { key: 'sports', label: 'Sports', icon: 'sports' },
  ];

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load formatted markets for UI mockup
      const markets = await kalshiService.getFormattedMarkets({ limit: 10 });
      setTrendingMarkets(markets || []);

      // Load market statistics (mock data for now)
      setMarketStats({
        totalVolume: 3660700,
        activeMarkets: 5,
        resolvingSoon: 3,
      });

    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load market data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle market press
  const handleMarketPress = useCallback((market) => {
    navigation.navigate('MarketDetail', { market });
  }, [navigation]);

  // Handle trade press with side parameter
  const handleTradePress = useCallback((market, side) => {
    if (market.status !== 'open') {
      Alert.alert('Market Closed', 'This market is no longer accepting trades.');
      return;
    }
    
    // For now, show an alert with trade details
    const price = side === 'yes' ? market.yesPrice : market.noPrice;
    Alert.alert(
      'Place Trade',
      `Trade ${side.toUpperCase()} at ${price}% for ${market.title}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => executeTrade(market, side, price)
        }
      ]
    );
  }, []);

  // Execute trade
  const executeTrade = async (market, side, price) => {
    try {
      // Mock trade execution - replace with actual Kalshi API call
      const result = await kalshiService.placeTrade(
        market.ticker,
        side,
        1, // Default to 1 share
        price * 100 // Convert percentage to cents
      );
      
      Alert.alert('Trade Placed', `Successfully placed ${side.toUpperCase()} trade`);
    } catch (error) {
      console.error('Error placing trade:', error);
      Alert.alert('Trade Failed', 'Failed to place trade. Please try again.');
    }
  };

  // Format large numbers
  const formatLargeNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Render header stats
  const renderHeaderStats = () => {
    if (!marketStats) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialIcons name="attach-money" size={24} color={colors.accentPositive} />
          <Text style={styles.statValue}>${formatLargeNumber(marketStats.totalVolume)}</Text>
          <Text style={styles.statLabel}>Monthly Volume</Text>
        </View>
        
        <View style={styles.statCard}>
          <MaterialIcons name="trending-up" size={24} color={colors.accentData} />
          <Text style={styles.statValue}>{marketStats.activeMarkets}</Text>
          <Text style={styles.statLabel}>Active Markets</Text>
        </View>
        
        <View style={styles.statCard}>
          <MaterialIcons name="schedule" size={24} color={colors.accentNeutral} />
          <Text style={styles.statValue}>{marketStats.resolvingSoon}</Text>
          <Text style={styles.statLabel}>Resolving Soon</Text>
        </View>
      </View>
    );
  };

  // Render trending section
  const renderTrendingSection = () => {
    if (trendingMarkets.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔥 Trending Markets</Text>
          <TouchableOpacity onPress={() => setSelectedTab('trending')}>
            <Text style={styles.sectionLink}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingScroll}
        >
          {trendingMarkets.map((market, index) => (
            <View key={market.id || index} style={styles.trendingCard}>
              <PredictionMarketCard
                key={market.id}
                market={market}
                onPress={() => handleMarketPress(market)}
                onTradePress={(side) => handleTradePress(market, side)}
                compact={true}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render tabs
  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, selectedTab === tab.key && styles.tabActive]}
            onPress={() => setSelectedTab(tab.key)}
          >
            <MaterialIcons 
              name={tab.icon} 
              size={18} 
              color={selectedTab === tab.key ? colors.textPrimary : colors.textSecondary} 
            />
            <Text style={[styles.tabText, selectedTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Render market list based on selected tab
  const renderMarketList = () => {
    let category = null;
    let sortBy = 'volume';

    switch (selectedTab) {
      case 'trending':
        sortBy = 'volume';
        break;
      case 'politics':
        category = 'politics';
        break;
      case 'economics':
        category = 'economics';
        break;
      case 'sports':
        category = 'sports';
        break;
      default:
        category = null;
    }

    return (
      <PredictionMarketList
        onMarketPress={handleMarketPress}
        onTradePress={handleTradePress}
        category={category}
        sortBy={sortBy}
        showSearch={selectedTab === 'all'}
        showFilters={selectedTab === 'all'}
        limit={selectedTab === 'trending' ? 10 : 20}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Prediction Markets</Text>
          <Text style={styles.headerSubtitle}>Trade on future events</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.navigate('Portfolio')}
        >
          <MaterialIcons name="account-balance-wallet" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {renderHeaderStats()}

      {/* Trending Section (only show on main view) */}
      {selectedTab === 'all' && renderTrendingSection()}

      {/* Tabs */}
      {renderTabs()}

      {/* Market List */}
      <View style={styles.listContainer}>
        {renderMarketList()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  headerButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.bgTertiary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.bgSecondary,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    backgroundColor: colors.bgTertiary,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    paddingVertical: 16,
    backgroundColor: colors.bgPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionLink: {
    fontSize: 14,
    color: colors.accentData,
    fontWeight: '500',
  },
  trendingScroll: {
    paddingHorizontal: 16,
  },
  trendingCard: {
    width: width * 0.8,
    marginRight: 12,
  },
  tabsContainer: {
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: colors.bgTertiary,
  },
  tabActive: {
    backgroundColor: colors.accentData,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: 6,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  listContainer: {
    flex: 1,
  },
});

export default PredictionMarketsScreen;