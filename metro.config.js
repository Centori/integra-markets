const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add alias for @ to point to ./app
config.resolver.alias = {
  '@': path.resolve(__dirname, 'app'),
};

// Configure for GitHub Pages deployment
if (process.env.NODE_ENV === 'production') {
  config.transformer.publicPath = '/integra-markets/_expo/static/';
}

module.exports = config;
