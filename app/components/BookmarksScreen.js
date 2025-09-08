import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useBookmarks } from '../providers/BookmarkProvider';

// Color palette
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

export default function BookmarksScreen({ onBack, onSelectBookmark }) {
  const { 
    bookmarks, 
    newsBookmarks, 
    chatBookmarks, 
    removeBookmark, 
    searchBookmarks,
    clearAllBookmarks,
    isLoading 
  } = useBookmarks();

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Filter and sort bookmarks based on active tab and search
  const filteredBookmarks = useMemo(() => {
    let filtered = activeTab === 'all' 
      ? bookmarks 
      : activeTab === 'news' 
        ? newsBookmarks 
        : chatBookmarks;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = searchBookmarks(searchQuery);
      // Further filter by tab if not "all"
      if (activeTab !== 'all') {
        filtered = filtered.filter(b => b.type === activeTab);
      }
    }

    // Sort bookmarks
    const sorted = [...filtered].sort((a, b) => {
      const dateA = a.createdAt.getTime();
      const dateB = b.createdAt.getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return sorted;
  }, [bookmarks, newsBookmarks, chatBookmarks, activeTab, searchQuery, sortBy, searchBookmarks]);

  const handleDeleteBookmark = (id, title) => {
    Alert.alert(
      'Delete Bookmark',
      `Remove "${title}" from bookmarks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeBookmark(id),
        },
      ]
    );
  };

  const formatDate = (date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderNewsBookmark = (bookmark) => (
    <TouchableOpacity
      style={styles.bookmarkCard}
      onPress={() => onSelectBookmark?.(bookmark)}
      activeOpacity={0.7}
    >
      <View style={styles.bookmarkHeader}>
        <View style={styles.bookmarkTypeIcon}>
          <MaterialIcons name="article" size={16} color={colors.accentData} />
        </View>
        <Text style={styles.bookmarkSource}>{bookmark.source}</Text>
        <Text style={styles.bookmarkDate}>{formatDate(bookmark.createdAt)}</Text>
      </View>
      
      <Text style={styles.bookmarkTitle} numberOfLines={2}>
        {bookmark.title}
      </Text>
      
      <Text style={styles.bookmarkSummary} numberOfLines={2}>
        {bookmark.summary}
      </Text>
      
      <View style={styles.bookmarkFooter}>
        {bookmark.sentiment && (
          <View style={[
            styles.sentimentBadge,
            bookmark.sentiment === 'BULLISH' && styles.bullishBadge,
            bookmark.sentiment === 'BEARISH' && styles.bearishBadge,
            bookmark.sentiment === 'NEUTRAL' && styles.neutralBadge,
          ]}>
            <Text style={styles.sentimentText}>{bookmark.sentiment}</Text>
          </View>
        )}
        
        {bookmark.commodities && bookmark.commodities.length > 0 && (
          <View style={styles.commoditiesList}>
            {bookmark.commodities.slice(0, 2).map((commodity, index) => (
              <Text key={index} style={styles.commodityTag}>
                {commodity}
              </Text>
            ))}
            {bookmark.commodities.length > 2 && (
              <Text style={styles.commodityTag}>+{bookmark.commodities.length - 2}</Text>
            )}
          </View>
        )}
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteBookmark(bookmark.id, bookmark.title);
          }}
        >
          <MaterialIcons name="delete-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderChatBookmark = (bookmark) => (
    <TouchableOpacity
      style={styles.bookmarkCard}
      onPress={() => onSelectBookmark?.(bookmark)}
      activeOpacity={0.7}
    >
      <View style={styles.bookmarkHeader}>
        <View style={styles.bookmarkTypeIcon}>
          <MaterialIcons name="chat" size={16} color={colors.accentPositive} />
        </View>
        <Text style={styles.bookmarkSource}>AI Chat</Text>
        <Text style={styles.bookmarkDate}>{formatDate(bookmark.createdAt)}</Text>
      </View>
      
      <View style={styles.chatQuery}>
        <MaterialIcons name="person" size={14} color={colors.textSecondary} />
        <Text style={styles.queryText} numberOfLines={1}>
          {bookmark.query}
        </Text>
      </View>
      
      <View style={styles.chatResponse}>
        <MaterialIcons name="auto-awesome" size={14} color={colors.accentPositive} />
        <Text style={styles.responseText} numberOfLines={3}>
          {bookmark.response.substring(0, 150)}...
        </Text>
      </View>
      
      <View style={styles.bookmarkFooter}>
        {bookmark.sources && bookmark.sources.length > 0 && (
          <View style={styles.sourcesContainer}>
            <MaterialIcons name="link" size={14} color={colors.textSecondary} />
            <Text style={styles.sourcesCount}>
              {bookmark.sources.length} source{bookmark.sources.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
        
        {bookmark.tags && bookmark.tags.length > 0 && (
          <View style={styles.tagsList}>
            {bookmark.tags.slice(0, 2).map((tag, index) => (
              <Text key={index} style={styles.tag}>#{tag}</Text>
            ))}
          </View>
        )}
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteBookmark(bookmark.id, bookmark.title);
          }}
        >
          <MaterialIcons name="delete-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderBookmark = ({ item }) => {
    return item.type === 'news' 
      ? renderNewsBookmark(item)
      : renderChatBookmark(item);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="bookmark-border" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No bookmarks yet</Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'news' 
          ? 'Bookmark news articles to save them for later'
          : activeTab === 'chat'
          ? 'Save important AI chat responses here'
          : 'Start bookmarking content to access it later'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bookmarks</Text>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={clearAllBookmarks}
          disabled={bookmarks.length === 0}
        >
          <MaterialIcons 
            name="delete-sweep" 
            size={24} 
            color={bookmarks.length > 0 ? colors.textPrimary : colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search bookmarks..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="clear" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All ({bookmarks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'news' && styles.activeTab]}
          onPress={() => setActiveTab('news')}
        >
          <Text style={[styles.tabText, activeTab === 'news' && styles.activeTabText]}>
            News ({newsBookmarks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
          onPress={() => setActiveTab('chat')}
        >
          <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>
            Chat ({chatBookmarks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <TouchableOpacity
          style={[styles.sortOption, sortBy === 'newest' && styles.activeSortOption]}
          onPress={() => setSortBy('newest')}
        >
          <Text style={[styles.sortText, sortBy === 'newest' && styles.activeSortText]}>
            Newest
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortOption, sortBy === 'oldest' && styles.activeSortOption]}
          onPress={() => setSortBy('oldest')}
        >
          <Text style={[styles.sortText, sortBy === 'oldest' && styles.activeSortText]}>
            Oldest
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bookmarks List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentPositive} />
        </View>
      ) : (
        <FlatList
          data={filteredBookmarks}
          renderItem={renderBookmark}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            filteredBookmarks.length === 0 && styles.emptyListContent
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  menuButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
  },
  activeTab: {
    backgroundColor: colors.accentPositive,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.bgPrimary,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sortLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 12,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: colors.bgSecondary,
  },
  activeSortOption: {
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.accentPositive,
  },
  sortText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  activeSortText: {
    color: colors.accentPositive,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyListContent: {
    flex: 1,
  },
  bookmarkCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bookmarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookmarkTypeIcon: {
    marginRight: 8,
  },
  bookmarkSource: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  bookmarkDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bookmarkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    lineHeight: 22,
  },
  bookmarkSummary: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  bookmarkFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentimentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  bullishBadge: {
    backgroundColor: 'rgba(78, 204, 163, 0.2)',
  },
  bearishBadge: {
    backgroundColor: 'rgba(240, 84, 84, 0.2)',
  },
  neutralBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  commoditiesList: {
    flexDirection: 'row',
    flex: 1,
  },
  commodityTag: {
    fontSize: 12,
    color: colors.accentData,
    marginRight: 8,
  },
  chatQuery: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  queryText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginLeft: 6,
    fontStyle: 'italic',
    flex: 1,
  },
  chatResponse: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  responseText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
    lineHeight: 20,
    flex: 1,
  },
  sourcesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  sourcesCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  tagsList: {
    flexDirection: 'row',
    flex: 1,
  },
  tag: {
    fontSize: 12,
    color: colors.accentData,
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 'auto',
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
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
