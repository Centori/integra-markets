const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add alias for @ to point to ./app
config.resolver.alias = {
  '@': path.resolve(__dirname, 'app'),
};

// GUARD (build-83 postmortem): an accidental nested `app/node_modules` (an
// SDK-53 tree from a stray npm install inside app/) shipped inside the EAS
// upload, and Metro's nearest-first lookup resolved SDK-53 JS against the
// SDK-52 native binary — crashing Profile and the analysis overlay on device.
// Block any node_modules under app/ so a recreated nested tree can never
// enter a bundle again. Root node_modules stays fully resolvable.
const priorBlockList = config.resolver.blockList
  ? Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList]
  : [];
config.resolver.blockList = [
  ...priorBlockList,
  /\/app\/node_modules\/.*/,
  /\/app\/_node_modules_SDK53_QUARANTINED\/.*/,
];

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
