import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import PredictionMarketCard from './PredictionMarketCard';
import CreateMarketModal from './CreateMarketModal';
import TradeModal from './TradeModal';
import {
  fetchPredictionMarkets,
  fetchMarketStats,
  MarketCategories,
  formatVolume,
} from '../services/polymarketApi';

// Color palette matching Integra Markets design
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
  // State
  const [markets, setMarkets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [tradeSide, setTradeSide] = useState('yes');

  // Categories for filtering - expanded with macroeconomic and geopolitical categories
  const categories = [
    { key: 'All', label: 'All', count: markets.length },
    { key: 'Oil & Energy', label: 'Oil & Energy', count: 0 },
    { key: 'Metals', label: 'Metals', count: 0 },
    { key: 'Agriculture', label: 'Agriculture', count: 0 },
    { key: 'Central Banks', label: 'Central Banks', count: 0 },
    { key: 'Interest Rates', label: 'Interest Rates', count: 0 },
    { key: 'Inflation', label: 'Inflation', count: 0 },
    { key: 'Foreign Exchange', label: 'FX', count: 0 },
    { key: 'OPEC', label: 'OPEC', count: 0 },
    { key: 'Geopolitics', label: 'Geopolitics', count: 0 },
    { key: 'Economics', label: 'Economics', count: 0 },
  ];

  // Calculate category counts
  const getCategoryCounts = useCallback(() => {
    const counts = {};
    markets.forEach(market => {
      const cat = market.category || 'Commodities';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [markets]);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [marketsData, statsData] = await Promise.all([
        fetchPredictionMarkets({
          category: selectedCategory === 'All' ? null : selectedCategory,
          limit: 50,
        }),
        fetchMarketStats(),
      ]);

      setMarkets(marketsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading prediction markets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Handle category change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setLoading(true);
  };

  // Handle market press
  const handleMarketPress = (market) => {
    setSelectedMarket(market);
    // Navigate to market details or show modal
  };

  // Handle trade button press
  const handleTradePress = (market, side) => {
    setSelectedMarket(market);
    setTradeSide(side);
    setShowTradeModal(true);
  };

  // Handle create market
  const handleCreateMarket = () => {
    setShowCreateModal(true);
  };

  // Filter markets by category
  const filteredMarkets = selectedCategory === 'All'
    ? markets
    : markets.filter(m => m.category === selectedCategory);

  // Get category counts
  const categoryCounts = getCategoryCounts();

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentData} />
          <Text style={styles.loadingText}>Loading markets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="bar-chart" size={24} color={colors.accentData} />
          <Text style={styles.headerTitle}>Prediction Markets</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <MaterialIcons name="filter-list" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentData}
            colors={[colors.accentData]}
          />
        }
      >
        {/* Stats Card */}
        {stats && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <MaterialIcons name="attach-money" size={18} color={colors.accentNeutral} />
              <Text style={styles.statValue}>
                {formatVolume(stats.monthly_volume)}
              </Text>
              <Text style={styles.statLabel}>Monthly Volume</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="trending-up" size={18} color={colors.accentPositive} />
              <Text style={styles.statValue}>{stats.active_markets}</Text>
              <Text style={styles.statLabel}>Active Markets</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="schedule" size={18} color={colors.accentNeutral} />
              <Text style={styles.statValue}>{stats.resolving_soon}</Text>
              <Text style={styles.statLabel}>Resolving Soon</Text>
            </View>
          </View>
        )}

        {/* Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((cat) => {
            const count = cat.key === 'All' 
              ? markets.length 
              : (categoryCounts[cat.key] || 0);
            
            const isSelected = selectedCategory === cat.key;
            
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
                onPress={() => handleCategoryChange(cat.key)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Markets List */}
        <View style={styles.marketsContainer}>
          {filteredMarkets.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="bar-chart" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>No markets found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try a different category or create a new market
              </Text>
            </View>
          ) : (
            filteredMarkets.map((market) => (
              <PredictionMarketCard
                key={market.id}
                market={market}
                onPress={() => handleMarketPress(market)}
                onTradePress={handleTradePress}
              />
            ))
          )}
        </View>

        {/* Powered by Polymarket */}
        <View style={styles.poweredByContainer}>
          <Text style={styles.poweredByText}>Powered by</Text>
          <Text style={styles.poweredByBrand}>Polymarket</Text>
        </View>

        {/* Bottom padding for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Create Market FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateMarket}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color={colors.bgPrimary} />
      </TouchableOpacity>

      {/* Create Market Modal */}
      {showCreateModal && (
        <CreateMarketModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onMarketCreated={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      {/* Trade Modal */}
      {showTradeModal && selectedMarket && (
        <TradeModal
          visible={showTradeModal}
          market={selectedMarket}
          initialSide={tradeSide}
          onClose={() => {
            setShowTradeModal(false);
            setSelectedMarket(null);
          }}
          onTradeComplete={() => {
            setShowTradeModal(false);
            setSelectedMarket(null);
            loadData();
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 10,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.bgSecondary,
  },
  scrollView: {
    flex: 1,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.divider,
    marginVertical: 4,
  },
  categoriesContainer: {
    marginTop: 16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  categoryChipSelected: {
    backgroundColor: colors.accentPositive + '20',
    borderColor: colors.accentPositive,
  },
  categoryChipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: colors.accentPositive,
  },
  marketsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentPositive,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.accentPositive,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  poweredByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  poweredByText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  poweredByBrand: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentData,
  },
});

export default PredictionMarketsScreen;