// Import iOS 18.6 crash fixes FIRST before any other imports — but ONLY on
// iOS native. The patch monkey-patches global.require / global.__metro_require__
// with fallbacks that return empty {} objects on any failure. That behavior is
// safe on iOS RN (where the specific failure modes it targets exist), but on
// web it corrupts Metro's module resolver before React initializes — every
// component that calls useState then reads the property from a null/empty
// stub and throws "Cannot read properties of null (reading 'useState')",
// tripping ErrorBoundary with the "Something went wrong" screen.
import { Platform } from 'react-native';
if (Platform.OS === 'ios') {
  require('./patches/ios-18-6-crash-fix');
}

import { registerRootComponent } from 'expo';
import MainApp from './MainApp';

// registerRootComponent calls AppRegistry.registerComponent('main', () => MainApp);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(MainApp);