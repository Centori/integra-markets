const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add alias for @ to point to ./app and support expo-router
config.resolver.alias = {
  '@': path.resolve(__dirname, 'app'),
  '@/*': ['./app/*'],
  'expo-router': require.resolve('expo-router'),
};

// Support .cjs extensions
config.resolver.sourceExts.push('cjs');

// Add JSX/TSX support
config.resolver.sourceExts.push('jsx', 'tsx');

// Fix for iOS 18.6 compatibility issues
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Configure for GitHub Pages deployment
if (process.env.NODE_ENV === 'production') {
  config.transformer.publicPath = '/integra-markets/_expo/static/';
}

module.exports = config;