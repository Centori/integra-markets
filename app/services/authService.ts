import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  statusCodes as GoogleStatusCodes,
} from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';

// iOS client ID derived from the iosUrlScheme registered in app.json
// (com.googleusercontent.apps.1039046627332-nk0jejccajfd9u63p5kas0l5ps53nlsq).
const GOOGLE_IOS_CLIENT_ID =
  '1039046627332-nk0jejccajfd9u63p5kas0l5ps53nlsq.apps.googleusercontent.com';

let _googleSigninConfigured = false;
function ensureGoogleSigninConfigured() {
  if (_googleSigninConfigured) return;
  GoogleSignin.configure({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    // webClientId will be needed for Android — when adding that, set
    // EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and read it here.
  });
  _googleSigninConfigured = true;
}

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  emailConfirmed: boolean;
};

export type AuthOutcome = {
  success: boolean;
  error?: string;
  /** The real Supabase user — screens must use this id, never a fabricated one. */
  user?: AuthUser;
  /** Sign-up succeeded but a session does NOT yet exist: the user must click
   *  the confirmation link before they can sign in. */
  requiresConfirmation?: boolean;
  /** Sign-in failed specifically because the email hasn't been confirmed yet. */
  needsEmailConfirmation?: boolean;
};

/** Normalize a Supabase user object into the shape the app's screens consume. */
function mapAuthUser(
  user:
    | {
        id: string;
        email?: string;
        email_confirmed_at?: string | null;
        user_metadata?: Record<string, unknown>;
      }
    | null
    | undefined,
): AuthUser | undefined {
  if (!user) return undefined;
  const meta = user.user_metadata ?? {};
  const fullName = (meta.full_name as string) || (meta.name as string) || '';
  return {
    id: user.id,
    email: user.email ?? '',
    fullName,
    emailConfirmed: user.email_confirmed_at != null,
  };
}

