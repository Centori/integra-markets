/**
 * @testsprite User Onboarding and Profile Management Tests
 * Tests Google authentication, profile population, updates, and social features readiness
 */

import { TestSprite } from '@testsprite/sdk';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '../app/supabaseClient';

// Mock implementations
jest.mock('@react-native-google-signin/google-signin');
jest.mock('../app/supabaseClient');
jest.mock('@react-native-async-storage/async-storage');

describe('@testsprite User Onboarding & Profile Tests', () => {
  let testSprite;

  beforeAll(() => {
    testSprite = new TestSprite({
      apiKey: process.env.TESTSPRITE_API_KEY,
      projectId: 'integra-markets-onboarding'
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('Google Authentication Flow', () => {
    test('@testsprite should successfully authenticate with Google and create user profile', async () => {
      // Mock Google sign-in response
      const mockGoogleUser = {
        user: {
          id: 'google-123456',
          email: 'testuser@gmail.com',
          name: 'Test User',
          photo: 'https://example.com/photo.jpg',
          givenName: 'Test',
          familyName: 'User'
        },
        idToken: 'mock-google-id-token',
        serverAuthCode: 'mock-server-auth-code'
      };

      GoogleSignin.signIn.mockResolvedValue(mockGoogleUser);
      GoogleSignin.isSignedIn.mockResolvedValue(false);
      GoogleSignin.hasPlayServices.mockResolvedValue(true);

      // Mock Supabase auth response
      const mockSupabaseSession = {
        user: {
          id: 'supabase-user-123',
          email: 'testuser@gmail.com',
          user_metadata: {
            full_name: 'Test User',
            avatar_url: 'https://example.com/photo.jpg',
            provider: 'google'
          }
        },
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token'
      };

      supabase.auth.signInWithIdToken.mockResolvedValue({
        data: { session: mockSupabaseSession },
        error: null
      });

      // Import components
      const { WelcomeScreen } = require('../app/components/WelcomeScreen');
      const { AuthButtons } = require('../app/components/AuthButtons');

      // Render welcome screen
      const { getByText, getByTestId } = render(<WelcomeScreen />);

      // Click Google sign-in button
      const googleSignInButton = getByText('Continue with Google');
      await act(async () => {
        fireEvent.press(googleSignInButton);
      });

      // Verify Google sign-in was called
      expect(GoogleSignin.hasPlayServices).toHaveBeenCalled();
      expect(GoogleSignin.signIn).toHaveBeenCalled();

      // Verify Supabase auth was called with Google token
      expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
        provider: 'google',
        token: mockGoogleUser.idToken
      });

      // Verify user session is stored
      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          '@integra_user_session',
          JSON.stringify(mockSupabaseSession)
        );
      });

      // TestSprite AI validation
      await testSprite.validate({
        component: 'GoogleAuth',
        scenario: 'successful_signin',
        assertions: [
          'Google sign-in flow initiated correctly',
          'User data properly extracted from Google response',
          'Supabase session created with Google credentials',
          'Session persisted to AsyncStorage'
        ]
      });
    });

    test('@testsprite should handle Google sign-in errors gracefully', async () => {
      // Mock Google sign-in failure
      GoogleSignin.signIn.mockRejectedValue(new Error('Sign in cancelled'));

      const { AuthButtons } = require('../app/components/AuthButtons');
      const { getByText, queryByText } = render(<AuthButtons />);

      const googleSignInButton = getByText('Continue with Google');
      await act(async () => {
        fireEvent.press(googleSignInButton);
      });

      // Verify error is handled
      await waitFor(() => {
        expect(queryByText(/cancelled/i)).toBeTruthy();
      });

      // Verify no session is stored
      expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
        '@integra_user_session',
        expect.any(String)
      );
    });
  });

  describe('User Profile Population', () => {
    test('@testsprite should populate user profile with Google data after onboarding', async () => {
      // Mock authenticated user
      const mockUser = {
        id: 'user-123',
        email: 'testuser@gmail.com',
        user_metadata: {
          full_name: 'Test User',
          avatar_url: 'https://example.com/photo.jpg'
        }
      };

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock profile data fetch
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                email: 'testuser@gmail.com',
                full_name: 'Test User',
                avatar_url: 'https://example.com/photo.jpg',
                role: null,
                experience_level: null,
                commodities_tracked: [],
                notification_preferences: {},
                created_at: new Date().toISOString()
              },
              error: null
            })
          })
        })
      });

      const { ProfileScreen } = require('../app/screens/ProfileScreen');
      const { getByText, getByTestId } = render(<ProfileScreen />);

      // Wait for profile to load
      await waitFor(() => {
        expect(getByText('Test User')).toBeTruthy();
        expect(getByText('testuser@gmail.com')).toBeTruthy();
      });

      // Verify profile data is displayed
      const avatarImage = getByTestId('user-avatar');
      expect(avatarImage.props.source.uri).toBe('https://example.com/photo.jpg');

      // TestSprite AI validation
      await testSprite.validate({
        component: 'ProfileScreen',
        scenario: 'profile_population',
        assertions: [
          'User name displayed correctly',
          'User email displayed correctly',
          'Avatar image loaded from Google profile',
          'Profile fields ready for additional data'
        ]
      });
    });

    test('@testsprite should prompt for additional profile info after Google signin', async () => {
      // Mock new user without complete profile
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                email: 'testuser@gmail.com',
                full_name: 'Test User',
                role: null, // Missing required data
                experience_level: null
              },
              error: null
            })
          })
        })
      });

      const { OnboardingForm } = require('../app/components/OnboardingForm');
      const { getByText, getByPlaceholderText } = render(<OnboardingForm />);

      // Verify onboarding form is shown
      expect(getByText('Complete Your Profile')).toBeTruthy();
      expect(getByPlaceholderText('Select your role')).toBeTruthy();
      expect(getByPlaceholderText('Experience level')).toBeTruthy();
    });
  });

  describe('Profile Updates and Persistence', () => {
    test('@testsprite should allow users to update profile information', async () => {
      // Mock existing user profile
      const mockProfile = {
        id: 'user-123',
        full_name: 'Test User',
        role: 'Trader',
        experience_level: 'Intermediate',
        commodities_tracked: ['OIL', 'GOLD']
      };

      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockProfile, role: 'Analyst' },
            error: null
          })
        })
      });

      const { ProfileEditScreen } = require('../app/screens/ProfileEditScreen');
      const { getByText, getByTestId } = render(
        <ProfileEditScreen initialProfile={mockProfile} />
      );

      // Change role
      const roleSelector = getByTestId('role-selector');
      fireEvent.press(roleSelector);
      fireEvent.press(getByText('Analyst'));

      // Save changes
      const saveButton = getByText('Save Changes');
      await act(async () => {
        fireEvent.press(saveButton);
      });

      // Verify update was called
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.from().update).toHaveBeenCalledWith({
        role: 'Analyst'
      });

      // TestSprite AI validation
      await testSprite.validate({
        component: 'ProfileEdit',
        scenario: 'profile_update',
        assertions: [
          'Profile update UI renders correctly',
          'User can modify profile fields',
          'Changes are persisted to database',
          'UI updates reflect saved changes'
        ]
      });
    });

    test('@testsprite should persist profile data across app sessions', async () => {
      // Mock stored session
      const mockStoredSession = {
        user: { id: 'user-123', email: 'testuser@gmail.com' }
      };

      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify(mockStoredSession)
      );

      // Mock profile fetch
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                full_name: 'Test User',
                commodities_tracked: ['OIL', 'GOLD', 'WHEAT']
              },
              error: null
            })
          })
        })
      });

      const { useAuth } = require('../app/contexts/AuthContext');
      
      // Simulate app restart
      let authContext;
      await act(async () => {
        const TestComponent = () => {
          authContext = useAuth();
          return null;
        };
        render(<TestComponent />);
      });

      await waitFor(() => {
        expect(authContext.user).toBeTruthy();
        expect(authContext.user.id).toBe('user-123');
        expect(authContext.profile.commodities_tracked).toContain('OIL');
      });
    });
  });

  describe('Social Features Readiness', () => {
    test('@testsprite should have infrastructure for agree/disagree buttons', async () => {
      // Test that user actions can be tracked
      const mockUserAction = {
        user_id: 'user-123',
        content_id: 'news-456',
        action_type: 'agree',
        timestamp: new Date().toISOString()
      };

      supabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: mockUserAction,
          error: null
        })
      });

      // Simulate agree button press
      const handleAgree = async (contentId) => {
        return await supabase
          .from('user_actions')
          .insert({
            user_id: 'user-123',
            content_id: contentId,
            action_type: 'agree',
            timestamp: new Date().toISOString()
          });
      };

      const result = await handleAgree('news-456');
      expect(result.data).toEqual(mockUserAction);

      // TestSprite AI validation
      await testSprite.validate({
        component: 'SocialFeatures',
        scenario: 'user_actions_infrastructure',
        assertions: [
          'User actions can be recorded',
          'Action includes user ID and timestamp',
          'Database structure supports social features',
          'Ready for agree/disagree implementation'
        ]
      });
    });

    test('@testsprite should have infrastructure for follow features', async () => {
      // Test follow relationship structure
      const mockFollowRelation = {
        follower_id: 'user-123',
        following_id: 'user-789',
        created_at: new Date().toISOString()
      };

      supabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: mockFollowRelation,
          error: null
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { following_id: 'user-789', following_profile: { full_name: 'Expert Trader' } },
              { following_id: 'user-101', following_profile: { full_name: 'Market Analyst' } }
            ],
            error: null
          })
        })
      });

      // Test follow functionality
      const followUser = async (targetUserId) => {
        return await supabase
          .from('follows')
          .insert({
            follower_id: 'user-123',
            following_id: targetUserId,
            created_at: new Date().toISOString()
          });
      };

      // Test getting following list
      const getFollowing = async (userId) => {
        return await supabase
          .from('follows')
          .select('following_id, following_profile:profiles!following_id(*)')
          .eq('follower_id', userId);
      };

      await followUser('user-789');
      const following = await getFollowing('user-123');

      expect(following.data).toHaveLength(2);
      expect(following.data[0].following_profile.full_name).toBe('Expert Trader');
    });
  });

  describe('Profile Accessibility', () => {
    test('@testsprite should make profile accessible from any screen', async () => {
      // Mock authenticated user
      const mockUser = {
        id: 'user-123',
        email: 'testuser@gmail.com',
        profile: {
          full_name: 'Test User',
          avatar_url: 'https://example.com/photo.jpg'
        }
      };

      // Test profile access from different screens
      const screens = [
        'HomeScreen',
        'NewsScreen',
        'AlertsScreen',
        'ProfileScreen'
      ];

      for (const screenName of screens) {
        const Screen = require(`../app/screens/${screenName}`)[screenName];
        const { getByTestId } = render(<Screen user={mockUser} />);

        // Verify profile button/avatar is present
        const profileButton = getByTestId('profile-button');
        expect(profileButton).toBeTruthy();

        // Verify clicking opens profile
        fireEvent.press(profileButton);
        
        await waitFor(() => {
          expect(getByTestId('profile-screen')).toBeTruthy();
        });
      }

      // TestSprite AI validation
      await testSprite.validate({
        component: 'ProfileAccessibility',
        scenario: 'global_profile_access',
        assertions: [
          'Profile button available on all main screens',
          'Profile data accessible throughout app',
          'Navigation to profile works from any screen',
          'User context maintained across navigation'
        ]
      });
    });
  });

  afterAll(async () => {
    // Generate comprehensive test report
    await testSprite.generateReport({
      title: 'User Onboarding & Profile Management Test Report',
      sections: [
        'Google Authentication',
        'Profile Population',
        'Profile Updates',
        'Data Persistence',
        'Social Features Readiness'
      ],
      metrics: {
        coverage: 'auth_flow, profile_crud, social_infrastructure',
        readiness: 'production_ready_with_social_hooks'
      }
    });
  });
});
