import { supabase } from '@/lib/supabase';

export class AuthService {
  /**
   * Send password reset email
   * @param email User's email address
   */
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending password reset:', error);
      return {
        success: false,
        error: error.message || 'Failed to send password reset email',
      };
    }
  }

  /**
   * Reset password with new password
   * @param newPassword New password to set
   */
  async resetPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error resetting password:', error);
      return {
        success: false,
        error: error.message || 'Failed to reset password',
      };
    }
  }

  /**
   * Send email verification link
   * @param email User's email address
   */
  async sendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending verification email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send verification email',
      };
    }
  }

  /**
   * Check if email is verified
   */
  async isEmailVerified(): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user?.email_confirmed_at != null;
    } catch (error) {
      console.error('Error checking email verification:', error);
      return false;
    }
  }

  /**
   * Handle password reset callback
   * Called when user clicks reset password link in email
   */
  async handlePasswordResetCallback(type: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (type !== 'recovery') {
        throw new Error('Invalid recovery flow type');
      }

      const { error } = await supabase.auth.verifyOtp({
        token,
        type,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error handling password reset:', error);
      return {
        success: false,
        error: error.message || 'Failed to process password reset',
      };
    }
  }
}

export const authService = new AuthService();