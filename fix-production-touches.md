# Fix for Production Build Touch Events Being Blocked

## Problem
The React Native Inspector/Developer tools overlay is appearing in production builds, blocking touch events on clickable elements like news article links.

## Solutions

### 1. Force Production Build Environment
```bash
# Clear cache and rebuild
eas build:configure
eas build --platform ios --profile production --clear-cache
```

### 2. Add Environment Variable Check to App.js
Add this to the top of your App.js file after imports:

```javascript
// Ensure dev tools are disabled in production
if (!__DEV__) {
  console.disableYellowBox = true;
  console.reportErrorsAsExceptions = false;
  
  // Disable React Native Inspector in production
  if (global && global.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.isDisabled = true;
  }
}
```

### 3. Update eas.json Production Profile
Ensure your production profile explicitly sets NODE_ENV:

```json
"production": {
  "developmentClient": false,
  "distribution": "store",
  "ios": {
    "resourceClass": "m-medium",
    "buildConfiguration": "Release",
    "image": "latest"
  },
  "env": {
    "NODE_ENV": "production",
    "EXPO_PUBLIC_ENV": "production"
  }
}
```

### 4. Add Production Check to NewsCard.tsx
In NewsCard.tsx, add a check to ensure touch handlers work:

```typescript
const handleSourcePress = async () => {
  // Debug log for production
  if (!__DEV__) {
    console.log('Production click:', item.sourceUrl);
  }
  
  // Rest of your existing code...
}
```

### 5. Disable Inspector via Native Code
If the issue persists, add this to your iOS AppDelegate.m:

```objective-c
#ifdef DEBUG
  // Dev tools only in debug
#else
  // Disable all dev tools in release
  RCTSetIsDebuggingRemotely(NO);
#endif
```

### 6. Check for Third-Party Libraries
Some libraries might be enabling dev tools. Check for:
- Flipper integration
- React Native Debugger
- Custom dev tool libraries

### 7. Test Production Build Locally
```bash
# Build for simulator to test locally
eas build --platform ios --profile production --local

# Or use preview profile with production settings
eas build --platform ios --profile preview
```

## Immediate Workaround

If you need to ship immediately, you can add a transparent overlay dismisser:

```javascript
// In App.js, add after imports
import { DevSettings } from 'react-native';

// In useEffect
useEffect(() => {
  if (!__DEV__ && DevSettings) {
    // Force close any dev menus
    DevSettings.reload();
  }
}, []);
```

## Verification Steps

1. After rebuilding, test on a real device (not simulator)
2. Check that `__DEV__` is `false` in production
3. Verify no dev tools appear on app launch
4. Test all touch events work correctly

## Root Cause Prevention

1. Always test production builds before submission
2. Use TestFlight for beta testing
3. Set up CI/CD to catch these issues
4. Add automated tests for touch events

## Contact Support

If the issue persists after trying these solutions:
1. File an issue with Expo/React Native
2. Check if it's a known issue with your RN version
3. Consider downgrading if it's a regression
