# 📈 Integra Markets v1.0

AI-powered commodity trading insights and market sentiment analysis platform.

[![App Store](https://img.shields.io/badge/TestFlight-Beta_v1.0-blue.svg)](https://testflight.apple.com/join/YOUR_LINK)
[![Build Status](https://img.shields.io/badge/Build-Passing-green.svg)]()
[![iOS](https://img.shields.io/badge/iOS-14.0+-black.svg)]()

## 🚀 Features

### ✅ **Core Functionality (v1.0 - TestFlight Beta)**
- **Loading Screen** - Smooth animated loading with integra branding
- **News Feed** - Real-time commodity market news with sentiment analysis
- **AI Analysis Overlay** - Comprehensive market analysis with:
  - Summary generation
  - Sentiment analysis (Bullish/Bearish/Neutral)
  - Key sentiment drivers
  - Market impact assessment
  - Trader implications
  - Actionable trade ideas
- **Navigation** - Today, Alerts, and Profile screens
- **Onboarding** - User preferences and alert setup

### 🎨 **Design System**
- **Dark Theme** - Professional trading interface
- **Color Palette**:
  - Bullish: `#4ECCA3` (Green)
  - Bearish: `#F05454` (Red)
  - Neutral: `#EAB308` (Yellow)
  - Primary: `#30A5FF` (Blue)
  - Background: `#121212` (Dark)

## 🛠️ **Tech Stack**

- **Framework**: React Native + Expo
- **Language**: TypeScript/JavaScript
- **UI Components**: React Native + Expo Vector Icons
- **State Management**: React useState/useEffect
- **Storage**: AsyncStorage
- **Navigation**: Custom tab navigation

## 📱 **Screens**

1. **Loading Screen** - Animated integra logo with progress
2. **Main Feed** - News cards with sentiment analysis
3. **AI Analysis** - Detailed market insights overlay
4. **Alerts** - Notification preferences and alerts
5. **Profile** - User settings and onboarding access

## 🎯 **Current Status: v1.0**

### **What's Working:**
✅ App loads successfully past loading screen  
✅ Main news feed displays with sample data  
✅ AI Analysis overlay opens and displays comprehensive analysis  
✅ Modern UI with professional design  
✅ No API dependencies (sample data mode)  
✅ Smooth navigation between screens  

### **Sample Data Includes:**
- Market news with sentiment scores
- AI analysis with sentiment breakdown
- Key market drivers with confidence scores
- Market impact assessments
- Trader-focused insights and trade ideas

## 📲 **TestFlight Beta**

### **Join the Beta**
1. Install TestFlight from the App Store
2. Click the TestFlight link: [Join Beta](https://testflight.apple.com/join/YOUR_LINK)
3. Accept the invitation and install Integra Markets

### **Beta Testing Guidelines**
- **Minimum iOS Version**: 14.0+
- **Supported Devices**: iPhone 6s and newer
- **Test Focus Areas**:
  - News feed performance and scrolling
  - AI analysis overlay responsiveness
  - Navigation between screens
  - Dark theme consistency
  - Loading times and animations

### **Providing Feedback**
- Use TestFlight's built-in feedback feature
- Screenshot any issues you encounter
- Report crashes with detailed steps to reproduce

## 🚀 **Development Setup**

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Xcode 14+ (for iOS development)
- iOS Simulator or physical device

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Centori/integra-markets.git
cd integra-markets
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Start the development server**
```bash
npx expo start
```

4. **Run on device/simulator**
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app

### **Building for TestFlight**

1. **Configure EAS Build**
```bash
npm install -g eas-cli
eas login
```

2. **Build for iOS**
```bash
eas build --platform ios
```

3. **Submit to TestFlight**
```bash
eas submit --platform ios
```

## 📁 **Project Structure**

```
integra/
├── App.js                          # Main app entry point
├── app/
│   ├── App.js                     # Complete app with navigation
│   ├── components/
│   │   ├── AIAnalysisOverlay.tsx  # Modern AI analysis modal
│   │   ├── NewsCard.tsx           # Individual news card
│   │   ├── IntegraLoadingPage.js  # Animated loading screen
│   │   └── ...                    # Other components
│   ├── services/
│   │   └── api.js                 # API service layer
│   └── constants/
│       └── Colors.ts              # App color scheme
├── package.json
└── README.md
```

## 🎨 **Design Highlights**

### **AI Analysis Overlay**
- Clean header with integra branding
- Article title and source
- Comprehensive summary
- Visual sentiment breakdown with progress bars
- Key sentiment drivers as interactive tags
- Market impact assessment
- "What this means for traders" section
- Actionable trade ideas
- AI attribution footer

## 📱 **App Information**

### **Bundle Details**
- **Bundle ID**: `com.centori.integra`
- **Version**: 1.0.0
- **Build Number**: 6
- **Minimum iOS**: 14.0
- **App Size**: ~45MB

### **Permissions Required**
- 📷 **Camera**: For document scanning (future feature)
- 🖼️ **Photo Library**: For uploading financial documents
- 👤 **Face ID**: For secure authentication

### **Privacy & Data**
- No personal data collected in v1.0
- All analysis performed on sample data
- No external API calls in beta version
- Crash reports collected via TestFlight

## ⚠️ **Known Issues (Beta)**

- Sample data only (no live market feeds)
- Push notifications not yet implemented
- Limited to portrait orientation
- Dark theme only (no light theme option)

## 🔮 **Future Roadmap**

### **v1.1 - Backend Integration**
- [ ] Connect to Python FastAPI backend
- [ ] Real-time news data integration
- [ ] Live sentiment analysis
- [ ] User authentication

### **v1.2 - Enhanced Features**
- [ ] Push notifications for alerts
- [ ] Portfolio tracking
- [ ] Advanced charting
- [ ] Social trading features

### **v2.0 - Advanced AI**
- [ ] Custom AI models
- [ ] Predictive analytics
- [ ] Advanced risk assessment
- [ ] Multi-asset support

## 📄 **License**

Proprietary - All rights reserved

## 🔗 **Links**

- [TestFlight Beta](https://testflight.apple.com/join/YOUR_LINK)
- [Privacy Policy](https://integramarkets.com/privacy)
- [Terms of Service](https://integramarkets.com/terms)
- [Support Email](mailto:support@integramarkets.com)

---

**Integra Markets v1.0** - AI-powered commodity trading insights  
Built with ❤️ for traders and investors
