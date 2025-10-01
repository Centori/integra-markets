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
      // First check Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Error fetching auth user:', authError);
        return null;
      }

      // Then get the profile data from Supabase
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return null;
      }

      // Combine auth and profile data
      return {
        id: user.id,
        email: user.email!,
        username: profile?.username || user.email!.split('@')[0],
        fullName: profile?.full_name || '',
        role: profile?.role,
        institution: profile?.institution,
        bio: profile?.bio,
        marketFocus: profile?.market_focus,
        experience: profile?.experience,
        profilePhoto: profile?.profile_photo_url
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

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          ...profileData,
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