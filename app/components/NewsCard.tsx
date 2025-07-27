import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Share } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface NewsItem {
  id?: number;
  title: string;
  content?: string;
  summary?: string;
  date?: string;
  source?: string;
  sourceUrl?: string;
  sentiment?: string;
  sentimentScore?: string;
  timeAgo?: string;
}

interface NewsCardProps {
  item: NewsItem;
  onAIClick: (newsItem: NewsItem) => void;
}

export default function NewsCard({ item, onAIClick }: NewsCardProps) {
  const handleSourcePress = async () => {
    if (item.sourceUrl && item.sourceUrl !== '#') {
      try {
        const supported = await Linking.canOpenURL(item.sourceUrl);
        if (supported) {
          await Linking.openURL(item.sourceUrl);
        } else {
          Alert.alert('Error', 'Unable to open this link');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to open link');
        console.error('Error opening URL:', error);
      }
    } else {
      Alert.alert('Source', `Article from ${item.source || 'Unknown source'}`);
    }
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `${item.title}\n\n${item.summary || item.content || ''}\n\nSource: ${item.source || 'Unknown'}`,
        title: item.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderSentimentIcon = (sentiment: string) => {
    const color = getSentimentColor(sentiment);
    switch (sentiment?.toUpperCase()) {
      case 'BULLISH':
        return <Feather name="trending-up" size={14} color={color} />;
      case 'BEARISH':
        return <Feather name="trending-down" size={14} color={color} />;
      case 'NEUTRAL':
        return <Feather name="arrow-right" size={14} color={color} />;
      default:
        return <Feather name="minus" size={14} color={color} />;
    }
  };

  return (
    <View style={styles.card}>
      {/* Header with sentiment and action buttons */}
      <View style={styles.header}>
        {item.sentiment && (
          <View style={styles.sentimentBadge}>
            <View style={styles.sentimentIconContainer}>
              {renderSentimentIcon(item.sentiment)}
            </View>
            <Text style={[styles.sentimentLabel, { color: getSentimentColor(item.sentiment) }]}>
              {item.sentiment.toUpperCase()}
            </Text>
            <Text style={[styles.sentimentScore, { color: getSentimentColor(item.sentiment) }]}>
              {item.sentimentScore || '0.50'}
            </Text>
          </View>
        )}
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => onAIClick(item)} style={styles.starButton}>
            <Feather name="star" size={20} color="#4a9eff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton}>
            <Feather name="more-horizontal" size={20} color="#888888" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main title */}
      <Text style={styles.title}>{item.title}</Text>

      {/* Description */}
      <Text style={styles.description} numberOfLines={3}>
        {item.summary || item.content || 'More details would go here...'}
      </Text>

      {/* Footer with source and share */}
      <View style={styles.footer}>
        <View style={styles.sourceContainer}>
          {item.source && (
            <TouchableOpacity onPress={handleSourcePress} style={styles.sourceButton}>
              <Text style={styles.sourceText}>{item.source}</Text>
              <Feather name="external-link" size={14} color="#4a9eff" style={styles.linkIconFeather} />
            </TouchableOpacity>
          )}
          <Text style={styles.timeAgo}>{item.timeAgo || item.date || '4 hours ago'}</Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Feather name="share-2" size={16} color="#666666" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getSentimentColor = (sentiment: string): string => {
  switch (sentiment?.toUpperCase()) {
    case 'BULLISH': return '#4ade80';
    case 'BEARISH': return '#ff6b6b';
    case 'NEUTRAL': return '#fbbf24';
    default: return '#888888';
  }
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#404040',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentimentIconContainer: {
    marginRight: 6,
  },
  sentimentLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 6,
  },
  sentimentScore: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    padding: 2,
  },
  starIcon: {
    fontSize: 20,
    color: '#4a9eff',
  },
  menuButton: {
    padding: 2,
    marginLeft: 8,
  },
  moreIcon: {
    fontSize: 20,
    color: '#888888',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 6,
    marginBottom: 8,
    lineHeight: 26,
  },
  description: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 20,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  sourceText: {
    color: '#4a9eff',
    fontSize: 14,
    marginRight: 4,
  },
  linkIcon: {
    fontSize: 14,
    color: '#4a9eff',
  },
  timeAgo: {
    color: '#666666',
    fontSize: 14,
  },
  shareButton: {
    padding: 2,
  },
  shareIcon: {
    fontSize: 16,
    color: '#666666',
  },
});
