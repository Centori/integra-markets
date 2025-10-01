/**
 * Enhanced News Component Example
 * Shows how to use the enhanced content feature in the Expo app
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Switch,
  Alert
} from 'react-native';
import { fetchNewsAnalysis } from '../services/api';

export const EnhancedNewsExample = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enhancedMode, setEnhancedMode] = useState(false);
  const [stats, setStats] = useState(null);

  const loadNews = async () => {
    setLoading(true);
    try {
      // Call the API with enhanced content option
      const articles = await fetchNewsAnalysis({
        maxArticles: 5,
        enhancedContent: enhancedMode,
        maxEnhanced: 3, // Limit enhanced articles to save processing time
        commodity: null, // Can filter by commodity: 'oil', 'gold', etc.
        sources: null, // Can specify sources: ['reuters', 'bloomberg']
      });

      setNews(articles);
      
      // Calculate stats
      const enhancedCount = articles.filter(a => a.enhanced).length;
      const sentimentCounts = articles.reduce((acc, a) => {
        acc[a.sentiment] = (acc[a.sentiment] || 0) + 1;
        return acc;
      }, {});
      
      setStats({
        total: articles.length,
        enhanced: enhancedCount,
        sentiments: sentimentCounts
      });
      
    } catch (error) {
      Alert.alert('Error', 'Failed to load news: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [enhancedMode]);

  const renderNewsItem = ({ item }) => {
    const sentimentColor = {
      BULLISH: '#4CAF50',
      BEARISH: '#f44336',
      NEUTRAL: '#FF9800'
    }[item.sentiment] || '#757575';

    return (
      <View style={styles.newsItem}>
        {item.enhanced && (
          <View style={styles.enhancedBadge}>
            <Text style={styles.enhancedText}>✨ ENHANCED</Text>
          </View>
        )}
        
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        
        <Text style={styles.summary} numberOfLines={3}>
          {item.summary}
        </Text>
        
        <View style={styles.metadata}>
          <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor }]}>
            <Text style={styles.sentimentText}>
              {item.sentiment} ({(item.sentiment_score * 100).toFixed(0)}%)
            </Text>
          </View>
          
          <Text style={styles.source}>{item.source}</Text>
          
          {item.word_count && (
            <Text style={styles.wordCount}>
              📊 {item.word_count} words
            </Text>
          )}
        </View>
        
        {item.keywords && item.keywords.length > 0 && (
          <View style={styles.keywords}>
            {item.keywords.slice(0, 3).map((keyword, idx) => (
              <View key={idx} style={styles.keyword}>
                <Text style={styles.keywordText}>#{keyword}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Market News Feed</Text>
        
        <View style={styles.controls}>
          <Text style={styles.switchLabel}>Enhanced Content</Text>
          <Switch
            value={enhancedMode}
            onValueChange={setEnhancedMode}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={enhancedMode ? '#2196F3' : '#f4f3f4'}
          />
        </View>
      </View>

      {stats && (
        <View style={styles.statsBar}>
          <Text style={styles.statItem}>
            📰 {stats.total} articles
          </Text>
          {enhancedMode && (
            <Text style={styles.statItem}>
              ✨ {stats.enhanced} enhanced
            </Text>
          )}
          <Text style={styles.statItem}>
            🐂 {stats.sentiments.BULLISH || 0} bullish
          </Text>
          <Text style={styles.statItem}>
            🐻 {stats.sentiments.BEARISH || 0} bearish
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>
            {enhancedMode 
              ? 'Fetching and analyzing full articles with NLTK...' 
              : 'Loading news feed...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={news}
          renderItem={renderNewsItem}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadNews}
        />
      )}

      <TouchableOpacity style={styles.refreshButton} onPress={loadNews}>
        <Text style={styles.refreshButtonText}>🔄 Refresh News</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    color: 'white',
    fontSize: 12,
  },
  statsBar: {
    backgroundColor: 'white',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    fontSize: 12,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  newsItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  enhancedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  enhancedText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  summary: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sentimentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sentimentText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  source: {
    fontSize: 12,
    color: '#999',
  },
  wordCount: {
    fontSize: 11,
    color: '#999',
  },
  keywords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  keyword: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  keywordText: {
    fontSize: 11,
    color: '#2196F3',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default EnhancedNewsExample;
