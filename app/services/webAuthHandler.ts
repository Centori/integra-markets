/**
 * Web Authentication Handler
 * Handles deep linking, URL parameters, and OAuth callbacks for web platform
 */
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

export interface AuthUrlParams {
  mode?: 'login' | 'signup';
  provider?: 'google' | 'email';
  redirect_to?: string;
  error?: string;
  error_description?: string;
}

export class WebAuthHandler {
  private static instance: WebAuthHandler;
  
  public static getInstance(): WebAuthHandler {
    if (!WebAuthHandler.instance) {
      WebAuthHandler.instance = new WebAuthHandler();
    }
    return WebAuthHandler.instance;
  }

  /**
   * Parse URL parameters and fragments for auth information
   */
  parseAuthUrl(url?: string): AuthUrlParams {
    if (Platform.OS !== 'web') return {};
    
    try {
      const targetUrl = url || window.location.href;
      const urlObj = new URL(targetUrl);
      
      const params: AuthUrlParams = {};
      
      // Check URL parameters
      const searchParams = urlObj.searchParams;
      if (searchParams.get('auth')) {
        params.mode = searchParams.get('auth') as 'login' | 'signup';
      }
      if (searchParams.get('provider')) {
        params.provider = searchParams.get('provider') as 'google' | 'email';
      }
      if (searchParams.get('redirect_to')) {
        params.redirect_to = searchParams.get('redirect_to');
      }
      
      // Check for OAuth errors
      if (searchParams.get('error')) {
        params.error = searchParams.get('error') || undefined;
        params.error_description = searchParams.get('error_description') || undefined;
      }
      
      // Check URL fragment for OAuth callback data
      if (urlObj.hash) {
        const fragmentParams = new URLSearchParams(urlObj.hash.substring(1));
        
        // Supabase OAuth callback parameters
        if (fragmentParams.get('access_token')) {
          // This is a successful OAuth callback
          return {
            mode: 'login',
            provider: 'google', // Assume Google for now
            ...params
          };
        }
        
        if (fragmentParams.get('error')) {
          params.error = fragmentParams.get('error') || undefined;
          params.error_description = fragmentParams.get('error_description') || undefined;
        }
      }
      
      return params;
    } catch (error) {
      console.error('Error parsing auth URL:', error);
      return {};
    }
  }

  /**
   * Get the appropriate redirect URL for the current domain
   */
  getRedirectUrl(): string {
    if (Platform.OS !== 'web') return '';
    
    const { protocol, hostname, port } = window.location;
    const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
    
    // For production, use your actual domain
    if (hostname.includes('integramarkets.app')) {
      return 'https://integramarkets.app/app';
    }
    
    // For development/preview
    if (hostname.includes('vercel.app')) {
      return `${baseUrl}/app`;
    }
    
    // For local development
    return `${baseUrl}`;
  }

  /**
   * Initialize OAuth flow with appropriate redirect
   */
  async initiateOAuth(provider: 'google' | 'github' = 'google', options?: {
    redirectTo?: string;
    queryParams?: Record<string, string>;
  }) {
    if (Platform.OS !== 'web') {
      throw new Error('OAuth flow only available on web platform');
    }

    try {
      const redirectTo = options?.redirectTo || this.getRedirectUrl();
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            ...options?.queryParams
          }
        }
      });

      if (error) {
        throw error;
      }

      // The user will be redirected to the OAuth provider
      return { success: true, data };
    } catch (error) {
      console.error('OAuth initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle OAuth callback after redirect
   */
  async handleOAuthCallback(): Promise<{ success: boolean; session?: any; error?: string }> {
    if (Platform.OS !== 'web') {
      return { success: false, error: 'OAuth callback only available on web' };
    }

    try {
      // Supabase automatically handles the OAuth callback when detectSessionInUrl is true
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }

      if (session) {
        // Clear the URL fragment to remove OAuth parameters
        this.cleanUrl();
        return { success: true, session };
      }

      return { success: false, error: 'No session found after OAuth callback' };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean URL by removing auth-related parameters and fragments
   */
  cleanUrl() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    
    try {
      const url = new URL(window.location.href);
      
      // Remove auth-related query parameters
      const paramsToRemove = [
        'auth', 'provider', 'error', 'error_description', 
        'code', 'state', 'access_token', 'refresh_token', 'token_type', 'expires_in'
      ];
      
      paramsToRemove.forEach(param => {
        url.searchParams.delete(param);
      });
      
      // Remove fragment
      url.hash = '';
      
      // Update URL without page refresh
      window.history.replaceState({}, document.title, url.toString());
    } catch (error) {
      console.error('Error cleaning URL:', error);
    }
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { success: true, session: data.session, user: data.user };
    } catch (error) {
      console.error('Email sign-in error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUpWithEmail(email: string, password: string, fullName?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: fullName ? { full_name: fullName } : undefined,
          emailRedirectTo: this.getRedirectUrl()
        }
      });

      if (error) throw error;

      return { 
        success: true, 
        session: data.session, 
        user: data.user,
        needsConfirmation: !data.session && !!data.user
      };
    } catch (error) {
      console.error('Email sign-up error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Listen for auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      this.cleanUrl();
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const webAuthHandler = WebAuthHandler.getInstance();
