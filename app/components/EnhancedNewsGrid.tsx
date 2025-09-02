import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  category: string;
  image?: string;
  price?: {
    symbol: string;
    current: number;
    change: number;
    changePercent: number;
  };
  readTime: number;
  credibilityScore: number;
}

interface EnhancedNewsGridProps {
  articles: NewsItem[];
  onArticlePress: (article: NewsItem) => void;
  layout: 'grid' | 'list';
}

const SentimentBadge: React.FC<{ sentiment: NewsItem['sentiment'] }> = ({ sentiment }) => {
  const getSentimentConfig = () => {
    switch (sentiment) {
      case 'bullish':
        return { color: '#4ade80', icon: 'trending-up', label: 'Bullish' };
      case 'bearish':
        return { color: '#ef4444', icon: 'trending-down', label: 'Bearish' };
      default:
        return { color: '#fbbf24', icon: 'trending-flat', label: 'Neutral' };
    }
  };

  const config = getSentimentConfig();

  return (
    <View style={[styles.sentimentBadge, { backgroundColor: `${config.color}20` }]}>
      <MaterialIcons name={config.icon as any} size={12} color={config.color} />
      <Text style={[styles.sentimentText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const ImpactBadge: React.FC<{ impact: NewsItem['impact'] }> = ({ impact }) => {
  const getImpactConfig = () => {
    switch (impact) {
      case 'high':
        return { color: '#ef4444', label: 'High Impact', icon: 'priority-high' };
      case 'medium':
        return { color: '#f59e0b', label: 'Med Impact', icon: 'remove' };
      default:
        return { color: '#6b7280', label: 'Low Impact', icon: 'minimize' };
    }
  };

  const config = getImpactConfig();

  return (
    <View style={[styles.impactBadge, { borderColor: config.color }]}>
      <MaterialIcons name={config.icon as any} size={10} color={config.color} />
      <Text style={[styles.impactText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const PriceWidget: React.FC<{ price: NewsItem['price'] }> = ({ price }) => {
  if (!price) return null;

  const isPositive = price.change >= 0;
  const changeColor = isPositive ? '#4ade80' : '#ef4444';

  return (
    <View style={styles.priceWidget}>
      <View style={styles.priceHeader}>
        <Text style={styles.priceSymbol}>{price.symbol}</Text>
        <Text style={styles.priceValue}>${price.current.toFixed(2)}</Text>
      </View>
      <View style={styles.priceChange}>
        <MaterialIcons 
          name={isPositive ? 'arrow-upward' : 'arrow-downward'} 
          size={12} 
          color={changeColor} 
        />
        <Text style={[styles.priceChangeText, { color: changeColor }]}>
          {isPositive ? '+' : ''}{price.change.toFixed(2)} ({isPositive ? '+' : ''}{price.changePercent.toFixed(1)}%)
        </Text>
      </View>
    </View>
  );
};

const CredibilityStars: React.FC<{ score: number }> = ({ score }) => {
  const getStarDisplay = () => {
    if (score >= 0.95) return '⭐⭐⭐';
    if (score >= 0.85) return '⭐⭐';
    return '⭐';
  };

  return (
    <Text style={styles.credibilityStars}>{getStarDisplay()}</Text>
  );
};

const NewsCard: React.FC<{ 
  article: NewsItem; 
  onPress: () => void; 
  isGridLayout: boolean;
}> = ({ article, onPress, isGridLayout }) => {
  const cardStyle = isGridLayout ? styles.gridCard : styles.listCard;

  return (
    <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.8}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <SentimentBadge sentiment={article.sentiment} />
          <ImpactBadge impact={article.impact} />
        </View>
        <View style={styles.headerRight}>
          <CredibilityStars score={article.credibilityScore} />
          <Text style={styles.readTime}>{article.readTime} min read</Text>
        </View>
      </View>

      {/* Image */}
      {article.image && isGridLayout && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: article.image }} style={styles.cardImage} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageOverlay}
          />
        </View>
      )}

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={isGridLayout ? 3 : 2}>
          {article.title}
        </Text>
        
        <Text style={styles.cardSummary} numberOfLines={isGridLayout ? 4 : 3}>
          {article.summary}
        </Text>

        {/* Price Widget */}
        {article.price && <PriceWidget price={article.price} />}
      </View>

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Text style={styles.sourceText}>{article.source}</Text>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{article.category}</Text>
          </View>
        </View>
        <View style={styles.footerRight}>
          <Text style={styles.timestampText}>{article.timestamp}</Text>
          <TouchableOpacity style={styles.bookmarkButton}>
            <MaterialIcons name="bookmark-border" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const EnhancedNewsGrid: React.FC<EnhancedNewsGridProps> = ({ 
  articles, 
  onArticlePress, 
  layout 
}) => {
  const isGridLayout = layout === 'grid';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={isGridLayout ? styles.gridLayout : styles.listLayout}>
        {articles.map((article) => (
          <NewsCard
            key={article.id}
            article={article}
            onPress={() => onArticlePress(article)}
            isGridLayout={isGridLayout}
          />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 16,
  },
  listLayout: {
    gap: 16,
    padding: 16,
  },

  // Card Layouts
  gridCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
    width: '48%', // Two columns for grid
    minHeight: 320,
  },
  listCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
    width: '100%',
    flexDirection: 'column',
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Badges
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  sentimentText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  impactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    gap: 2,
  },
  impactText: {
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  credibilityStars: {
    fontSize: 10,
  },
  readTime: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },

  // Image
  imageContainer: {
    position: 'relative',
    height: 120,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },

  // Content
  cardContent: {
    padding: 12,
    flex: 1,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 8,
  },
  cardSummary: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },

  // Price Widget
  priceWidget: {
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceSymbol: {
    color: '#4ECCA3',
    fontSize: 12,
    fontWeight: '600',
  },
  priceValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  priceChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceChangeText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceText: {
    color: '#4ECCA3',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTag: {
    backgroundColor: '#30A5FF20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    color: '#30A5FF',
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  timestampText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '400',
  },
  bookmarkButton: {
    padding: 2,
  },
});

export default EnhancedNewsGrid;
