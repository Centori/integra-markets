/**
 * Google Onboarding End-to-End Tests
 * Tests the complete user onboarding flow with Google authentication
 * Works across iOS, Android, and Web platforms
 */

import { Platform } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import { supabase } from '../../lib/supabase';
import { AuthProvider, LoginScreen, ProfileSetupScreen } from '../mocks/providers';
import React from 'react';

// Mock modules
jest.mock('expo-auth-session/providers/google');
jest.mock('../../lib/supabase');
jest.mock('@react-native-async-storage/async-storage');

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
      
      // Mock Google auth response for iOS
      const mockAuthRequest = {
        promptAsync: jest.fn().mockResolvedValue({
          type: 'success',
          authentication: { accessToken: 'mock-ios-token' },
        }),
      };
      
      (Google.useAuthRequest as jest.Mock).mockReturnValue([
        mockAuthRequest,
        { type: 'success', authentication: { accessToken: 'mock-ios-token' } },
        jest.fn(),
      ]);

      const { getByText } = render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockAuthRequest.promptAsync).toHaveBeenCalled();
        expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
          provider: 'google',
          token: 'mock-ios-token',
        });
      });
    });

    test('Android: Should handle Google Sign-In flow correctly', async () => {
      Platform.OS = 'android';
      
      // Mock Google auth response for Android
      const mockAuthRequest = {
        promptAsync: jest.fn().mockResolvedValue({
          type: 'success',
          authentication: { accessToken: 'mock-android-token' },
        }),
      };
      
      (Google.useAuthRequest as jest.Mock).mockReturnValue([
        mockAuthRequest,
        { type: 'success', authentication: { accessToken: 'mock-android-token' } },
        jest.fn(),
      ]);

      const { getByText } = render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockAuthRequest.promptAsync).toHaveBeenCalled();
        expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
          provider: 'google',
          token: 'mock-android-token',
        });
      });
    });

    test('Web: Should handle Google Sign-In flow correctly', async () => {
      Platform.OS = 'web';
      
      // Mock Google auth response for Web
      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth/authorize' },
        error: null,
      });

      const { getByText } = render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: expect.stringContaining('/auth/callback'),
          },
        });
      });
    });
  });

  describe('User Profile Creation and Persistence', () => {
    test('Should create user profile after successful Google Sign-In', async () => {
      // Mock successful Google sign-in
      (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      });

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

      const { getByText } = render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('profiles');
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'userProfile',
          expect.stringContaining(mockSupabaseUser.email)
        );
      });
    });

    test('Should persist user data across app restarts', async () => {
      // Mock stored user data
      const storedProfile = {
        id: mockSupabaseUser.id,
        email: mockSupabaseUser.email,
        full_name: 'Test User',
        avatar_url: 'https://example.com/photo.jpg',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(storedProfile)
      );

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: mockSupabaseUser } },
        error: null,
      });

      const { getByText } = render(
        <AuthProvider>
          <ProfileSetupScreen />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByText('Test User')).toBeTruthy();
        expect(getByText('testuser@gmail.com')).toBeTruthy();
      });
    });
  });

  describe('Profile Data Validation and Updates', () => {
    test('Should validate required profile fields', async () => {
      const { getByPlaceholder, getByText } = render(
        <AuthProvider>
          <ProfileSetupScreen />
        </AuthProvider>
      );

      // Try to submit empty profile
      const saveButton = getByText('Save Profile');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('Display name is required')).toBeTruthy();
      });
    });

    test('Should update profile data successfully', async () => {
      // Mock profile update
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [{
                id: mockSupabaseUser.id,
                display_name: 'Updated Name',
                bio: 'Updated bio',
                updated_at: new Date().toISOString(),
              }],
              error: null,
            }),
          }),
        }),
      });

      const { getByPlaceholder, getByText } = render(
        <AuthProvider>
          <ProfileSetupScreen />
        </AuthProvider>
      );

      const nameInput = getByPlaceholder('Display Name');
      const bioInput = getByPlaceholder('Bio (optional)');

      fireEvent.changeText(nameInput, 'Updated Name');
      fireEvent.changeText(bioInput, 'Updated bio');

      const saveButton = getByText('Save Profile');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('profiles');
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'userProfile',
          expect.stringContaining('Updated Name')
        );
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('Should handle Google Sign-In cancellation', async () => {
      const mockAuthRequest = {
        promptAsync: jest.fn().mockResolvedValue({
          type: 'cancel',
        }),
      };
      
      (Google.useAuthRequest as jest.Mock).mockReturnValue([
        mockAuthRequest,
        { type: 'cancel' },
        jest.fn(),
      ]);

      const { getByText, queryByText } = render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
        expect(queryByText('Sign in cancelled')).toBeTruthy();
      });
    });

    test('Should handle network errors gracefully', async () => {
      (supabase.auth.signInWithIdToken as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(getByText('Network error. Please try again.')).toBeTruthy();
      });
    });

    test('Should handle duplicate account scenarios', async () => {
      (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'User already registered' },
      });

      const { getByText } = render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(getByText('This account is already registered')).toBeTruthy();
      });
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

      const { getByText } = render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'userProfile',
          expect.stringContaining('followers_count')
        );
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'userProfile',
          expect.stringContaining('reputation_score')
        );
      });
    });
  });
});
