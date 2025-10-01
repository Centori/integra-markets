# Android Submission Guide - Google Play Store

## Pre-Submission Checklist

### ✅ API Keys Configuration (Same as iOS)
The same API keys in `app.json` work for both iOS and Android:
- [x] `EXPO_PUBLIC_GROQ_API_KEY` - Works on Android
- [x] `EXPO_PUBLIC_SUPABASE_URL` - Works on Android
- [x] `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Works on Android
- [x] Models updated to use `llama-3.3-70b-versatile` - Works on Android

### ✅ Android-Specific Configuration
Check `app.json` for Android settings:
```json
"android": {
  "package": "com.centori.integramarkets",
  "versionCode": 3,  // Increment for each upload
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#000000"
  },
  "permissions": [
    "android.permission.CAMERA",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.USE_FINGERPRINT"
  ]
}
```

## Building for Android

### Step 1: Build the APK/AAB
```bash
# Build Android App Bundle (AAB) for Play Store
eas build --platform android --profile production

# Or build APK for testing
eas build --platform android --profile preview
```

### Step 2: Download the Build
```bash
# The build URL will be shown after completion
# Download the .aab file for Play Store submission
```

## Google Play Console Setup

### 1. Create/Access Your App
- Go to [Google Play Console](https://play.google.com/console)
- Create new app or select existing "Integra Markets"

### 2. Internal Testing Track (Recommended First)
```bash
# Submit to internal testing first
eas submit --platform android --latest

# Or manually upload:
# Play Console > Testing > Internal testing > Create new release
# Upload the .aab file
```

### 3. Required Store Listing Information
- **App name**: Integra Markets
- **Short description** (80 chars): Professional commodities trading news & AI analysis
- **Full description** (4000 chars):
```
Integra Markets - Your Professional Commodities Trading Companion

Stay ahead of the markets with real-time news, AI-powered analysis, and sentiment tracking for commodities trading.

KEY FEATURES:

📊 Real-Time Market Data
• Live prices for Oil, Gold, Wheat, Natural Gas, and more
• Price charts and technical indicators
• Market trend analysis

🤖 AI-Powered Analysis (Groq Integration)
• Instant AI insights on market news
• Ask questions about any article
• Get trading signals and risk assessments
• Powered by advanced Llama 3.3 70B model

📰 Curated News Feed
• Breaking news from trusted sources
• Sentiment analysis for each article
• Filter by commodity or sentiment
• Save articles for later

🔔 Smart Alerts
• Price movement notifications
• Sentiment shift alerts
• Breaking news alerts
• Customizable thresholds

📈 Professional Tools
• Portfolio tracking
• Risk management insights
• Historical data analysis
• Export reports

Perfect for:
• Commodities traders
• Financial analysts
• Market researchers
• Anyone interested in commodity markets

No subscription required for basic features. Premium features available for advanced traders.

Note: This app provides market information and analysis tools. Not financial advice.
```

### 4. Screenshots (Required)
You need at least 2 screenshots for each device type:
```bash
# Phone screenshots (required)
- Dimensions: 1080 x 1920 pixels minimum
- Format: JPEG or 24-bit PNG

# Tablet screenshots (optional but recommended)
- Dimensions: 1920 x 1080 pixels minimum
```

### 5. App Icon
- **Size**: 512 x 512 pixels
- **Format**: 32-bit PNG
- Already configured in `./assets/icon.png`

### 6. Feature Graphic (Optional)
- **Size**: 1024 x 500 pixels
- Used in Play Store listings

## Android-Specific Groq Integration

### Network Security Configuration
Android requires special configuration for API calls. Check that `app.json` includes:

```json
"android": {
  "intentFilters": [
    {
      "action": "VIEW",
      "data": [{
        "scheme": "https"
      }]
    }
  ]
}
```

### Testing on Android

#### Option A: Using Android Emulator
```bash
# Start Android emulator
npm run android

# Or with Expo
expo start --android
```

#### Option B: Physical Device Testing
```bash
# Generate APK for testing
eas build --platform android --profile preview

# Install on device
adb install app-release.apk
```

## Testing Groq on Android

### Test Script for Android Compatibility
```bash
# The same test script works for Android
python3 test_fixed_connection.py

# Backend is optional - Android app works with:
# - Direct Groq API calls
# - Mock data fallback
# - Same as iOS behavior
```

## Play Store Release Process

### 1. Internal Testing (1-2 days)
```bash
# Build and submit
eas build --platform android --profile production
eas submit --platform android --latest

# Add internal testers (up to 100)
# Test core features especially:
# - Groq AI chat
# - News feed
# - Market data
```

### 2. Closed Testing (3-5 days)
- Expand to more testers
- Gather feedback
- Fix any Android-specific issues

### 3. Open Testing (Optional, 7+ days)
- Public beta
- Larger user base
- Performance testing

### 4. Production Release
- Gradual rollout (10% → 50% → 100%)
- Monitor crash reports
- Track user feedback

## Android-Specific Considerations

### 1. API Level Requirements
```json
"android": {
  "minSdkVersion": 21,  // Android 5.0+
  "targetSdkVersion": 33  // Android 13
}
```

### 2. Permissions
The app requests these permissions on Android:
- **Camera**: For future document scanning
- **Storage**: For saving reports
- **Fingerprint**: For biometric authentication

### 3. ProGuard Rules (if needed)
For release builds, you might need ProGuard rules:
```proguard
-keep class com.groq.** { *; }
-keep class expo.modules.** { *; }
```

## Differences from iOS

| Feature | iOS | Android |
|---------|-----|---------|
| Groq API | ✅ Works | ✅ Works |
| Mock Data | ✅ Works | ✅ Works |
| Backend Optional | ✅ Yes | ✅ Yes |
| Build Format | .ipa | .aab/.apk |
| Store Review | 1-2 days | 2-3 hours |
| Testing | TestFlight | Play Console |

## Common Android Issues & Solutions

### Issue 1: Network Security
**Problem**: API calls blocked on Android 9+
**Solution**: Already handled in `app.json` with NSAllowsArbitraryLoads

### Issue 2: Large APK Size
**Problem**: APK too large
**Solution**: Use Android App Bundle (.aab) instead of APK

### Issue 3: Groq API Timeout
**Problem**: Slower network on some Android devices
**Solution**: Increase timeout in `groqService.js`:
```javascript
timeout: 30000  // 30 seconds for slower devices
```

## Quick Build Commands

```bash
# Development build
eas build --platform android --profile development

# Preview build (for testing)
eas build --platform android --profile preview

# Production build (for Play Store)
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --latest

# Check build status
eas build:list --platform android
```

## Pre-Launch Report

Google Play automatically tests your app on various devices:
- **Performance**: CPU, memory, network usage
- **Stability**: Crashes, ANRs
- **Security**: Vulnerabilities
- **Accessibility**: UI issues

Monitor these reports in Play Console > Testing > Pre-launch report

## Summary

**Android submission is very similar to iOS!**

Key points:
1. ✅ **Same API keys work** - No changes needed
2. ✅ **Same Groq integration** - Works identically
3. ✅ **Same fallback behavior** - Mock data when offline
4. ✅ **Backend optional** - Not required for submission
5. ✅ **Faster review** - Usually 2-3 hours vs iOS 1-2 days

**Next Steps:**
1. Run `eas build --platform android --profile production`
2. Submit to internal testing first
3. Test Groq AI chat on Android devices
4. Gradually roll out to production

The Android app will work exactly like iOS - with or without the backend!
