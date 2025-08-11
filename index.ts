// Import iOS 18.6 crash fixes FIRST before any other imports
import './patches/ios-18-6-crash-fix';

import { registerRootComponent } from 'expo';
import SafeAppWrapper from './SafeAppWrapper';

// registerRootComponent calls AppRegistry.registerComponent('main', () => SafeAppWrapper);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(SafeAppWrapper);
