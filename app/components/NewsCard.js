import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BreakingNewsIndicator from './BreakingNewsIndicator';
import useAlertPreferences from '../hooks/useAlertPreferences';

// Sentiment icons and colors
const SENTIMENT_ICONS = {
  POSITIVE: 'trending-up',
  NEGATIVE: 'trending-down',
  NEUTRAL: 'trending-flat',
};

const SENTIMENT_COLORS = {
  POSITIVE: '#4ECCA3',
  NEGATIVE: '#FF3B30',
  NEUTRAL: '#EAB308',
};

const IMPACT_COLORS = {
  HIGH: '#FF3B30',
  MEDIUM: '#EAB308',
  LOW: '#4ECCA3',
};

const NewsCard = ({ 
  article, 
  onPress,
  style,
}) => {
  const { preferences } = useAlertPreferences();
  
  // Format exact UTC time as "YYYY-MM-DD HH:MMZ"
  const formatUTC = (isoString) => {
    try {
      if (!isoString) return '';
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      // toISOString => YYYY-MM-DDTHH:MM:SS.mmmZ
      const base = d.toISOString();
      // Keep YYYY-MM-DD HH:MMZ
      return base.slice(0,16).replace('T',' ') + 'Z';
    } catch (_e) {
      return '';
    }
  };
  const {
    title,
    summary,
    source,
    timeAgo,
    publishedAt,
    sentiment,
    marketImpact,
    isBreaking,
    ageCategory,
  } = article;
  } = article;

  // Dynamic card styles based on age and importance
  const getCardStyle = () => {
    const styles = [defaultStyles.card];
    
    if (isBreaking) {
      styles.push(defaultStyles.breakingCard);
    } else if (ageCategory === 'fresh') {
      styles.push(defaultStyles.freshCard);
    }
    
    if (style) {
      styles.push(style);
    }
    
    return styles;
  };

  return (
    <TouchableOpacity
      style={getCardStyle()}
      onPress={() => onPress(article)}
      activeOpacity={0.7}
    >
      {/* Breaking news indicator */}
      {isBreaking && (
        <View style={defaultStyles.breakingIndicatorContainer}>
          <BreakingNewsIndicator />
        </View>
      )}

      {/* Header section */}
      <View style={defaultStyles.header}>
        <View style={defaultStyles.sourceContainer}>
          <Text style={defaultStyles.source}>{source}</Text>
          <Text style={defaultStyles.timeAgo}>
            {preferences?.showExactTime ? formatUTC(publishedAt) : timeAgo}
          </Text>
        </View>
        
        <View style={defaultStyles.indicatorsContainer}>
          {/* Market impact indicator */}
          <View
            style={[
              defaultStyles.impactIndicator,
              { backgroundColor: IMPACT_COLORS[marketImpact] },
            ]}
          >
            <Text style={defaultStyles.impactText}>{marketImpact}</Text>
          </View>

          {/* Sentiment icon */}
          <MaterialIcons
            name={SENTIMENT_ICONS[sentiment]}
            size={20}
            color={SENTIMENT_COLORS[sentiment]}
            style={defaultStyles.sentimentIcon}
          />
        </View>
      </View>

      {/* Title and content */}
      <Text 
        style={[
          defaultStyles.title,
          isBreaking && defaultStyles.breakingTitle,
        ]}
        numberOfLines={3}
      >
        {title}
      </Text>
      
      <Text 
        style={defaultStyles.summary}
        numberOfLines={3}
      >
        {summary}
      </Text>
    </TouchableOpacity>
  );
};

const defaultStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  breakingCard: {
    borderColor: '#FF3B30',
    borderWidth: 1,
    backgroundColor: '#2A1D1D',
  },
  freshCard: {
    borderLeftColor: '#4ECCA3',
    borderLeftWidth: 4,
  },
  breakingIndicatorContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sourceContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  source: {
    color: '#A0A0A0',
    fontSize: 14,
    fontWeight: '600',
  },
  timeAgo: {
    color: '#666666',
    fontSize: 12,
    marginLeft: 8,
  },
  indicatorsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  impactIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  impactText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sentimentIcon: {
    marginLeft: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 24,
  },
  breakingTitle: {
    fontSize: 18,
    color: '#FF3B30',
  },
  summary: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default NewsCard;
