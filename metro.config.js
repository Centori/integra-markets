const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add alias for @ to point to ./app
config.resolver.alias = {
  '@': path.resolve(__dirname, 'app'),
  react: path.resolve(__dirname, 'node_modules/react'),
  'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
};
config.resolver.blockList = exclusionList([
  /app\/node_modules\/.*/
]);

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
