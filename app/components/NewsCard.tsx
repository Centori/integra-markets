import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Share, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SingleStar } from './CustomStarIcon';

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
    // First check if we have a valid URL
    if (item.sourceUrl && item.sourceUrl !== '#') {
      try {
        // Ensure the URL has a protocol
        let url = item.sourceUrl;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          // Try to open anyway as canOpenURL might return false for valid URLs on some platforms
          await Linking.openURL(url);
        }
      } catch (error) {
        console.error('Error opening URL:', error);
        // Provide a more informative message
        Alert.alert(
          'Unable to Open Link',
          `Could not open the source website. You can search for "${item.title}" on ${item.source || 'the web'} to find the article.`,
          [{ text: 'OK' }]
        );
      }
    } else {
      // No URL available, just show source info
      Alert.alert(
        'Source Information',
        `This article is from ${item.source || 'an unknown source'}. No direct link is available.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleShare = async () => {
    try {
      // Construct a comprehensive share message
      let shareMessage = `${item.title}\n\n${item.summary || item.content || ''}\n\nSource: ${item.source || 'Unknown'}`;
      
      // Add source URL if available
      if (item.sourceUrl && item.sourceUrl !== '#') {
        shareMessage += `\n\nRead more: ${item.sourceUrl}`;
      }
      
      const shareOptions = {
        message: shareMessage,
        title: item.title,
      };
      
      // On iOS, we can also provide a URL separately for better integration
      if (Platform.OS === 'ios' && item.sourceUrl && item.sourceUrl !== '#') {
        shareOptions.url = item.sourceUrl;
      }
      
      const result = await Share.share(shareOptions);
      
      // Log share activity for analytics (optional)
      if (result.action === Share.sharedAction) {
        console.log('Content shared successfully');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Share Error', 'Unable to share this article. Please try again.');
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
            <SingleStar size={35} color="#4a9eff" />
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
              <Text style={[styles.sourceText, item.sourceUrl && item.sourceUrl !== '#' ? styles.sourceTextLink : null]}>
                {item.source}
              </Text>
              {item.sourceUrl && item.sourceUrl !== '#' && (
                <Feather name="external-link" size={14} color="#4a9eff" style={styles.linkIcon} />
              )}
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
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowRadius: 4,
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
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  sentimentScore: {
    fontSize: 12,
    fontWeight: '600',
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
  iconWithStarsButton: {
    padding: 2,
    marginLeft: 8,
  },
  moreIcon: {
    fontSize: 20,
    color: '#888888',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 6,
    marginBottom: 8,
    lineHeight: 26,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9CA3AF',
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
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  sourceTextLink: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  linkIcon: {
    marginLeft: 4,
  },
  linkIconFeather: {
    marginLeft: 4,
  },
  timeAgo: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '400',
  },
  shareButton: {
    padding: 2,
  },
  shareIcon: {
    fontSize: 16,
    color: '#666666',
  },
});
