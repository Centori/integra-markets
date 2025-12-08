import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Color palette matching the mockup
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
  // Mockup specific colors
  yesGreen: '#4ECCA3',
  noRed: '#F05454',
  categoryBlue: '#30A5FF',
  volumeText: '#30A5FF',
};

const { width } = Dimensions.get('window');

const PredictionMarketCard = ({ 
  market, 
  onPress, 
  onTradePress,
  showTradeButton = true,
  compact = false 
}) => {
  if (!market) return null;

  const {
    title,
    ticker,
    yesPrice = 72,
    noPrice = 28,
    volume = 534300,
    status = 'open',
    category = 'Oil & Energy',
    resolveTime,
    traderCount = 5343,
    yesLowPrice = 100,
    yesHighPrice = 139,
    noLowPrice = 100,
    noHighPrice = 357
  } = market;

  // Format volume display
  const formatVolume = (vol) => {
    if (!vol) return '$0';
    if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `$${Math.round(vol / 1000)}K`;
    return `$${vol.toString()}`;
  };

  // Format trader count
  const formatTraderCount = (count) => {
    if (!count) return '0';
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Format time until resolution
  const formatTimeToResolve = (resolveTime) => {
    if (!resolveTime) return '17 days';
    const now = new Date();
    const resolve = new Date(resolveTime);
    const diffMs = resolve - now;
    
    if (diffMs <= 0) return 'Resolving Soon';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return `${diffHours}h`;
  };

  // Get category color
  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'oil & energy': return colors.categoryBlue;
      case 'commodities': return colors.accentNeutral;
      case 'economics': return colors.accentPositive;
      default: return colors.accentData;
    }
  };

  // Handle Yes button press
  const handleYesPress = () => {
    if (onTradePress) {
      onTradePress(market, 'yes');
    }
  };

  // Handle No button press
  const handleNoPress = () => {
    if (onTradePress) {
      onTradePress(market, 'no');
    }
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header with category and volume */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.category, { color: getCategoryColor(category) }]}>
            {category}
          </Text>
          <View style={styles.volumeContainer}>
            <MaterialIcons name="bar-chart" size={14} color={colors.volumeText} />
            <Text style={styles.volumeText}>{formatVolume(volume)}</Text>
          </View>
        </View>
      </View>

      {/* Market question */}
      <Text style={styles.title} numberOfLines={3}>
        {title || "Will WTI Crude oil close above $50 by end of month?"}
      </Text>

      {/* Resolution info */}
      <View style={styles.resolutionInfo}>
        <View style={styles.resolutionItem}>
          <Text style={styles.resolutionLabel}>RESOLVES</Text>
          <Text style={styles.resolutionValue}>in {formatTimeToResolve(resolveTime)}</Text>
        </View>
        <View style={styles.resolutionItem}>
          <Text style={styles.resolutionLabel}>TRADERS</Text>
          <Text style={styles.resolutionValue}>{formatTraderCount(traderCount)}</Text>
        </View>
      </View>

      {/* Trading buttons */}
      <View style={styles.tradingSection}>
        <TouchableOpacity 
          style={[styles.tradeButton, styles.yesButton]} 
          onPress={handleYesPress}
          activeOpacity={0.8}
        >
          <View style={styles.tradeButtonContent}>
            <View style={styles.tradeButtonHeader}>
              <Text style={styles.tradePercentage}>{yesPrice}%</Text>
              <MaterialIcons name="trending-up" size={16} color={colors.yesGreen} />
            </View>
            <Text style={styles.tradeLabel}>Yes</Text>
            <View style={styles.checkmarkContainer}>
              <MaterialIcons name="check-circle" size={20} color={colors.yesGreen} />
            </View>
            <Text style={styles.priceRange}>
              ${yesLowPrice} → ${yesHighPrice}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tradeButton, styles.noButton]} 
          onPress={handleNoPress}
          activeOpacity={0.8}
        >
          <View style={styles.tradeButtonContent}>
            <View style={styles.tradeButtonHeader}>
              <Text style={styles.tradePercentage}>{noPrice}%</Text>
              <MaterialIcons name="trending-down" size={16} color={colors.noRed} />
            </View>
            <Text style={styles.tradeLabel}>No</Text>
            <Text style={styles.priceRange}>
              ${noLowPrice} → ${noHighPrice}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Show More button */}
      <TouchableOpacity style={styles.showMoreButton} onPress={onPress}>
        <Text style={styles.showMoreText}>Show More</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 12,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeText: {
    fontSize: 12,
    color: colors.volumeText,
    fontWeight: '600',
    marginLeft: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 16,
  },
  resolutionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  resolutionItem: {
    flex: 1,
  },
  resolutionLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  resolutionValue: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  tradingSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tradeButton: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  yesButton: {
    backgroundColor: colors.yesGreen + '15',
    borderColor: colors.yesGreen,
  },
  noButton: {
    backgroundColor: colors.noRed + '15',
    borderColor: colors.noRed,
  },
  tradeButtonContent: {
    alignItems: 'center',
  },
  tradeButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tradePercentage: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 4,
  },
  tradeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  checkmarkContainer: {
    marginBottom: 4,
  },
  priceRange: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  showMoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  showMoreText: {
    fontSize: 14,
    color: colors.accentData,
    fontWeight: '600',
  },
});

export default PredictionMarketCard;