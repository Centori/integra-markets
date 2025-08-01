module.exports = {
  expo: {
    name: "Integra Markets",
    slug: "integra",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#121212"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      bundleIdentifier: "com.centori.integramarkets",
      buildNumber: "8",
      supportsTablet: true,
      requireFullScreen: false,
      config: {
        usesNonExemptEncryption: false
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: "This app uses the camera to capture financial documents and receipts.",
        NSPhotoLibraryUsageDescription: "This app accesses your photo library to select financial documents and receipts.",
        NSFaceIDUsageDescription: "This app uses Face ID for secure authentication.",
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSExceptionDomains: {}
        }
      }
    },
    android: {
      package: "com.centori.integramarkets",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#121212"
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.USE_FINGERPRINT"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: ["expo-web-browser"],
    extra: {
      eas: {
        projectId: "66e09114-71af-4b29-82c9-d0ef24a97098"
      }
    },
    newArchEnabled: true,
    // App Store specific metadata
    description: "AI-powered commodity trading insights and real-time market analysis for informed trading decisions.",
    keywords: ["trading", "commodities", "AI", "market analysis", "finance", "natural gas", "oil", "gold"],
    category: "Finance",
    privacy: "https://integramarkets.com/privacy",
    supportUrl: "https://integramarkets.com/support"
  }
};
