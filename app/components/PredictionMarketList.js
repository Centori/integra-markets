import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import PredictionMarketCard from './PredictionMarketCard';
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

const PredictionMarketList = ({ 
  onMarketPress, 
  onTradePress,
  category = null,
  searchQuery = '',
  sortBy = 'volume',
  showSearch = true,
  showFilters = true,
  limit = 20,
  compact = false
}) => {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [selectedSort, setSelectedSort] = useState(sortBy);
  const [categories, setCategories] = useState([]);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Sort options
  const sortOptions = [
    { key: 'volume', label: 'Volume', icon: 'trending-up' },
    { key: 'probability', label: 'Probability', icon: 'percent' },
    { key: 'close_time', label: 'Closing Soon', icon: 'schedule' },
    { key: 'created_time', label: 'Newest', icon: 'fiber-new' },
  ];

  // Load markets data
  const loadMarkets = useCallback(async () => {
    try {
      setError(null);
      
      // Load categories if not loaded
      if (categories.length === 0) {
        const categoriesData = await kalshiService.getMarketCategories();
        setCategories(categoriesData || []);
      }

      // Build search parameters
      const params = {
        limit,
        sort_by: selectedSort,
      };

      if (selectedCategory) {
        params.category = selectedCategory;
      }

      if (searchText.trim()) {
        params.search = searchText.trim();
      }

      // Get markets data
      let marketsData;
      if (searchText.trim()) {
        marketsData = await kalshiService.searchMarkets(searchText.trim(), params);
      } else {
        marketsData = await kalshiService.getMarkets(params);
      }

      // Format and sort markets
      const formattedMarkets = kalshiService.formatMarketsData(marketsData || []);
      const sortedMarkets = kalshiService.sortMarkets(formattedMarkets, selectedSort);

      setMarkets(sortedMarkets);
    } catch (err) {
      console.error('Error loading markets:', err);
      setError(err.message || 'Failed to load prediction markets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchText, selectedSort, limit, categories.length]);

  // Initial load
  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadMarkets();
  }, [loadMarkets]);

  // Handle search
  const handleSearch = useCallback((text) => {
    setSearchText(text);
  }, []);

  // Handle search submit
  const handleSearchSubmit = useCallback(() => {
    setLoading(true);
    loadMarkets();
  }, [loadMarkets]);

  // Handle category filter
  const handleCategoryFilter = useCallback((categoryKey) => {
    setSelectedCategory(categoryKey === selectedCategory ? null : categoryKey);
    setLoading(true);
  }, [selectedCategory]);

  // Handle sort change
  const handleSortChange = useCallback((sortKey) => {
    setSelectedSort(sortKey);
    setLoading(true);
  }, []);

  // Handle market press
  const handleMarketPress = useCallback((market) => {
    onMarketPress && onMarketPress(market);
  }, [onMarketPress]);

  // Handle trade press
  const handleTradePress = useCallback((market) => {
    if (market.status !== 'open') {
      Alert.alert('Market Closed', 'This market is no longer accepting trades.');
      return;
    }
    onTradePress && onTradePress(market);
  }, [onTradePress]);

  // Render market item
  const renderMarketItem = useCallback(({ item }) => (
    <PredictionMarketCard
      market={item}
      onPress={() => handleMarketPress(item)}
      onTradePress={() => handleTradePress(item)}
      compact={compact}
    />
  ), [handleMarketPress, handleTradePress, compact]);

  // Render search bar
  const renderSearchBar = () => {
    if (!showSearch) return null;

    return (
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search prediction markets..."
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={handleSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <MaterialIcons name="clear" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        {showFilters && (
          <TouchableOpacity 
            style={[styles.filterButton, showFiltersPanel && styles.filterButtonActive]}
            onPress={() => setShowFiltersPanel(!showFiltersPanel)}
          >
            <MaterialIcons name="tune" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render filters panel
  const renderFiltersPanel = () => {
    if (!showFilters || !showFiltersPanel) return null;

    return (
      <View style={styles.filtersPanel}>
        {/* Categories */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Categories</Text>
          <View style={styles.filterChips}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
              onPress={() => handleCategoryFilter(null)}
            >
              <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {categories.slice(0, 6).map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.filterChip, selectedCategory === cat.key && styles.filterChipActive]}
                onPress={() => handleCategoryFilter(cat.key)}
              >
                <Text style={[styles.filterChipText, selectedCategory === cat.key && styles.filterChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sort Options */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Sort By</Text>
          <View style={styles.filterChips}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.filterChip, selectedSort === option.key && styles.filterChipActive]}
                onPress={() => handleSortChange(option.key)}
              >
                <MaterialIcons 
                  name={option.icon} 
                  size={14} 
                  color={selectedSort === option.key ? colors.textPrimary : colors.textSecondary} 
                />
                <Text style={[styles.filterChipText, selectedSort === option.key && styles.filterChipTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="trending-up" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>No Markets Found</Text>
      <Text style={styles.emptyStateText}>
        {searchText ? 'Try adjusting your search terms or filters' : 'No prediction markets available at the moment'}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorState}>
      <MaterialIcons name="error-outline" size={64} color={colors.accentNegative} />
      <Text style={styles.errorStateTitle}>Error Loading Markets</Text>
      <Text style={styles.errorStateText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Render loading state
  if (loading && markets.length === 0) {
    return (
      <View style={styles.container}>
        {renderSearchBar()}
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.accentData} />
          <Text style={styles.loadingText}>Loading prediction markets...</Text>
        </View>
      </View>
    );
  }

  // Render error state
  if (error && markets.length === 0) {
    return (
      <View style={styles.container}>
        {renderSearchBar()}
        {renderErrorState()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderSearchBar()}
      {renderFiltersPanel()}
      
      <FlatList
        data={markets}
        renderItem={renderMarketItem}
        keyExtractor={(item) => item.id || item.ticker}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accentData}
            colors={[colors.accentData]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          markets.length === 0 && styles.listContentEmpty
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgTertiary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 8,
  },
  filterButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.bgTertiary,
  },
  filterButtonActive: {
    backgroundColor: colors.accentData,
  },
  filtersPanel: {
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.accentData,
    borderColor: colors.accentData,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  filterChipTextActive: {
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.accentData,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default PredictionMarketList;