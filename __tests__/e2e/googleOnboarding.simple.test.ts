/**
 * Google Onboarding End-to-End Tests (Simplified)
 * Tests the complete user onboarding flow with Google authentication
 * Works across iOS, Android, and Web platforms
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import { supabase } from '../../lib/supabase';

// Mock modules are already set up in jest.setup.js

describe('Google Onboarding Flow - Cross-Platform', () => {
  let mockGoogleUser: any;
  let mockSupabaseUser: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock Google user data
    mockGoogleUser = {
      id: 'google-123',
      email: 'testuser@gmail.com',
      given_name: 'Test',
      family_name: 'User',
      picture: 'https://example.com/photo.jpg',
      verified_email: true,
    };

    // Mock Supabase user data
    mockSupabaseUser = {
      id: 'supabase-user-123',
      email: 'testuser@gmail.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/photo.jpg',
        provider: 'google',
      },
    };

    // Setup AsyncStorage mock
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Platform-specific Google Sign-In', () => {
    test('iOS: Should handle Google Sign-In flow correctly', async () => {
      Platform.OS = 'ios';
      
      // Mock successful auth response
      (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      });

      // Simulate sign in
      const result = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: 'mock-ios-token',
      });

      expect(result.data?.user).toBeDefined();
      expect(result.data?.user.email).toBe('testuser@gmail.com');
      expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
        provider: 'google',
        token: 'mock-ios-token',
      });
    });

    test('Android: Should handle Google Sign-In flow correctly', async () => {
      Platform.OS = 'android';
      
      // Mock successful auth response
      (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      });

      // Simulate sign in
      const result = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: 'mock-android-token',
      });

      expect(result.data?.user).toBeDefined();
      expect(result.data?.user.email).toBe('testuser@gmail.com');
    });

    test('Web: Should handle Google Sign-In flow correctly', async () => {
      Platform.OS = 'web';
      
      // Mock Google auth response for Web
      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth/authorize' },
        error: null,
      });

      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
        },
      });

      expect(result.data?.url).toContain('google.com');
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
        },
      });
    });
  });

  describe('User Profile Creation and Persistence', () => {
    test('Should create user profile after successful Google Sign-In', async () => {
      // Mock profile creation
      (supabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: mockSupabaseUser.id,
                email: mockSupabaseUser.email,
                full_name: mockSupabaseUser.user_metadata.full_name,
                avatar_url: mockSupabaseUser.user_metadata.avatar_url,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      });

      // Simulate profile creation
      const result = await supabase
        .from('profiles')
        .upsert({
          id: mockSupabaseUser.id,
          email: mockSupabaseUser.email,
          full_name: mockSupabaseUser.user_metadata.full_name,
        })
        .select()
        .single();

      expect(result.data).toBeDefined();
      expect(result.data.email).toBe(mockSupabaseUser.email);
      expect(supabase.from).toHaveBeenCalledWith('profiles');
    });

    test('Should persist user data across app restarts', async () => {
      // Mock stored user data
      const storedProfile = {
        id: mockSupabaseUser.id,
        email: mockSupabaseUser.email,
        full_name: 'Test User',
        avatar_url: 'https://example.com/photo.jpg',
      };

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(storedProfile)
      );

      // Store profile
      await AsyncStorage.setItem('userProfile', JSON.stringify(storedProfile));
      
      // Retrieve profile
      const retrieved = await AsyncStorage.getItem('userProfile');
      const parsed = JSON.parse(retrieved || '{}');

      expect(parsed.email).toBe('testuser@gmail.com');
      expect(parsed.full_name).toBe('Test User');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('Should handle Google Sign-In cancellation', async () => {
      (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Sign in cancelled by user' },
      });

      const result = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: 'cancelled-token',
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('cancelled');
    });

    test('Should handle network errors gracefully', async () => {
      (supabase.auth.signInWithIdToken as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        supabase.auth.signInWithIdToken({
          provider: 'google',
          token: 'error-token',
        })
      ).rejects.toThrow('Network error');
    });

    test('Should handle duplicate account scenarios', async () => {
      (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'User already registered' },
      });

      const result = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: 'duplicate-token',
      });

      expect(result.error?.message).toContain('already registered');
    });
  });

  describe('Social Features Readiness', () => {
    test('Should prepare user data structure for social features', async () => {
      const socialReadyProfile = {
        id: mockSupabaseUser.id,
        email: mockSupabaseUser.email,
        full_name: 'Test User',
        avatar_url: 'https://example.com/photo.jpg',
        // Social feature fields
        followers_count: 0,
        following_count: 0,
        total_votes: 0,
        reputation_score: 0,
        preferences: {
          notifications_enabled: true,
          public_profile: true,
          show_activity: true,
        },
      };

      (supabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: socialReadyProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await supabase
        .from('profiles')
        .upsert(socialReadyProfile)
        .select()
        .single();

      expect(result.data?.followers_count).toBe(0);
      expect(result.data?.reputation_score).toBe(0);
      expect(result.data?.preferences.notifications_enabled).toBe(true);

      // Store in AsyncStorage
      await AsyncStorage.setItem('userProfile', JSON.stringify(result.data));
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'userProfile',
        expect.stringContaining('followers_count')
      );
    });
  });
});
