const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for expo-router
config.resolver.alias = {
  ...config.resolver.alias,
  '@': './app',
};

// Ensure proper handling of TypeScript and JavaScript files
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx', 'js', 'jsx'];

// Add transformer for better compatibility
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
};

module.exports = config;