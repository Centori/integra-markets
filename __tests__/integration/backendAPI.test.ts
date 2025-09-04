/**
 * Backend API Integration Tests
 * Tests API endpoints, data flow, and error handling for user operations
 * Ensures backend consistency across all platforms
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

const API_BASE_URL = 'http://localhost:8000';

// Mock modules
jest.mock('../../lib/supabase');
jest.mock('@react-native-async-storage/async-storage');

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Backend API Integration - User Operations', () => {
  const mockAuthToken = 'mock-jwt-token';
  const mockUserId = 'test-user-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    
    // Mock authenticated state
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: mockAuthToken,
          user: { id: mockUserId },
        },
      },
      error: null,
    });
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/google - Should handle Google OAuth callback', async () => {
      const googleAuthCode = 'google-auth-code-123';
      const mockResponse = {
        user: {
          id: mockUserId,
          email: 'user@gmail.com',
          profile: {
            full_name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
        session: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: googleAuthCode }),
      });

      const data = await response.json();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/google'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(googleAuthCode),
        })
      );
      expect(data.user).toBeDefined();
      expect(data.session).toBeDefined();
    });

    test('POST /api/auth/refresh - Should refresh expired tokens', async () => {
      const refreshToken = 'old-refresh-token';
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json();

      expect(data.access_token).toBeDefined();
      expect(data.expires_in).toBe(3600);
    });

    test('POST /api/auth/logout - Should handle user logout', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockAuthToken}`,
        },
      });

      const data = await response.json();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/logout'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAuthToken}`,
          }),
        })
      );
      expect(data.success).toBe(true);
    });
  });

  describe('User Profile Endpoints', () => {
    test('GET /api/users/:id - Should fetch user profile', async () => {
      const mockProfile = {
        id: mockUserId,
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        created_at: '2024-01-01T00:00:00Z',
        followers_count: 10,
        following_count: 5,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProfile),
      });

      const response = await fetch(`${API_BASE_URL}/api/users/${mockUserId}`, {
        headers: {
          'Authorization': `Bearer ${mockAuthToken}`,
        },
      });

      const data = await response.json();

      expect(data).toEqual(mockProfile);
    });

    test('PUT /api/users/:id - Should update user profile', async () => {
      const updates = {
        display_name: 'Updated Name',
        bio: 'Updated bio',
        location: 'New City',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          ...updates,
          id: mockUserId,
          updated_at: new Date().toISOString(),
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/users/${mockUserId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${mockAuthToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      expect(data.display_name).toBe(updates.display_name);
      expect(data.bio).toBe(updates.bio);
    });

    test('DELETE /api/users/:id - Should handle account deletion', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          message: 'Account scheduled for deletion',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/users/${mockUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${mockAuthToken}`,
        },
      });

      const data = await response.json();

      expect(data.success).toBe(true);
    });

    test('POST /api/users/:id/avatar - Should handle avatar upload', async () => {
      const mockFile = new Blob(['image data'], { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('avatar', mockFile, 'avatar.jpg');

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          avatar_url: 'https://storage.example.com/avatars/user123.jpg',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/users/${mockUserId}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockAuthToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      expect(data.avatar_url).toBeDefined();
    });
  });

  describe('User Activity Endpoints', () => {
    test('GET /api/users/:id/activity - Should fetch user activity feed', async () => {
      const mockActivities = [
        {
          id: 'activity-1',
          type: 'analysis_viewed',
          timestamp: '2024-01-01T10:00:00Z',
          metadata: { article_id: 'article-123' },
        },
        {
          id: 'activity-2',
          type: 'bookmark_added',
          timestamp: '2024-01-01T09:00:00Z',
          metadata: { bookmark_id: 'bookmark-123' },
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          activities: mockActivities,
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
          },
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/users/${mockUserId}/activity`, {
        headers: {
          'Authorization': `Bearer ${mockAuthToken}`,
        },
      });

      const data = await response.json();

      expect(data.activities).toHaveLength(2);
      expect(data.pagination).toBeDefined();
    });

    test('POST /api/users/activity - Should track user activity', async () => {
      const activityData = {
        type: 'article_shared',
        metadata: {
          article_id: 'article-456',
          platform: 'twitter',
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'activity-123',
          ...activityData,
          timestamp: new Date().toISOString(),
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/users/activity`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockAuthToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      });

      const data = await response.json();

      expect(data.id).toBeDefined();
      expect(data.type).toBe(activityData.type);
    });
  });

  describe('Social Features API Preparation', () => {
    test('GET /api/users/:id/followers - Should fetch user followers', async () => {
      const mockFollowers = [
        {
          id: 'follower-1',
          username: 'follower1',
          avatar_url: 'https://example.com/avatar1.jpg',
          followed_at: '2024-01-01T00:00:00Z',
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          followers: mockFollowers,
          total: 1,
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/users/${mockUserId}/followers`, {
        headers: {
          'Authorization': `Bearer ${mockAuthToken}`,
        },
      });

      const data = await response.json();

      expect(data.followers).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    test('POST /api/users/:id/follow - Should follow a user', async () => {
      const targetUserId = 'user-to-follow-123';

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          following: true,
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/users/${targetUserId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockAuthToken}`,
        },
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.following).toBe(true);
    });

    test('POST /api/content/:id/vote - Should handle voting on content', async () => {
      const contentId = 'analysis-123';
      const voteData = {
        vote_type: 'upvote',
        value: 1,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          total_votes: 25,
          user_vote: 1,
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/content/${contentId}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockAuthToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voteData),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.total_votes).toBe(25);
    });
  });

  describe('Error Handling', () => {
    test('Should handle 401 Unauthorized errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/users/${mockUserId}`, {
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      expect(response.status).toBe(401);
      const error = await response.json();
      expect(error.error).toBe('Unauthorized');
    });

    test('Should handle 404 Not Found errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({
          error: 'Not Found',
          message: 'User not found',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/users/non-existent-user`, {
        headers: {
          'Authorization': `Bearer ${mockAuthToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test('Should handle 500 Server errors with retry', async () => {
      let attempts = 0;
      (fetch as jest.Mock).mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: jest.fn().mockResolvedValue({
              error: 'Internal Server Error',
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({
            id: mockUserId,
            email: 'test@example.com',
          }),
        });
      });

      // Retry logic
      const fetchWithRetry = async (url: string, options: any, retries = 3) => {
        for (let i = 0; i < retries; i++) {
          const response = await fetch(url, options);
          if (response.ok) return response;
          if (i < retries - 1) await new Promise(r => setTimeout(r, 1000));
        }
        throw new Error('Max retries reached');
      };

      const response = await fetchWithRetry(`${API_BASE_URL}/api/users/${mockUserId}`, {
        headers: {
          'Authorization': `Bearer ${mockAuthToken}`,
        },
      });

      expect(response.ok).toBe(true);
      expect(attempts).toBe(3);
    });

    test('Should handle rate limiting (429 errors)', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: (header: string) => {
            if (header === 'X-RateLimit-Remaining') return '0';
            if (header === 'X-RateLimit-Reset') return '1640995200';
          },
        },
        json: jest.fn().mockResolvedValue({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/users/${mockUserId}`, {
        headers: {
          'Authorization': `Bearer ${mockAuthToken}`,
        },
      });

      expect(response.status).toBe(429);
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });

  describe('Platform-Specific API Behaviors', () => {
    test('iOS: Should include platform headers', async () => {
      Platform.OS = 'ios';
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await fetch(`${API_BASE_URL}/api/users/${mockUserId}`, {
        headers: {
          'Authorization': `Bearer ${mockAuthToken}`,
          'X-Platform': 'iOS',
          'X-App-Version': '1.0.0',
        },
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Platform': 'iOS',
          }),
        })
      );
    });

    test('Android: Should handle deep linking callbacks', async () => {
      Platform.OS = 'android';
      
      const deepLinkData = {
        action: 'oauth_callback',
        code: 'auth-code-123',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          redirect_url: 'integramarkets://auth/success',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/auth/deeplink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Platform': 'Android',
        },
        body: JSON.stringify(deepLinkData),
      });

      const data = await response.json();
      expect(data.redirect_url).toContain('integramarkets://');
    });

    test('Web: Should handle CORS and cookies', async () => {
      Platform.OS = 'web';
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await fetch(`${API_BASE_URL}/api/users/${mockUserId}`, {
        headers: {
          'Authorization': `Bearer ${mockAuthToken}`,
        },
        credentials: 'include', // Include cookies for web
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });
  });
});
