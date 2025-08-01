# 📱 Integra Markets - Build & App Store Submission Guide

## 🚀 Quick Start Commands

### Build for App Store
```bash
# Build iOS for App Store
npm run build:ios

# Build Android for Google Play
npm run build:android
```

### Submit to App Store
```bash
# Submit iOS to App Store
npm run submit:ios

# Submit Android to Google Play
npm run submit:android
```

## 📋 Prerequisites

### Required Accounts & Memberships
1. **Apple Developer Program** - $99/year (Required for App Store)
2. **EAS Account** - Free tier available, paid plans for more builds
3. **Your Apple ID**: centori1@gmail.com (Already configured)

### Already Configured
✅ **Bundle ID**: com.centori.integramarkets  
✅ **App Store Connect ID**: 6748999346  
✅ **Apple Team ID**: 2ABHLWV763  
✅ **EAS Project ID**: 66e09114-71af-4b29-82c9-d0ef24a97098  

## 🔧 Build Profiles

### Production (App Store Ready)
- **Distribution**: store
- **iOS**: Release configuration
- **Android**: App bundle format
- **Environment**: NODE_ENV=production

### Preview (Internal Testing)
- **Distribution**: internal
- **iOS**: Includes simulator build
- **Android**: APK format

### Development
- **Distribution**: internal
- **Development client**: enabled
- **For debugging and development**

## 📦 Build Process

### Step 1: Pre-build Checklist
- [ ] Update version in `app.json` and `package.json`
- [ ] Test app thoroughly with `npm start`
- [ ] Ensure all assets are properly included
- [ ] Run `npm run lint` to check code quality

### Step 2: Login to EAS
```bash
eas login
```

### Step 3: Build for Production
```bash
# iOS App Store build
npm run build:ios

# This runs: eas build --platform ios --profile production
```

### Step 4: Monitor Build
- Build will start on EAS servers
- Monitor progress at: https://expo.dev/
- Build typically takes 10-15 minutes

### Step 5: Download & Test
- Download .ipa file from EAS dashboard
- Test on TestFlight before submitting to App Store

## 🏪 App Store Submission

### Option 1: Automatic Submission (Recommended)
```bash
npm run submit:ios
```

### Option 2: Manual Submission
1. Download .ipa from EAS dashboard
2. Upload via Xcode or Transporter app
3. Configure app metadata in App Store Connect

## 📱 App Store Metadata

### App Information
- **Name**: Integra Markets
- **Category**: Finance
- **Description**: AI-powered commodity trading insights and real-time market analysis for informed trading decisions.
- **Keywords**: trading, commodities, AI, market analysis, finance, natural gas, oil, gold

### Required Assets
- [x] App Icon (1024x1024)
- [x] Screenshots (various sizes)
- [ ] App Store screenshots (you'll need to capture these)
- [ ] Privacy Policy URL
- [ ] Support URL

## 🔄 Version Updates

### Increment Version Numbers
```bash
# Update app.json
"version": "1.0.1"

# Update iOS build number
"buildNumber": "9"

# Update Android version code  
"versionCode": 2
```

### Build Updated Version
```bash
npm run build:ios
```

## 🐛 Troubleshooting

### Common Issues

**Build Failed - Bundle ID Mismatch**
- Ensure bundle ID matches in `app.json` and `eas.json`
- Current: `com.centori.integramarkets`

**Provisioning Profile Issues**
- Ensure Apple Developer account is active
- Bundle ID must be registered in Apple Developer Portal

**Asset Loading Issues**
- Check asset paths in `app.json`
- Ensure all referenced assets exist

**EAS Build Quota Exceeded**
- Free tier has limited builds per month
- Consider upgrading to paid plan for production

### Getting Help
- EAS Documentation: https://docs.expo.dev/build/introduction/
- Expo Discord: https://discord.gg/expo
- Apple Developer Support: https://developer.apple.com/support/

## 💰 Cost Breakdown

### Required Costs
- **Apple Developer Program**: $99/year
- **Google Play Console**: $25 one-time (for Android)

### Optional Costs
- **EAS Build Pro**: $29/month (for unlimited builds)
- **EAS Submit**: Included with Build plans

### Free Tier Limits
- **EAS Build**: Limited monthly builds
- **EAS Submit**: Limited submissions

## 🎯 Next Steps

1. **Test thoroughly** with `npm start`
2. **Build production version** with `npm run build:ios`  
3. **Test on TestFlight** before public release
4. **Submit to App Store** with `npm run submit:ios`
5. **Monitor App Store Connect** for review status

---

## 📞 Support

For technical issues with this build setup, contact the development team.
For App Store review issues, contact Apple Developer Support.

**Happy Building! 🚀**
