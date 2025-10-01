import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Base bookmark interface
export interface BaseBookmark {
  id: string;
  type: 'news' | 'chat';
  title: string;
  createdAt: Date;
  tags?: string[];
}

// News bookmark specific fields
export interface NewsBookmark extends BaseBookmark {
  type: 'news';
  summary: string;
  source: string;
  sourceUrl?: string;
  sentiment?: "BULLISH" | "BEARISH" | "NEUTRAL";
  sentimentScore?: number;
  commodities?: string[];
  marketImpact?: string;
}

// Chat bookmark specific fields
export interface ChatBookmark extends BaseBookmark {
  type: 'chat';
  query: string;
  response: string;
  sources?: Array<{ name: string; url?: string }>;
  analysis?: any; // For structured analysis data
}

export type Bookmark = NewsBookmark | ChatBookmark;

interface BookmarkContextType {
  bookmarks: Bookmark[];
  newsBookmarks: NewsBookmark[];
  chatBookmarks: ChatBookmark[];
  addNewsBookmark: (bookmark: Omit<NewsBookmark, 'id' | 'createdAt' | 'type'>) => Promise<void>;
  addChatBookmark: (bookmark: Omit<ChatBookmark, 'id' | 'createdAt' | 'type'>) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  isBookmarked: (identifier: string, type?: 'news' | 'chat') => boolean;
  getBookmarkById: (id: string) => Bookmark | undefined;
  searchBookmarks: (query: string) => Bookmark[];
  clearAllBookmarks: () => Promise<void>;
  isLoading: boolean;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

const STORAGE_KEY = 'integra_bookmarks_v2'; // Updated version for new format
const MAX_BOOKMARKS = 100; // Maximum number of bookmarks to store

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Computed properties for filtered bookmarks
  const newsBookmarks = bookmarks.filter((b): b is NewsBookmark => b.type === 'news');
  const chatBookmarks = bookmarks.filter((b): b is ChatBookmark => b.type === 'chat');

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsedBookmarks = JSON.parse(data).map((bookmark: any) => ({
          ...bookmark,
          createdAt: new Date(bookmark.createdAt)
        }));
        setBookmarks(parsedBookmarks);
      } else {
        // Check for old format bookmarks and migrate
        await migrateOldBookmarks();
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const migrateOldBookmarks = async () => {
    try {
      const oldData = await AsyncStorage.getItem('integra_bookmarks');
      if (oldData) {
        const oldBookmarks = JSON.parse(oldData);
        const migratedBookmarks: NewsBookmark[] = oldBookmarks.map((old: any) => ({
          ...old,
          type: 'news' as const,
          createdAt: new Date(old.createdAt)
        }));
        setBookmarks(migratedBookmarks);
        await saveBookmarks(migratedBookmarks);
        // Remove old storage key
        await AsyncStorage.removeItem('integra_bookmarks');
      }
    } catch (error) {
      console.error('Failed to migrate old bookmarks:', error);
    }
  };

  const saveBookmarks = async (bookmarks: Bookmark[]) => {
    try {
      // Limit bookmarks to MAX_BOOKMARKS, keeping newest
      const limitedBookmarks = bookmarks
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, MAX_BOOKMARKS);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(limitedBookmarks));
    } catch (error) {
      console.error('Failed to save bookmarks:', error);
      Alert.alert('Error', 'Failed to save bookmark. Please try again.');
    }
  };

  const addNewsBookmark = async (bookmarkData: Omit<NewsBookmark, 'id' | 'createdAt' | 'type'>) => {
    // Check if already bookmarked
    if (isBookmarked(bookmarkData.title, 'news')) {
      Alert.alert('Already Bookmarked', 'This article is already in your bookmarks.');
      return;
    }

    const newBookmark: NewsBookmark = {
      ...bookmarkData,
      type: 'news',
      id: `news_${Date.now()}`,
      createdAt: new Date()
    };
    
    const updatedBookmarks = [newBookmark, ...bookmarks];
    setBookmarks(updatedBookmarks);
    await saveBookmarks(updatedBookmarks);
  };

  const addChatBookmark = async (bookmarkData: Omit<ChatBookmark, 'id' | 'createdAt' | 'type'>) => {
    const newBookmark: ChatBookmark = {
      ...bookmarkData,
      type: 'chat',
      id: `chat_${Date.now()}`,
      createdAt: new Date()
    };
    
    const updatedBookmarks = [newBookmark, ...bookmarks];
    setBookmarks(updatedBookmarks);
    await saveBookmarks(updatedBookmarks);
  };

  const removeBookmark = async (id: string) => {
    const updatedBookmarks = bookmarks.filter(bookmark => bookmark.id !== id);
    setBookmarks(updatedBookmarks);
    await saveBookmarks(updatedBookmarks);
  };

  const isBookmarked = (identifier: string, type?: 'news' | 'chat') => {
    if (type === 'news') {
      return newsBookmarks.some(bookmark => bookmark.title === identifier);
    } else if (type === 'chat') {
      return chatBookmarks.some(bookmark => bookmark.query === identifier || bookmark.title === identifier);
    }
    return bookmarks.some(bookmark => 
      bookmark.title === identifier || 
      (bookmark.type === 'chat' && bookmark.query === identifier)
    );
  };

  const getBookmarkById = (id: string) => {
    return bookmarks.find(bookmark => bookmark.id === id);
  };

  const searchBookmarks = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return bookmarks.filter(bookmark => {
      const titleMatch = bookmark.title.toLowerCase().includes(lowerQuery);
      const tagMatch = bookmark.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
      
      if (bookmark.type === 'news') {
        const summaryMatch = bookmark.summary?.toLowerCase().includes(lowerQuery);
        const sourceMatch = bookmark.source?.toLowerCase().includes(lowerQuery);
        return titleMatch || summaryMatch || sourceMatch || tagMatch;
      } else {
        const queryMatch = bookmark.query.toLowerCase().includes(lowerQuery);
        const responseMatch = bookmark.response.toLowerCase().includes(lowerQuery);
        return titleMatch || queryMatch || responseMatch || tagMatch;
      }
    });
  };

  const clearAllBookmarks = async () => {
    Alert.alert(
      'Clear All Bookmarks',
      'Are you sure you want to delete all bookmarks? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setBookmarks([]);
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        }
      ]
    );
  };

  const value: BookmarkContextType = {
    bookmarks,
    newsBookmarks,
    chatBookmarks,
    addNewsBookmark,
    addChatBookmark,
    removeBookmark,
    isBookmarked,
    getBookmarkById,
    searchBookmarks,
    clearAllBookmarks,
    isLoading
  };

  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
};

export const useBookmarks = () => {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error('useBookmarks must be used within BookmarkProvider');
  }
  return context;
};