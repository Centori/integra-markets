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

// Root cause of Build 63/64 launch crashes: when EXPO_PUBLIC_SUPABASE_ANON_KEY
// is undefined in production, calling createClient(url, undefined) throws
// synchronously at module load, before React mounts. The Expo error recovery
// queue then aborts (SIGABRT in expo.controller.errorRecoveryQueue). We now
// defer client construction and provide a stub if config is missing so a
// misconfigured env var can never crash launch again.

const _url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const _key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!_url || !_key) {
  console.error(
    '[integra] Missing Supabase config',
    { url: !!_url, key: !!_key },
    '— auth will not work until env vars are supplied at build time.',
  );
}

export const supabaseUrl = _url ?? '';
export const supabaseAnonKey = _key ?? '';

function makeStubClient(): ReturnType<typeof createClient> {
  // A tiny stand-in that mirrors the shape the app touches on startup so
  // nothing throws before React mounts. All calls resolve to a "not
  // authenticated" state.
  const notConfigured = { data: null, error: { message: 'Supabase not configured' } as any };
  const auth = {
    getUser: async () => notConfigured,
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
    startAutoRefresh: () => {},
    stopAutoRefresh: () => {},
  };
  return { auth } as unknown as ReturnType<typeof createClient>;
}

const supabase = (_url && _key)
  ? createClient(_url, _key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : makeStubClient();

// Set up app state change listener to handle auth state. Wrapped in guard
// so a stub client never triggers auth methods.
AppState.addEventListener('change', (state) => {
  try {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  } catch (err) {
    console.warn('[integra] supabase auth refresh threw:', err);
  }
});

export { supabase };