# 🚨 TestFlight Crash Solutions - Complete Analysis

## 📊 **Success Metrics**
- **Build 20**: Crash rate reduced from 15-20% to **less than 2%**
- **Most Effective Build**: Build 20 with comprehensive crash prevention

## 🔴 **Critical Crash Issues & Solutions**

### **1. Build 20 - The Breakthrough Solution**
**Status**: ✅ **MOST SUCCESSFUL** - Crash rate < 2%

**Key Solutions Implemented**:
- ✅ **SafeAppWrapper** with comprehensive error boundaries
- ✅ **BlurView** imports and dependencies fixed
- ✅ **iOS 18.6 compatibility** with polyfills
- ✅ **Auth service** enhanced with fallback mechanisms
- ✅ **AsyncStorage** operations wrapped in try-catch blocks
- ✅ **Memory management** and GC mocks added
- ✅ **requestAnimationFrame** polyfills implemented

### **2. Image Loading Crashes (Build 2-4)**
**Problem**: App crashing during onboarding due to image loading

**Solutions Applied**:
- ✅ Replaced problematic images with icon placeholders
- ✅ Temporarily disabled ImageManipulator
- ✅ Used MaterialIcons as fallback
- ✅ Implemented simpler loading mechanisms

### **3. Authentication Flow Crashes**
**Problem**: Auth services causing initialization crashes

**Solutions Applied**:
- ✅ Added mock authentication for development
- ✅ Enhanced error handling in auth flows
- ✅ Added fallback mechanisms for failed auth operations
- ✅ Temporarily disabled Apple Sign-In (provisioning profile issues)

### **4. iOS 18.6 Specific Issues**
**Solution**: Created comprehensive crash prevention patch
**File**: `patches/ios-18-6-crash-fix.js`

**Includes**:
- ✅ Safe module resolution
- ✅ Polyfills for missing functionality
- ✅ Enhanced error handling
- ✅ Memory management improvements
- ✅ Platform-specific checks

### **5. State Management Crashes**
**Problem**: Complex state management during initialization

**Solutions Applied**:
- ✅ Simplified state management
- ✅ Added proper error boundaries
- ✅ Implemented safe initialization process
- ✅ Added fallback UI for error states

### **6. Dependency Management**
**Critical Dependencies Added**:
```json
{
  "@react-native-community/blur": "^4.x.x",
  "react-native-safe-area-context": "^4.x.x",
  "buffer": "^6.x.x"
}
```

**Actions Taken**:
- ✅ Updated package.json with correct versions
- ✅ Removed problematic dependencies causing conflicts

### **7. Build Configuration**
**Critical Settings**:
- ✅ Disabled new architecture (compatibility issues)
- ✅ Added proper error boundaries at app root
- ✅ Enhanced Metro bundler configuration
- ✅ Added proper iOS build settings in app.json

## 🎯 **Current Situation Analysis**

### **Build 26 vs Build 20 Comparison**
**Hypothesis**: Build 26 may be missing the critical crash prevention measures from Build 20

**Key Questions**:
1. Does Build 26 have the SafeAppWrapper?
2. Are the iOS 18.6 polyfills present?
3. Is the comprehensive error handling implemented?
4. Are the critical dependencies included?

### **Immediate Action Plan**
1. **Current Build 26.1**: Monitor completion and test for crashes
2. **If crashes persist**: Apply Build 20 solutions to current codebase
3. **Compare configurations**: Build 26 vs Build 20 differences
4. **Implement missing fixes**: From the proven Build 20 solution set

## 🛡️ **Crash Prevention Checklist**
Based on Build 20 success:

- [ ] SafeAppWrapper with error boundaries implemented
- [ ] iOS 18.6 compatibility patch applied
- [ ] BlurView dependencies properly configured
- [ ] AsyncStorage operations wrapped in try-catch
- [ ] Auth service fallback mechanisms active
- [ ] Memory management and GC mocks in place
- [ ] requestAnimationFrame polyfills implemented
- [ ] Image loading fallbacks configured
- [ ] State management simplified with error boundaries
- [ ] Critical dependencies installed and configured
- [ ] New architecture disabled
- [ ] Metro bundler properly configured

## 📈 **Success Pattern**
The most effective approach was **comprehensive error handling** rather than fixing individual issues:
1. Error boundaries at multiple levels
2. Safe fallbacks for all critical operations
3. Platform-specific compatibility checks
4. Enhanced stability through proper initialization
5. Simplified processes to reduce failure points

---

**Next Steps**: Apply Build 20's proven solutions to resolve current Build 26+ crashes.

## 🆕 2026-07-01 — TestFlight Rebuild Blockers Resolved

Context: cutover from browser-based Google OAuth to native Google Sign-In
required a new TestFlight build (native code change). First two EAS Build
attempts failed at the "Install pods" phase. Root causes + fixes below.

### Fix 1 — AppCheckCore modular headers (primary blocker)