export class AuthService {
  /**
   * Email/password sign-in (the existing path AuthLoadingScreen has always
   * called but was never implemented here). Returns success + the typed
   * AuthOutcome.
   */
  async signInWithEmail(email: string, password: string): Promise<AuthOutcome> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Distinguish "email not yet confirmed" so the UI can prompt the user
        // to check their inbox instead of showing a generic failure.
        if (
          (error as { code?: string }).code === 'email_not_confirmed' ||
          /not confirmed/i.test(error.message ?? '')
        ) {
          return { success: false, error: error.message, needsEmailConfirmation: true };
        }
        throw error;
      }
      return { success: true, user: mapAuthUser(data.user) };
    } catch (error: any) {
      console.error('Error signing in with email:', error);
      return { success: false, error: error?.message ?? 'sign_in_failed' };
    }
  }

  /**
   * Email/password sign-up. Apple guideline 5.1.1(v) requires that any
   * account-creation path also has a corresponding in-app deletion path —
   * see app/services/accountService.ts for the matching deletion flow.
   */
  async signUpWithEmail(
    email: string,
    password: string,
    userData?: Record<string, unknown>,
  ): Promise<AuthOutcome> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: userData ? { data: userData } : undefined,
      });
      if (error) throw error;
      // When the project requires email confirmation, Supabase returns a user
      // record but NO session — the account isn't usable until the link is
      // clicked. Signal that so the UI shows "check your email" rather than
      // dropping the user into a session-less, broken "logged in" state.
      return {
        success: true,
        user: mapAuthUser(data.user),
        requiresConfirmation: !data.session,
      };
    } catch (error: any) {
      console.error('Error signing up with email:', error);
      return { success: false, error: error?.message ?? 'sign_up_failed' };
    }
  }

  /**
   * Sign in with Apple (iOS only).
   *
   * Apple guideline 4.8 requires offering an equivalent login option to any
   * third-party login. The flow:
   *   1. expo-apple-authentication shows the native sheet (Face/Touch ID).
   *   2. Apple returns an identityToken (JWT signed by Apple).
   *   3. We exchange the JWT for a Supabase session via signInWithIdToken.
   *   4. If first sign-in, Apple returns fullName once — persist to
   *      user_profiles. Subsequent sign-ins return user identifier only.
   *
   * Edge cases:
   *   - Private-relay email (xxx@privaterelay.appleid.com) — Supabase accepts.
   *   - User cancels — returns success: false with error: 'cancelled'; this
   *     is NOT an error condition for telemetry, just a no-op.
   *   - Non-iOS platforms — returns 'unavailable'; the button should be
   *     hidden via isAvailable() before invoking this.
   */
  async signInWithApple(): Promise<AuthOutcome> {
    if (Platform.OS !== 'ios') {
      return { success: false, error: 'unavailable' };
    }
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { success: false, error: 'missing_identity_token' };
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;

      await persistAppleNameIfFirstSignIn(credential, data.user?.id);

      // Apple only returns the name on first sign-in; merge it in so the
      // profile isn't blank before the user_metadata has populated.
      const mapped = mapAuthUser(data.user);
      const appleName = [
        credential.fullName?.givenName,
        credential.fullName?.familyName,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();
      return {
        success: true,
        user: mapped ? { ...mapped, fullName: mapped.fullName || appleName } : mapped,
      };
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        return { success: false, error: 'cancelled' };
      }
      console.error('Error signing in with Apple:', error);
      return { success: false, error: error?.message ?? 'apple_sign_in_failed' };
    }
  }

  /**
   * Sign in with Google.
   *
   * On iOS we use the native Google Sign-In SDK — pops the iOS account picker
   * sheet, returns an idToken without ever opening a browser, then exchanges
   * it for a Supabase session via signInWithIdToken. Result: the user never
   * sees the Supabase project URL (zhdcpiopihqwcmicjpca.supabase.co) — only
   * Google's native UI.
   *
   * On web we fall back to Supabase's redirect-based OAuth (no native SDK
   * available there). The redirect URL is `integra://auth/callback` for the
   * mobile deep-link, or the current origin's /auth/callback on web.
   */
  async signInWithGoogle(): Promise<AuthOutcome> {
    if (Platform.OS === 'web') {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            skipBrowserRedirect: false,
          },
        });
        if (error) throw error;
        return { success: true };
      } catch (error: any) {
        console.error('Error signing in with Google (web):', error);
        return { success: false, error: error?.message ?? 'google_sign_in_failed' };
      }
    }

    try {
      ensureGoogleSigninConfigured();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result: any = await GoogleSignin.signIn();
      // v15 wraps the user payload under `data`; older versions return it flat.
      const idToken: string | undefined =
        result?.data?.idToken ?? result?.idToken;
      if (!idToken) {
        return { success: false, error: 'missing_identity_token' };
      }
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw error;
      return { success: true, user: mapAuthUser(data.user) };
    } catch (error: any) {
      if (
        error?.code === GoogleStatusCodes?.SIGN_IN_CANCELLED ||
        error?.code === 'SIGN_IN_CANCELLED'
      ) {
        return { success: false, error: 'cancelled' };
      }
      console.error('Error signing in with Google:', error);
      return { success: false, error: error?.message ?? 'google_sign_in_failed' };
    }
  }

  /**
   * True only on iOS 13+ where the native Sign in with Apple UI is
   * available. Use this to hide the button on Android/web.
   */
  async isAppleSignInAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    try {
      return await AppleAuthentication.isAvailableAsync();
    } catch {
      return false;
    }
  }

  /**
   * Send password reset email
   * @param email User's email address
   */
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // window.location only exists on web; on native use the app deep link
      // so password reset doesn't throw a ReferenceError.
      const redirectTo =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/auth/reset-password`
          : 'integra://auth/reset-password';
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
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

/**
 * Apple returns the user's full name ONLY on the very first sign-in. If we
 * don't persist it then, it's lost forever. This helper updates
 * public.profiles.full_name when Apple provides it; otherwise no-op.
 */
async function persistAppleNameIfFirstSignIn(
  credential: AppleAuthentication.AppleAuthenticationCredential,
  userId: string | undefined,
): Promise<void> {
  if (!userId) return;
  const given = credential.fullName?.givenName?.trim();
  const family = credential.fullName?.familyName?.trim();
  const fullName = [given, family].filter(Boolean).join(' ').trim();
  if (!fullName) return;

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', userId);

  if (error) {
    // Non-fatal — sign-in still succeeded. Log for diagnostics.
    console.warn('Failed to persist Apple full name:', error.message);
  }
}