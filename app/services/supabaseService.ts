import { supabase, supabaseUrl, supabaseAnonKey } from '../utils/supabaseConfig';
import NetInfo from '@react-native-community/netinfo';

export interface SupabaseStatus {
  isConfigured: boolean;
  isConnected: boolean;
  hasNetwork: boolean;
  error?: string;
}

class SupabaseService {
  /**
   * Check network connectivity
   */
  private async checkNetwork(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected ?? false;
  }

  /**
   * Verify Supabase configuration and connectivity
   */
  async verifyConfiguration(): Promise<SupabaseStatus> {
    // First check network connectivity
    const hasNetwork = await this.checkNetwork();
    if (!hasNetwork) {
      return {
        isConfigured: true,
        isConnected: false,
        hasNetwork: false,
        error: 'No network connection'
      };
    }

    // Check if environment variables are configured
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
      return {
        isConfigured: false,
        isConnected: false,
        hasNetwork: true,
        error: 'Missing SUPABASE_URL in environment'
      };
    }

    if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
      return {
        isConfigured: false,
        isConnected: false,
        hasNetwork: true,
        error: 'Missing SUPABASE_ANON_KEY in environment'
      };
    }

    // Then verify we can connect to Supabase
    try {
      // Try to make a simple query to verify connection
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);

      if (error) {
        return {
          isConfigured: true,
          isConnected: false,
          hasNetwork: true,
          error: `Connection failed: ${error.message}`
        };
      }

      return {
        isConfigured: true,
        isConnected: true,
        hasNetwork: true
      };
    } catch (err) {
      return {
        isConfigured: true,
        isConnected: false,
        hasNetwork: true,
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if Supabase authentication is working
   */
  async verifyAuth(): Promise<boolean> {
    try {
      const hasNetwork = await this.checkNetwork();
      if (!hasNetwork) return false;

      const { data: { session }, error } = await supabase.auth.getSession();
      return !error && session !== null;
    } catch {
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();