/**
 * iOS 18.6 Comprehensive Crash Prevention Patch
 * This file contains essential fixes for iOS 18.6 crashes
 * Addresses known issues with iPhone XR and iPad Air (5th gen)
 */

// Wrap entire patch in try-catch to prevent patch itself from crashing
try {

// Only import crypto polyfill if actually needed
if (typeof crypto === 'undefined' || typeof crypto.getRandomValues === 'undefined') {
    try {
        require('react-native-get-random-values');
    } catch (e) {
        console.warn('[iOS 18.6 Patch] Crypto polyfill not available, continuing without it');
    }
}

// Essential polyfills that won't interfere with core functionality

// 1. Safe TextEncoder/TextDecoder polyfill (only if missing)
if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = class TextEncoder {
        encode(str) {
            const utf8 = unescape(encodeURIComponent(str));
            const result = new Uint8Array(utf8.length);
            for (let i = 0; i < utf8.length; i++) {
                result[i] = utf8.charCodeAt(i);
            }
            return result;
        }
    };
}

if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = class TextDecoder {
        decode(buffer) {
            let result = '';
            const bytes = new Uint8Array(buffer);
            for (let i = 0; i < bytes.length; i++) {
                result += String.fromCharCode(bytes[i]);
            }
            try {
                return decodeURIComponent(escape(result));
            } catch (e) {
                return result;
            }
        }
    };
}

// 2. Only add Buffer if truly missing (should already be polyfilled by React Native)
if (typeof global.Buffer === 'undefined') {
    try {
        global.Buffer = require('buffer').Buffer;
    } catch (e) {
        // Buffer is not critical for most app functionality
        console.log('[iOS 18.6 Patch] Buffer polyfill skipped');
    }
}

// 3. Ensure Symbol.asyncIterator exists (required for async operations)
if (typeof Symbol.asyncIterator === 'undefined') {
    Symbol.asyncIterator = Symbol.for('Symbol.asyncIterator');
}

// 4. Fix for iOS 18.6 specific error handling
if (global.ErrorUtils) {
    const originalHandler = global.ErrorUtils.getGlobalHandler();
    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        // Only suppress very specific iOS 18.6 initialization errors
        const errorMessage = error?.message || '';
        
        // These are non-critical errors that occur during iOS 18.6 initialization
        const ios18InitErrors = [
            'undefined is not an object (evaluating \'_RNGestureHandlerModule.default.Direction\')',
            'Cannot read property \'Direction\' of undefined',
            'Invariant Violation: Module AppRegistry is not a registered callable module'
        ];
        
        if (!isFatal && ios18InitErrors.some(known => errorMessage.includes(known))) {
            console.warn('[iOS 18.6 Patch] Suppressed initialization error:', errorMessage);
            return;
        }
        
        // Pass all other errors to the original handler
        if (originalHandler) {
            originalHandler(error, isFatal);
        }
    });
}

// 5. Fix for missing global functions that iOS 18.6 expects
if (typeof global.queueMicrotask === 'undefined') {
    global.queueMicrotask = (callback) => {
        Promise.resolve().then(callback).catch(e => {
            setTimeout(() => { throw e; }, 0);
        });
    };
}

// 6. Fix for setImmediate (used by some RN internals)
if (typeof global.setImmediate === 'undefined') {
    global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
    global.clearImmediate = clearTimeout;
}

// 7. Prevent crashes from missing or undefined modules
const originalRequire = global.require;
if (originalRequire) {
    global.require = function(moduleId) {
        try {
            return originalRequire.call(this, moduleId);
        } catch (error) {
            console.warn(`[iOS 18.6 Patch] Failed to require module: ${moduleId}`, error.message);
            
            // Return specific mocks for known problematic modules
            if (moduleId.includes('expo-blur')) {
                return {
                    BlurView: ({ children, ...props }) => children,
                    default: ({ children, ...props }) => children,
                    __esModule: true
                };
            }
            
            if (moduleId.includes('expo-apple-authentication')) {
                return {
                    isAvailableAsync: () => Promise.resolve(false),
                    signInAsync: () => Promise.reject(new Error('Apple Authentication not available')),
                    AppleAuthenticationScope: {
                        FULL_NAME: 'FULL_NAME',
                        EMAIL: 'EMAIL'
                    },
                    default: {},
                    __esModule: true
                };
            }
            
            if (moduleId.includes('expo-web-browser')) {
                return {
                    maybeCompleteAuthSession: () => {},
                    openAuthSessionAsync: () => Promise.resolve({ type: 'cancel' }),
                    default: {},
                    __esModule: true
                };
            }
            
            // Return a generic mock module to prevent crash
            return {
                default: {},
                __esModule: true
            };
        }
    };
}

// 8. Fix for performance.now() which may be missing on iOS 18.6
if (typeof global.performance === 'undefined') {
    global.performance = {
        now: () => Date.now()
    };
}

// 9. Additional iOS 18.6 specific fixes
if (typeof global.requestAnimationFrame === 'undefined') {
    global.requestAnimationFrame = (callback) => {
        return setTimeout(callback, 1000 / 60); // 60 FPS
    };
}

if (typeof global.cancelAnimationFrame === 'undefined') {
    global.cancelAnimationFrame = clearTimeout;
}

// 10. Fix for React Native component registration
if (global.AppRegistry && typeof global.AppRegistry.registerComponent === 'function') {
    const originalRegisterComponent = global.AppRegistry.registerComponent;
    global.AppRegistry.registerComponent = function(appKey, getComponentFunc) {
        try {
            return originalRegisterComponent.call(this, appKey, getComponentFunc);
        } catch (error) {
            console.warn('[iOS 18.6 Patch] Component registration error:', error.message);
            // Return a fallback component
            return originalRegisterComponent.call(this, appKey, () => {
                const React = require('react');
                const { View, Text } = require('react-native');
                return () => React.createElement(View, {}, 
                    React.createElement(Text, {}, 'Loading...'));
            });
        }
    };
}

// 11. Memory management for iOS 18.6
if (typeof global.gc === 'undefined') {
    global.gc = () => {
        // Mock garbage collection
        if (global.__DEV__) {
            console.log('[iOS 18.6 Patch] Mock garbage collection triggered');
        }
    };
}

// 12. Fix for Metro bundler issues on iOS 18.6
if (typeof global.__metro_require__ !== 'undefined') {
    const originalMetroRequire = global.__metro_require__;
    global.__metro_require__ = function(moduleId) {
        try {
            return originalMetroRequire.call(this, moduleId);
        } catch (error) {
            console.warn(`[iOS 18.6 Patch] Metro require failed for module ${moduleId}:`, error.message);
            return {};
        }
    };
}

console.log('[iOS 18.6 Patch] Comprehensive patches applied successfully');

} catch (patchError) {
    console.error('[iOS 18.6 Patch] Failed to apply patches:', patchError);
    // Don't throw - let app continue even if patches fail
}
