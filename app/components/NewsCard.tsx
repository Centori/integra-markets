import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../constants/colors';

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

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.date}>{item.timeAgo || item.date || 'Recently'}</Text>
        {item.sentiment && (
          <View style={[styles.sentimentBadge, { backgroundColor: getSentimentColor(item.sentiment) }]}>
            <Text style={styles.sentimentText}>{item.sentiment}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.content} numberOfLines={3}>
        {item.summary || item.content || 'No content available'}
      </Text>
      
      <View style={styles.footer}>
        {item.source && (
          <TouchableOpacity onPress={handleSourcePress} style={styles.sourceContainer}>
            <Text style={styles.sourceText}>{item.source}</Text>
            <MaterialIcons name="open-in-new" size={14} color={Colors.tint} />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.aiButton}
          onPress={() => onAIClick(item)}
        >
          <MaterialIcons name="psychology" size={20} color={Colors.tint} />
          <Text style={styles.aiButtonText}>AI Analysis</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getSentimentColor = (sentiment: string): string => {
  switch (sentiment?.toUpperCase()) {
    case 'BULLISH': return '#4ECCA3';
    case 'BEARISH': return '#F05454';
    case 'NEUTRAL': return '#FFD700';
    default: return '#A0A0A0';
  }
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  sentimentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sentimentText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.text,
    lineHeight: 24,
  },
  content: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 16,
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
    gap: 4,
  },
  sourceText: {
    color: Colors.tint,
    fontSize: 13,
    fontWeight: '500',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiButtonText: {
    marginLeft: 6,
    color: Colors.tint,
    fontWeight: '600',
    fontSize: 14,
  },
});