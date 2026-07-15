// Import iOS 18.6 crash fixes FIRST before any other imports
import './patches/ios-18-6-crash-fix';

import { registerRootComponent } from 'expo';
// The REAL UI root is app/App.js (the 2,086-line build-64 interface:
// flash-icon nav, onboarding, auth, Today/Alerts/Profile). It was gutted
// to a stub re-exporting the legacy root-level MainApp.js shell — which
// CLAUDE.md explicitly flags as a legacy duplicate — silently downgrading
// the whole UI. Restored from the April build-64 commit (06b5a442).
import App from './app/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
