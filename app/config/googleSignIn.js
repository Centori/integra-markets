/**
 * Google Sign-In Configuration
 * 
 * To set up Google Sign-In:
 * 
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing one
 * 3. Enable Google Sign-In API
 * 4. Create OAuth 2.0 credentials:
 *    - iOS: Create an iOS OAuth client ID
 *    - Android: Create an Android OAuth client ID  
 *    - Web: Create a Web OAuth client ID (needed for ID tokens)
 * 
 * 5. For iOS:
 *    - Add the reversed client ID to your app's URL schemes in Info.plist
 *    - Format: com.googleusercontent.apps.YOUR_CLIENT_ID
 * 
 * 6. For Android:
 *    - Add your SHA-1 fingerprint to the Android OAuth client
 *    - The package name must match your app's package name
 */

export const googleSignInConfig = {
  // iOS OAuth client ID from Google Cloud Console
  iosClientId: process.env.GOOGLE_IOS_CLIENT_ID || 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  
  // Android OAuth client ID from Google Cloud Console (not needed for iOS builds)
  androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID || 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  
  // Web OAuth client ID (needed for getting ID tokens)
  webClientId: process.env.GOOGLE_WEB_CLIENT_ID || 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  
  // Scopes to request from Google
  scopes: ['profile', 'email'],
  
  // Request offline access for refresh tokens
  offlineAccess: true,
  
  // Force account selection even if only one account
  forceCodeForRefreshToken: true,
};

// Helper to check if Google Sign-In is properly configured
export const isGoogleSignInConfigured = () => {
  const hasIosId = googleSignInConfig.iosClientId && 
                   !googleSignInConfig.iosClientId.includes('YOUR_IOS_CLIENT_ID');
  const hasWebId = googleSignInConfig.webClientId && 
                   !googleSignInConfig.webClientId.includes('YOUR_WEB_CLIENT_ID');
  
  // For iOS, we need both iOS and Web client IDs
  return hasIosId && hasWebId;
};
