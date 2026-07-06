import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// url-polyfill is guarded — a failed native URL polyfill install has been
// implicated in early-launch native crashes on iOS 26.x. iOS 26 has proper
// URL/URLSearchParams globals, so the polyfill is a no-op there anyway.
try {
  require('react-native-url-polyfill/auto');
} catch {
  // no-op — modern iOS ships URL globally
}

if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
  console.error('Missing SUPABASE_URL in environment variables');
}

if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_ANON_KEY in environment variables');
}

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Set up app state change listener to handle auth state
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export { supabase };