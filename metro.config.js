const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add alias for @ to point to ./app
config.resolver.alias = {
  '@': path.resolve(__dirname, 'app'),
};

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
