import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useBookmarks } from '../providers/BookmarkProvider';

const BookmarksScreen = () => {
  const { bookmarks, removeBookmark, isLoading } = useBookmarks();
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const filterOptions = ['All', 'Bullish', 'Bearish', 'Neutral'];

  const filteredBookmarks = bookmarks.filter((bookmark) => {
    if (selectedFilter === 'All') return true;
    return bookmark.sentiment === selectedFilter.toUpperCase();
  });

  const handleDelete = (bookmark) => {
    Alert.alert(
      'Delete Bookmark',
      `Remove "${bookmark.title}" from bookmarks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeBookmark(bookmark.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete bookmark');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // In a real app, you might reload bookmarks from a backend
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'BULLISH':
        return '#4ECCA3';
      case 'BEARISH':
        return '#F05454';
      case 'NEUTRAL':
        return '#FFD700';
      default:
        return '#A0A0A0';
    }
  };

  const renderFilterButton = (filter) => {
    const isSelected = selectedFilter === filter;
    return (
      <TouchableOpacity
        key={filter}
        style={[
          styles.filterButton,
          isSelected && styles.filterButtonActive,
          isSelected && filter === 'Bullish' && { backgroundColor: '#4ECCA3' },
          isSelected && filter === 'Bearish' && { backgroundColor: '#F05454' },
          isSelected && filter === 'Neutral' && { backgroundColor: '#FFD700' },
        ]}
        onPress={() => setSelectedFilter(filter)}
      >
        <Text
          style={[
            styles.filterButtonText,
            isSelected && styles.filterButtonTextActive,
            isSelected && (filter === 'Bullish' || filter === 'Bearish') && { color: '#FFFFFF' },
            isSelected && filter === 'Neutral' && { color: '#121212' },
          ]}
        >
          {filter}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderBookmark = (bookmark) => (
    <View key={bookmark.id} style={styles.bookmarkCard}>
      <View style={styles.bookmarkHeader}>
        <View style={styles.sentimentBadge}>
          <MaterialCommunityIcons
            name={
              bookmark.sentiment === 'BULLISH'
                ? 'trending-up'
                : bookmark.sentiment === 'BEARISH'
                ? 'trending-down'
                : 'minus'
            }
            size={16}
            color={getSentimentColor(bookmark.sentiment)}
          />
          <Text
            style={[
              styles.sentimentText,
              { color: getSentimentColor(bookmark.sentiment) },
            ]}
          >
            {bookmark.sentiment}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(bookmark)}
        >
          <MaterialIcons name="close" size={20} color="#A0A0A0" />
        </TouchableOpacity>
      </View>

      <Text style={styles.bookmarkTitle} numberOfLines={2}>
        {bookmark.title}
      </Text>

      <Text style={styles.bookmarkSummary} numberOfLines={3}>
        {bookmark.summary}
      </Text>

      <View style={styles.bookmarkFooter}>
        <View style={styles.sourceInfo}>
          <Text style={styles.sourceText}>{bookmark.source}</Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>
              {(bookmark.sentimentScore * 100).toFixed(0)}%
            </Text>
          </View>
        </View>
        <Text style={styles.dateText}>
          {new Date(bookmark.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="bookmark-border" size={64} color="#333333" />
      <Text style={styles.emptyTitle}>No bookmarks yet</Text>
      <Text style={styles.emptySubtitle}>
        Save news articles and AI analysis to view them later
      </Text>
    </View>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECCA3" />
          <Text style={styles.loadingText}>Loading bookmarks...</Text>
        </View>
      );
    }

    if (filteredBookmarks.length === 0) {
      return renderEmptyState();
    }

    return (
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4ECCA3"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{bookmarks.length}</Text>
            <Text style={styles.statLabel}>Total Saved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {bookmarks.filter((b) => b.sentiment === 'BULLISH').length}
            </Text>
            <Text style={styles.statLabel}>Bullish</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {bookmarks.filter((b) => b.sentiment === 'BEARISH').length}
            </Text>
            <Text style={styles.statLabel}>Bearish</Text>
          </View>
        </View>

        {filteredBookmarks.map(renderBookmark)}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Analysis</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{bookmarks.length}</Text>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        {filterOptions.map(renderFilterButton)}
      </View>

      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ECECEC',
  },
  headerBadge: {
    backgroundColor: '#4ECCA3',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerBadgeText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  filterButtonActive: {
    borderColor: 'transparent',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#A0A0A0',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ECECEC',
    marginTop: 12,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#333333',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4ECCA3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  bookmarkCard: {
    backgroundColor: '#1E1E1E',
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  bookmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  deleteButton: {
    padding: 4,
  },
  bookmarkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ECECEC',
    lineHeight: 22,
    marginBottom: 8,
  },
  bookmarkSummary: {
    fontSize: 14,
    color: '#A0A0A0',
    lineHeight: 20,
    marginBottom: 12,
  },
  bookmarkFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceText: {
    fontSize: 12,
    color: '#30A5FF',
    fontWeight: '500',
  },
  scoreBadge: {
    backgroundColor: 'rgba(78, 204, 163, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  scoreText: {
    fontSize: 11,
    color: '#4ECCA3',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#666666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ECECEC',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default BookmarksScreen;
