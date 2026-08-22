import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role?: string;
  institution?: string;
  bio?: string;
  marketFocus?: string[];
  experience?: string;
  profilePhoto?: string;
}

class UserService {
  private static PROFILE_STORAGE_KEY = '@user_profile';
  private static ONBOARDING_STORAGE_KEY = '@onboarding_completed';

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      // Use getSession() (reads the persisted session from AsyncStorage) NOT
      // getUser() (a network round-trip to the auth server with no timeout that
      // can hang indefinitely on React Native). A hung getUser() was freezing
      // the Profile tab on "Loading…" forever — the promise never settled, so
      // the loading flag never cleared. App.js already established the session
      // locally; a local read here is both correct and instant.
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      const user = session?.user;
      if (authError || !user) {
        console.error('Error fetching auth session:', authError);
        return null;
      }

      // Then get the profile data from Supabase. maybeSingle() (not single())
      // so a MISSING profile row returns null instead of throwing PGRST116 —
      // a signed-in user with no profile row should still get a usable profile
      // built from their auth record, not a hard failure.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching user profile (continuing from auth):', profileError);
        // fall through — build from the auth user below rather than returning null
      }

      // Combine auth and profile data
      return {
        id: user.id,
        email: user.email!,
        username: profile?.username || user.email!.split('@')[0],
        fullName: profile?.full_name || '',
        role: profile?.role,
        institution: profile?.company,
        bio: profile?.bio,
        marketFocus: profile?.market_focus,
        experience: profile?.experience_level,
        profilePhoto: profile?.avatar_url
      };
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return null;
    }
  }

  async updateUserProfile(profileData: Partial<UserProfile>): Promise<boolean> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // Translate UserProfile fields to live `profiles` column names —
      // camelCase keys spread straight into the upsert would 400 on PostgREST.
      const columnMap: Record<string, string> = {
        username: 'username',
        fullName: 'full_name',
        role: 'role',
        institution: 'company',
        bio: 'bio',
        marketFocus: 'market_focus',
        experience: 'experience_level',
        profilePhoto: 'avatar_url',
      };
      const row: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(profileData)) {
        if (columnMap[key] && value !== undefined) row[columnMap[key]] = value;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...row,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      // Update local storage
      await this.saveProfileToStorage(profileData);
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  async saveOnboardingData(data: any): Promise<boolean> {
    try {
      const success = await this.updateUserProfile(data);
      if (success) {
        await AsyncStorage.setItem(UserService.ONBOARDING_STORAGE_KEY, 'true');
      }
      return success;
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      return false;
    }
  }

  private async saveProfileToStorage(profile: Partial<UserProfile>): Promise<void> {
    try {
      const currentProfile = await this.getProfileFromStorage();
      const updatedProfile = { ...currentProfile, ...profile };
      await AsyncStorage.setItem(
        UserService.PROFILE_STORAGE_KEY,
        JSON.stringify(updatedProfile)
      );
    } catch (error) {
      console.error('Error saving profile to storage:', error);
    }
  }

  private async getProfileFromStorage(): Promise<Partial<UserProfile>> {
    try {
      const profile = await AsyncStorage.getItem(UserService.PROFILE_STORAGE_KEY);
      return profile ? JSON.parse(profile) : {};
    } catch (error) {
      console.error('Error getting profile from storage:', error);
      return {};
    }
  }

  async isOnboardingCompleted(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(UserService.ONBOARDING_STORAGE_KEY);
      return completed === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }
}

export const userService = new UserService();