**Error seen in build logs:**
```
[!] The following Swift pods cannot yet be integrated as static libraries:
The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and
`RecaptchaInterop`, which do not define modules. To opt into those targets
generating module maps... you may set `use_modular_headers!` globally in
your Podfile, or specify `:modular_headers => true` for particular
dependencies.
pod install exited with non-zero code: 1
```

**Cause:** `@react-native-google-signin/google-signin@15.0.0` transitively
depends on Firebase's `AppCheckCore` (Swift pod). AppCheckCore in turn
depends on `GoogleUtilities` / `RecaptchaInterop` (Obj-C pods without
module maps). Managed Expo builds don't expose the Podfile directly for
manual editing.

**Fix:** Add `expo-build-properties` plugin with static frameworks:

```json
// app.json
"plugins": [
  ...,
  [
    "expo-build-properties",
    { "ios": { "useFrameworks": "static" } }
  ]
]
```

Install via `npx expo install expo-build-properties`.

### Fix 2 — Native package versions must match Expo SDK

**Cause:** Adding `@react-native-community/netinfo` and `expo-clipboard`
via plain `npm install` pulled `latest` versions that target Expo SDK 53.
This project is SDK 52. Version mismatch → CocoaPods can't resolve.

**Fix:** Always use `npx expo install <pkg>` for packages with native
code. It picks the SDK-compatible version automatically.

Correct SDK 52 versions:
- `@react-native-community/netinfo`: **11.4.1** (not latest `^13.x`)
- `expo-clipboard`: **~7.0.1** (not latest `8.x`)

### Working build reference

- Build ID: `e6090704-5e31-41ae-bab7-b0c89f606008` (Xcode 16 — passed pod install but not usable per Apple's April 2026 rule)
- Working Xcode-26 build: `96779f72-0d89-47aa-ae84-20a4936a2206` (build 62, shipped 2026-07-02)
- IPA: available on EAS artifacts
- Runtime version: 1.0.1 (baked-in OTA URL: `https://u.expo.dev/5163460b-...`)
- iOS build number: 62

### Fix 3 — fmt/consteval on Xcode 26 (biggest sinkhole)

**Error seen in Xcode compile phase:**
```
call to consteval function 'fmt::basic_format_string<...>::basic_format_string<FMT_COMPILE_STRING, 0>' is not a constant expression
```

**Cause:** RN 0.76 depends on `{fmt}` v11.0.2 via
`node_modules/react-native/third-party-podspecs/fmt.podspec`. In fmt v11+, the
`basic_format_string` constructor is declared `consteval` (strict compile-time
evaluation). Xcode 26's LLVM enforces this strictly, so any implicit fmt format
call with runtime args (which RN's C++ code does throughout Fabric/folly/logger)
fails to compile.

**What did NOT work (learned the hard way, avoid these):**
- Setting `useFrameworks: "static"` — needed for AppCheckCore but doesn't touch fmt.
- Adding preprocessor define `FMT_USE_CONSTEVAL=0` via `pod_target_xcconfig` /
  `user_target_xcconfig` — didn't propagate to the RN compilation units that
  #include fmt headers.
- Adding a custom Podfile `post_install` hook via Expo config plugin —
  duplicated the block that Expo already generates, breaking pod install.
- Switching Hermes → JSC — fmt is used by non-Hermes RN modules (folly/Fabric),
  so the error persists.

**What DID work:** downgrade the fmt version RN pulls in from 11.0.2 to 9.1.0.
fmt 9.x uses `constexpr` (permissive) for the same constructor. API surface RN
uses (`fmt::format`, `fmt::formatted_size`, etc.) is stable across 9.x → 11.x.
Applied via `patch-package`:

```
patches/react-native+0.76.9.patch  (modifies fmt.podspec spec.version to "9.1.0")
"scripts": { "postinstall": "patch-package" }
```

Reinstall `patch-package` if it goes missing: `npm i -D patch-package postinstall-postinstall`.

### Fix 4 — Local disk hygiene (blocks EAS uploads)

EAS Build clones the local repo to a temp dir before uploading. If disk is
<200MB free, `git clone --depth 1 file://...` fails with exit 128
("No space left on device") **before** anything reaches EAS servers.

Free up ≥1 GB before running `eas build`:
```
xcrun simctl delete unavailable
rm -rf ~/.expo "$TMPDIR"/eas-cli-nodejs-* "$TMPDIR"/metro-*
npm cache clean --force
brew cleanup --prune=all
```

### Checklist before running `eas build --platform ios` in the future

- [ ] Any new packages with native code added via `npx expo install`, not `npm install`
- [ ] `expo-build-properties` plugin present in `app.json` with `useFrameworks: "static"`
- [ ] `ios/` directory contains only `IntegraMarkets.xcworkspace/contents.xcworkspacedata` (nothing else — everything else regenerated by EAS prebuild)
- [ ] `eas.json` submit profile has `ascAppId` (`"6749469306"`) and `appleTeamId` (`"2ABHLWV763"`) — required for `--auto-submit`
- [ ] Runtime version in `app.json` unchanged (bumping it splits the install base — OTAs won't reach older devices)