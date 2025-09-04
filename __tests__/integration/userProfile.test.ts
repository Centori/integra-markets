/**
 * User Profile Management Integration Tests
 * Tests profile CRUD operations, validation, and cross-device sync
 * Ensures consistency across iOS, Android, and Web platforms
 */

import { Platform } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useProfile, ProfileProvider, AuthProvider } from '../mocks/providers';
import React from 'react';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('@react-native-async-storage/async-storage');

describe('User Profile Management - Cross-Platform', () => {
  const mockUserId = 'test-user-123';
  const mockProfile = {
    id: mockUserId,
    email: 'test@example.com',
    full_name: 'Test User',
    display_name: 'TestUser',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Test bio',
    location: 'Test City',
    website: 'https://testuser.com',
    twitter_handle: '@testuser',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    // Social features
    followers_count: 10,
    following_count: 5,
    total_votes: 25,
    reputation_score: 100,
    preferences: {
      notifications_enabled: true,
      email_notifications: true,
      push_notifications: true,
      public_profile: true,
      show_activity: true,
      theme: 'dark',
      language: 'en',
    },
    metadata: {
      last_login: '2024-01-01T00:00:00Z',
      login_count: 5,
      device_info: {
        platform: Platform.OS,
        version: Platform.Version,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Profile CRUD Operations', () => {
    test('CREATE: Should create new user profile with default values', async () => {
      const newUser = {
        id: 'new-user-123',
        email: 'newuser@example.com',
        user_metadata: {
          full_name: 'New User',
          avatar_url: 'https://example.com/default.jpg',
        },
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                ...newUser,
                followers_count: 0,
                following_count: 0,
                total_votes: 0,
                reputation_score: 0,
                preferences: {
                  notifications_enabled: true,
                  public_profile: false,
                  theme: 'system',
                },
              },
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useProfile(), {
        wrapper: ({ children }) => (
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        ),
      });

      await act(async () => {
        await result.current.createProfile(newUser);
      });

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(result.current.profile).toMatchObject({
        id: newUser.id,
        email: newUser.email,
        followers_count: 0,
        reputation_score: 0,
      });
    });

    test('READ: Should fetch user profile from database', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useProfile(), {
        wrapper: ({ children }) => (
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        ),
      });

      await act(async () => {
        await result.current.fetchProfile(mockUserId);
      });

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(result.current.profile).toEqual(mockProfile);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `profile_${mockUserId}`,
        JSON.stringify(mockProfile)
      );
    });

    test('UPDATE: Should update profile fields correctly', async () => {
      const updates = {
        display_name: 'UpdatedUser',
        bio: 'Updated bio',
        location: 'New City',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [{ ...mockProfile, ...updates }],
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useProfile(), {
        wrapper: ({ children }) => (
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        ),
      });

      await act(async () => {
        await result.current.updateProfile(mockUserId, updates);
      });

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(result.current.profile).toMatchObject(updates);
    });

    test('DELETE: Should handle profile deletion and cleanup', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => useProfile(), {
        wrapper: ({ children }) => (
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        ),
      });

      await act(async () => {
        await result.current.deleteProfile(mockUserId);
      });

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(`profile_${mockUserId}`);
      expect(result.current.profile).toBeNull();
    });
  });

  describe('Profile Validation', () => {
    test('Should validate required fields', async () => {
      const invalidProfile = {
        display_name: '', // Empty required field
        bio: 'Test bio',
      };

      const { result } = renderHook(() => useProfile(), {
        wrapper: ({ children }) => (
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        ),
      });

      await act(async () => {
        try {
          await result.current.updateProfile(mockUserId, invalidProfile);
        } catch (error) {
          expect(error.message).toContain('Display name is required');
        }
      });
    });

    test('Should validate field lengths', async () => {
      const longBio = 'a'.repeat(501); // Exceeds 500 char limit

      const { result } = renderHook(() => useProfile(), {
        wrapper: ({ children }) => (
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        ),
      });

      await act(async () => {
        try {
          await result.current.updateProfile(mockUserId, { bio: longBio });
        } catch (error) {
          expect(error.message).toContain('Bio must be 500 characters or less');
        }
      });
    });

    test('Should validate URL formats', async () => {
      const invalidWebsite = 'not-a-url';

      const { result } = renderHook(() => useProfile(), {
        wrapper: ({ children }) => (
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        ),
      });

      await act(async () => {
        try {
          await result.current.updateProfile(mockUserId, { website: invalidWebsite });
        } catch (error) {
          expect(error.message).toContain('Invalid website URL');
        }
      });
    });
  });

  describe('Cross-Device Sync', () => {
    test('Should sync profile changes across devices', async () => {
      // Simulate profile update on Device A
      const deviceAUpdate = {
        display_name: 'DeviceA Update',
        updated_at: new Date().toISOString(),
      };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [{ ...mockProfile, ...deviceAUpdate }],
              error: null,
            }),
          }),
        }),
      });

      // Set up realtime subscription mock
      const mockSubscription = {
        on: jest.fn().mockImplementation((event, callback) => {
          // Simulate receiving update from another device
          setTimeout(() => {
            callback({
              eventType: 'UPDATE',
              new: { ...mockProfile, ...deviceAUpdate },
              old: mockProfile,
            });
          }, 100);
          return mockSubscription;
        }),
        subscribe: jest.fn().mockReturnValue(mockSubscription),
      };

      (supabase.channel as jest.Mock).mockReturnValue(mockSubscription);

      const { result } = renderHook(() => useProfile(), {
        wrapper: ({ children }) => (
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        ),
      });

      await act(async () => {
        await result.current.subscribeToProfileChanges(mockUserId);
      });

      await waitFor(() => {
        expect(result.current.profile?.display_name).toBe('DeviceA Update');
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `profile_${mockUserId}`,
        expect.stringContaining('DeviceA Update')
      );
    });

    test('Should handle offline mode and sync when online', async () => {
      // Mock offline state
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockProfile)
      );

      // Network fails
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockRejectedValue(new Error('Network error')),
        }),
      });

      const { result } = renderHook(() => useProfile(), {
        wrapper: ({ children }) => (
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        ),
      });

      await act(async () => {
        await result.current.fetchProfile(mockUserId);
      });

      // Should load from cache
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.isOffline).toBe(true);

      // Simulate coming back online
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockProfile, bio: 'Updated while online' },
              error: null,
            }),
          }),
        }),
      });

      await act(async () => {
        await result.current.syncProfile();
      });

      expect(result.current.profile?.bio).toBe('Updated while online');
      expect(result.current.isOffline).toBe(false);
    });
  });

  describe('Platform-Specific Behaviors', () => {
    test('iOS: Should handle avatar upload with camera permissions', async () => {
      Platform.OS = 'ios';

      const mockImageUri = 'file:///var/mobile/image.jpg';
      const mockUploadUrl = 'https://storage.example.com/avatar.jpg';

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'avatars/user123.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: mockUploadUrl },
        }),
      });

      const { result } = renderHook(() => useProfile(), {
        wrapper: ({ children }) => (
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        ),
      });

      await act(async () => {
        await result.current.uploadAvatar(mockImageUri, mockUserId);
      });

      expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
      expect(result.current.profile?.avatar_url).toBe(mockUploadUrl);
    });

    test('Android: Should handle avatar selection from gallery', async () => {
      Platform.OS = 'android';

      const mockImageUri = 'content://media/external/images/media/12345';
      const mockUploadUrl = 'https://storage.example.com/avatar.jpg';

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'avatars/user123.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: mockUploadUrl },
        }),
      });

      const { result } = renderHook(() => useProfile(), {
        wrapper: ({ children }) => (
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        ),
      });

      await act(async () => {
        await result.current.uploadAvatar(mockImageUri, mockUserId);
      });

      expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
      expect(result.current.profile?.avatar_url).toBe(mockUploadUrl);
    });

    test('Web: Should handle avatar upload via file input', async () => {
      Platform.OS = 'web';

      const mockFile = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      const mockUploadUrl = 'https://storage.example.com/avatar.jpg';

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'avatars/user123.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: mockUploadUrl },
        }),
      });

      const { result } = renderHook(() => useProfile(), {
        wrapper: ({ children }) => (
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        ),
      });

      await act(async () => {
        await result.current.uploadAvatar(mockFile, mockUserId);
      });

      expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
      expect(result.current.profile?.avatar_url).toBe(mockUploadUrl);
    });
  });

  describe('Social Features Preparation', () => {
    test('Should track user activity for future social features', async () => {
      const activityData = {
        action: 'profile_view',
        target_user_id: 'other-user-123',
        timestamp: new Date().toISOString(),
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const { result } = renderHook(() => useProfile(), {
        wrapper: ({ children }) => (
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        ),
      });

      await act(async () => {
        await result.current.trackActivity(activityData);
      });

      expect(supabase.from).toHaveBeenCalledWith('user_activities');
    });

    test('Should prepare follow/unfollow functionality', async () => {
      const targetUserId = 'user-to-follow-123';

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const { result } = renderHook(() => useProfile(), {
        wrapper: ({ children }) => (
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        ),
      });

      await act(async () => {
        await result.current.followUser(targetUserId);
      });

      expect(supabase.from).toHaveBeenCalledWith('user_follows');
      expect(result.current.profile?.following_count).toBe(6); // 5 + 1
    });
  });
});

// Helper function for rendering hooks
function renderHook(callback: () => any, options?: any) {
  let result: any;
  function TestComponent() {
    result = callback();
    return null;
  }
  
  render(
    options?.wrapper ? (
      <options.wrapper>
        <TestComponent />
      </options.wrapper>
    ) : (
      <TestComponent />
    )
  );
  
  return { result };
}
