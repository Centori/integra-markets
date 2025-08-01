const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add alias for @ to point to ./app
config.resolver.alias = {
  '@': path.resolve(__dirname, 'app'),
};

module.exports = config;