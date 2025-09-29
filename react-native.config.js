module.exports = {
  project: {
    ios: {
      privacyManifestAggregationEnabled: false,
    },
  },
  dependencies: {
    // Disable privacy manifests for specific problematic pods
    'react-native-google-mobile-ads': {
      platforms: {
        ios: {
          privacyManifest: false,
        },
      },
    },
    'IQKeyboardManagerSwift': {
      platforms: {
        ios: {
          privacyManifest: false,
        },
      },
    },
  },
};