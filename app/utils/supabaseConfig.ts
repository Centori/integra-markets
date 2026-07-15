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

// NEVER let a missing env var crash the app at module load. createClient
// throws "supabaseKey is required." if the key is undefined — this was the
// root cause of the perennial startup SIGABRT (builds 62-64/71: eas.json
// shipped the URL but not the anon key, so every embedded bundle fataled).
// Auth degrades gracefully instead; the app still opens and shows news.
function makeStubClient(): any {
  const fail = async () => ({ data: null, error: new Error('Supabase not configured') });
  // Query builders chain arbitrarily (.select().eq().single()...) and are
  // awaited at any depth, so the stub must be both chainable and thenable.
  const chain = (): any =>
    new Proxy(() => chain(), {
      get: (_t, prop) =>
        prop === 'then'
          ? (resolve: any) => resolve({ data: null, error: new Error('Supabase not configured') })
          : () => chain(),
      apply: () => chain(),
    });
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: fail, signInWithIdToken: fail, signInWithOAuth: fail,
      signInWithPassword: fail, signUp: fail,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      startAutoRefresh: () => {}, stopAutoRefresh: () => {},
    },
    from: () => chain(),
    rpc: fail,
    storage: { from: () => ({ list: fail, remove: fail, upload: fail, getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    functions: { invoke: fail },
  };
}

const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : makeStubClient();

// Set up app state change listener to handle auth state
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export { supabase };