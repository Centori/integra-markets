/**
 * Authentication Service
 * Handles Google and Apple Sign-In with Supabase
 */
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { api } from './apiClient';

// Complete auth session for web
WebBrowser.maybeCompleteAuthSession();

// Constants
const AUTH_TOKEN_KEY = '@auth_token';
const USER_DATA_KEY = '@user_data';

class AuthService {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
    }

    /**
     * Initialize auth service and check stored session
     */
    async initialize() {
        try {
            // Check for stored auth token
            const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
            const storedUser = await AsyncStorage.getItem(USER_DATA_KEY);

            if (storedToken && storedUser) {
                this.authToken = storedToken;
                this.currentUser = JSON.parse(storedUser);
                
                // Validate token with backend
                await this.validateToken();
            }

            return this.currentUser;
        } catch (error) {
            console.error('Auth initialization error:', error);
            return null;
        }
    }

    /**
     * Sign in with Google using Supabase OAuth
     */
    async signInWithGoogle() {
        try {
            // Use Supabase OAuth for Google
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: AuthSession.makeRedirectUri({
                        scheme: 'integra',
                        path: 'auth'
                    }),
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });

            if (error) throw error;

            // Handle the OAuth response
            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    AuthSession.makeRedirectUri({
                        scheme: 'integra',
                        path: 'auth'
                    })
                );

                if (result.type === 'success' && result.url) {
                    // Parse the auth response
                    const params = AuthSession.parseRedirectUrl(result.url);
                    
                    // Get the session
                    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
                    
                    if (sessionError) throw sessionError;
                    
                    if (sessionData?.session) {
                        // Save auth data
                        await this.handleAuthSuccess(sessionData.session);
                        return { success: true, user: this.currentUser };
                    }
                }
            }

            return { success: false, error: 'Authentication cancelled' };
        } catch (error) {
            console.error('Google sign-in error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign in with Apple (iOS only)
     */
    async signInWithApple() {
        if (Platform.OS !== 'ios') {
            return { success: false, error: 'Apple Sign-In is only available on iOS' };
        }

        try {
            // Check if Apple Sign-In is available
            const available = await AppleAuthentication.isAvailableAsync();
            if (!available) {
                return { success: false, error: 'Apple Sign-In is not available on this device' };
            }

            // Request Apple authentication
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            // Sign in with Supabase using Apple ID token
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'apple',
                token: credential.identityToken,
                nonce: credential.nonce,
            });

            if (error) throw error;

            if (data?.session) {
                // Save auth data
                await this.handleAuthSuccess(data.session);
                return { success: true, user: this.currentUser };
            }

            return { success: false, error: 'Failed to authenticate with Apple' };
        } catch (error) {
            if (error.code === 'ERR_CANCELED') {
                return { success: false, error: 'Sign-in cancelled' };
            }
            console.error('Apple sign-in error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign in with email and password
     */
    async signInWithEmail(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data?.session) {
                await this.handleAuthSuccess(data.session);
                return { success: true, user: this.currentUser };
            }

            return { success: false, error: 'Failed to sign in' };
        } catch (error) {
            console.error('Email sign-in error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign up with email and password
     */
    async signUpWithEmail(email, password, fullName) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    }
                }
            });

            if (error) throw error;

            if (data?.session) {
                await this.handleAuthSuccess(data.session);
                return { success: true, user: this.currentUser };
            }

            // If email confirmation is required
            if (data?.user && !data.session) {
                return { 
                    success: true, 
                    requiresConfirmation: true,
                    message: 'Please check your email to confirm your account' 
                };
            }

            return { success: false, error: 'Failed to sign up' };
        } catch (error) {
            console.error('Email sign-up error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle successful authentication
     */
    async handleAuthSuccess(session) {
        try {
            // Store auth token
            this.authToken = session.access_token;
            await AsyncStorage.setItem(AUTH_TOKEN_KEY, this.authToken);

            // Get user data from Supabase
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error) throw error;

            // Create user object
            this.currentUser = {
                id: user.id,
                email: user.email,
                fullName: user.user_metadata?.full_name || user.email.split('@')[0],
                avatar: user.user_metadata?.avatar_url,
                provider: user.app_metadata?.provider || 'email',
            };

            // Store user data
            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(this.currentUser));

            // Register/update user in our backend
            await this.syncUserWithBackend();

            // Register push token if available
            await this.registerPushToken();
        } catch (error) {
            console.error('Error handling auth success:', error);
            throw error;
        }
    }

    /**
     * Sync user data with our backend
     */
    async syncUserWithBackend() {
        try {
            // Set auth header for API calls
            api.setAuthToken(this.authToken);

            // Check if user exists in our backend
            const response = await api.get('/auth/me');
            
            if (response.status === 404) {
                // Create user in our backend
                await api.post('/auth/sync', {
                    email: this.currentUser.email,
                    full_name: this.currentUser.fullName,
                    supabase_uid: this.currentUser.id,
                });
            }
        } catch (error) {
            console.error('Error syncing user with backend:', error);
        }
    }

    /**
     * Register push notification token
     */
    async registerPushToken() {
        try {
            const pushToken = await AsyncStorage.getItem('@push_token');
            if (pushToken && this.authToken) {
                await api.post('/notifications/register-token', {
                    token: pushToken,
                    device_type: Platform.OS,
                });
            }
        } catch (error) {
            console.error('Error registering push token:', error);
        }
    }

    /**
     * Validate stored token
     */
    async validateToken() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error || !session) {
                await this.signOut();
                return false;
            }

            // Update token if refreshed
            if (session.access_token !== this.authToken) {
                this.authToken = session.access_token;
                await AsyncStorage.setItem(AUTH_TOKEN_KEY, this.authToken);
            }

            return true;
        } catch (error) {
            console.error('Token validation error:', error);
            await this.signOut();
            return false;
        }
    }

    /**
     * Sign out the current user
     */
    async signOut() {
        try {
            // Sign out from Supabase
            await supabase.auth.signOut();

            // Clear stored data
            await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);

            // Clear instance data
            this.currentUser = null;
            this.authToken = null;

            // Clear API token
            api.setAuthToken(null);

            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.currentUser && !!this.authToken;
    }

    /**
     * Get auth token
     */
    getAuthToken() {
        return this.authToken;
    }
}

// Export singleton instance
export const authService = new AuthService();

// Export convenience functions
export const signInWithGoogle = () => authService.signInWithGoogle();
export const signInWithApple = () => authService.signInWithApple();
export const signInWithEmail = (email, password) => authService.signInWithEmail(email, password);
export const signUpWithEmail = (email, password, fullName) => authService.signUpWithEmail(email, password, fullName);
export const signOut = () => authService.signOut();
export const getCurrentUser = () => authService.getCurrentUser();
export const isAuthenticated = () => authService.isAuthenticated();
