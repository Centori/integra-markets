import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase } from '../utils/supabaseConfig';

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

// Cross-platform bookmark identity: the web app keys `bookmarks` rows by this
// exact slug of the title, so mobile must derive it identically for a
// bookmark saved on either surface to be the same row.
const slugForTitle = (title: string) =>
  title.replace(/\s+/g, '-').toLowerCase().slice(0, 50);

const sessionUserId = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
};

// Shape a local news bookmark into the web app's `bookmarks` row contract.
const toRemoteRow = (userId: string, b: NewsBookmark) => ({
  user_id: userId,
  article_id: slugForTitle(b.title),
  title: b.title,
  url: b.sourceUrl ?? null,
  source: b.source ?? null,
  sentiment: b.sentiment ?? null,
  sentiment_score: b.sentimentScore ?? null,
  image_url: null,
  published_at: null,
});

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const bookmarksRef = useRef<Bookmark[]>([]);

  useEffect(() => {
    bookmarksRef.current = bookmarks;
  }, [bookmarks]);

  // Computed properties for filtered bookmarks
  const newsBookmarks = bookmarks.filter((b): b is NewsBookmark => b.type === 'news');
  const chatBookmarks = bookmarks.filter((b): b is ChatBookmark => b.type === 'chat');

  useEffect(() => {
    loadBookmarks();
    // Re-sync whenever a session appears (sign-in, session restore)
    const { data } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_IN') syncWithRemote();
    });
    return () => data?.subscription?.unsubscribe?.();
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
        syncWithRemote(parsedBookmarks);
      } else {
        // Check for old format bookmarks and migrate
        await migrateOldBookmarks();
        syncWithRemote();
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Two-way merge with the web app's `bookmarks` table. Local storage stays
  // the source of truth for instant UX and guest mode; remote is additive.
  const syncWithRemote = async (current?: Bookmark[]) => {
    const userId = await sessionUserId();
    if (!userId) return;
    try {
      const { data: remoteRows, error } = await supabase
        .from('bookmarks')
        .select('article_id, title, url, source, sentiment, sentiment_score')
        .eq('user_id', userId);
      if (error || !remoteRows) return;

      const local = current ?? bookmarksRef.current;
      const localNews = local.filter((b): b is NewsBookmark => b.type === 'news');
      const localSlugs = new Set(localNews.map((b) => slugForTitle(b.title)));
      const remoteSlugs = new Set(remoteRows.map((r: any) => r.article_id));

      // Push local-only bookmarks up (first sign-in uploads guest bookmarks)
      const toPush = localNews.filter((b) => !remoteSlugs.has(slugForTitle(b.title)));
      if (toPush.length > 0) {
        await supabase.from('bookmarks').insert(toPush.map((b) => toRemoteRow(userId, b)));
      }

      // Pull remote-only bookmarks down (saved on web, missing here)
      const pulled: NewsBookmark[] = remoteRows
        .filter((r: any) => r.title && !localSlugs.has(r.article_id))
        .map((r: any) => ({
          type: 'news' as const,
          id: `news_remote_${r.article_id}`,
          title: r.title,
          summary: '',
          source: r.source ?? '',
          sourceUrl: r.url ?? undefined,
          sentiment: r.sentiment ?? undefined,
          sentimentScore: r.sentiment_score ?? undefined,
          createdAt: new Date(),
        }));
      if (pulled.length > 0) {
        const merged = [...pulled, ...local];
        setBookmarks(merged);
        await saveBookmarks(merged);
      }
    } catch (error) {
      console.error('Bookmark sync failed:', error);
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

    // Write-through to the shared web `bookmarks` table (fire-and-forget)
    const userId = await sessionUserId();
    if (userId) {
      const { error } = await supabase.from('bookmarks').insert(toRemoteRow(userId, newBookmark));
      if (error) console.error('Remote bookmark insert failed:', error.message);
    }
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
    const removed = bookmarks.find(bookmark => bookmark.id === id);
    const updatedBookmarks = bookmarks.filter(bookmark => bookmark.id !== id);
    setBookmarks(updatedBookmarks);
    await saveBookmarks(updatedBookmarks);

    if (removed?.type === 'news') {
      const userId = await sessionUserId();
      if (userId) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', userId)
          .eq('article_id', slugForTitle(removed.title));
        if (error) console.error('Remote bookmark delete failed:', error.message);
      }
    }
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