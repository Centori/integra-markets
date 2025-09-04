import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get Supabase credentials from environment variables
const getSupabaseConfig = () => {
  // For web platform, use hardcoded values as fallback
  if (Platform.OS === 'web') {
    return {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jcovjmuaysebdfbpbvdh.supabase.co',
      key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjb3ZqbXVheXNlYmRmYnBidmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTA3NTEsImV4cCI6MjA2ODA2Njc1MX0.vnIaHcLbQRBz1Q1HgFOT5-KZqghQDKBu-uCanVU2AGQ'
    };
  }
  
  // For mobile platforms, use expo constants
  return {
    url: Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jcovjmuaysebdfbpbvdh.supabase.co',
    key: Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjb3ZqbXVheXNlYmRmYnBidmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTA3NTEsImV4cCI6MjA2ODA2Njc1MX0.vnIaHcLbQRBz1Q1HgFOT5-KZqghQDKBu-uCanVU2AGQ'
  };
};

const { url: supabaseUrl, key: supabaseAnonKey } = getSupabaseConfig();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anonymous Key is missing. Please check your environment variables.');
}

// Only create the client if we have valid credentials
// This prevents build-time errors when environment variables are not yet available
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web', // Enable for web, disable for mobile
        flowType: 'pkce', // Use PKCE flow for better security
      },
    })
  : null as any; // Return null if credentials are missing, but typed as any to maintain compatibility
