import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addAlert } from './alertService';

// Configure how notifications are handled when the app is running
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Set up iOS notification categories for better Settings integration
if (Platform.OS === 'ios') {
  Notifications.setNotificationCategoryAsync('MARKET_ALERT', [
    {
      identifier: 'VIEW_DETAILS',
      buttonTitle: 'View Details',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: 'DISMISS',
      buttonTitle: 'Dismiss',
      options: {
        isDestructive: true,
      },
    },
  ]);
  
  Notifications.setNotificationCategoryAsync('BREAKING_NEWS', [
    {
      identifier: 'READ_MORE',
      buttonTitle: 'Read More',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: 'SHARE',
      buttonTitle: 'Share',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

// Keys for storing notification preferences
const NOTIFICATION_SETTINGS_KEY = '@notification_settings';
const PUSH_TOKEN_KEY = '@push_token';

// Default notification settings
const defaultNotificationSettings = {
  pushNotifications: true,
  emailAlerts: false,
  marketAlerts: true,
  breakingNews: true,
  priceAlerts: true,
  weekendUpdates: false,
  soundEnabled: true,
  vibrationEnabled: true,
};

/**
 * Register for push notifications and get push token with enhanced error handling
 */
export async function registerForPushNotificationsAsync() {
  let token;
  
  try {
    // Set up notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4ECCA3',
        sound: true,
      });
      
      // Create additional channels for different notification types
      await Notifications.setNotificationChannelAsync('market-alerts', {
        name: 'Market Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F05454',
        sound: 'market_alert.wav',
        icon: '@drawable/notification_icon', // Use simplified icon
        badge: true,
      });
      
      await Notifications.setNotificationChannelAsync('breaking-news', {
        name: 'Breaking News',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#30A5FF',
        sound: 'breaking_news.wav',
        icon: '@drawable/notification_icon', // Use simplified icon
        badge: true,
      });
    }

    // Get detailed permission status for better error handling
    const initialPermissions = await getDetailedPermissionStatus();
    console.log('Initial permission status:', initialPermissions);
    
    let finalStatus = initialPermissions.status;

    // Request permission if not already granted
    if (initialPermissions.status !== 'granted') {
      if (!initialPermissions.canAskAgain) {
        // User has permanently denied permissions
        Alert.alert(
          'Notifications Permanently Disabled',
          'Notifications have been permanently disabled. Please enable them manually in your device settings:\n\n' +
          (Platform.OS === 'ios' 
            ? 'Settings > Integra Markets > Notifications'
            : 'Settings > Apps > Integra Markets > Notifications'),
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          ]
        );
        return null;
      }
      
      const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      
      // Handle different permission responses
      if (status === 'denied' && !canAskAgain) {
        Alert.alert(
          'Notifications Denied',
          'You\'ve denied notification permissions. To receive market alerts, please enable notifications in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          ]
        );
        return null;
      }
    }

    // If permission still not granted, provide specific guidance
    if (finalStatus !== 'granted') {
      const errorMessage = getPermissionErrorMessage(finalStatus, Platform.OS);
      Alert.alert('Notifications Not Available', errorMessage);
      return null;
    }

    // Get push token with retry logic
    try {
      token = await Notifications.getExpoPushTokenAsync();
    } catch (tokenError) {
      console.error('Error getting push token:', tokenError);
      
      // Retry once after a short delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        token = await Notifications.getExpoPushTokenAsync();
      } catch (retryError) {
        console.error('Retry failed for push token:', retryError);
        Alert.alert(
          'Token Generation Failed',
          'Could not generate push notification token. Please try again later or restart the app.'
        );
        return null;
      }
    }
    
    // Store the token locally
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token.data);
    
    // Register token with backend if user is authenticated
    try {
        const authToken = await AsyncStorage.getItem('@auth_token');
        if (authToken) {
            const { api } = require('./apiClient');
            api.setAuthToken(authToken);
            await api.post('/notifications/register-token', {
                token: token.data,
                device_type: Platform.OS
            });
            console.log('Push token registered with backend');
        }
    } catch (error) {
        console.error('Error registering token with backend:', error);
        // Don't fail the entire process if backend registration fails
    }
    
    console.log('Push notification token obtained:', token.data);
    return token.data;
    
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    const errorMessage = getRegistrationErrorMessage(error);
    Alert.alert('Notification Setup Failed', errorMessage);
    return null;
  }
}

/**
 * Get current notification settings with enhanced permission checking
 */
export async function getNotificationSettings() {
  try {
    const settings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    const parsedSettings = settings ? JSON.parse(settings) : defaultNotificationSettings;
    
    // Enhanced permission checking with iOS-specific handling
    const permissionStatus = await getDetailedPermissionStatus();
    const hasPermission = permissionStatus.granted;
    
    // Update pushNotifications based on actual permission status
    if (parsedSettings.pushNotifications !== hasPermission) {
      console.log(`Permission status mismatch detected. Stored: ${parsedSettings.pushNotifications}, Actual: ${hasPermission}`);
      parsedSettings.pushNotifications = hasPermission;
      // Save the updated status
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(parsedSettings));
    }
    
    // Add permission details for debugging
    parsedSettings._permissionDetails = permissionStatus;
    
    return parsedSettings;
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return { ...defaultNotificationSettings, _permissionDetails: { granted: false, error: error.message } };
  }
}

/**
 * Save notification settings
 */
export async function saveNotificationSettings(settings) {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    Alert.alert('Settings Saved', 'Notification preferences updated');
    return true;
  } catch (error) {
    console.error('Error saving notification settings:', error);
    Alert.alert('Save Failed', 'Could not save notification settings');
    return false;
  }
}

/**
 * Get stored push token
 */
export async function getStoredPushToken() {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting stored push token:', error);
    return null;
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(title, body, data = {}, scheduledTime = null) {
  try {
    const settings = await getNotificationSettings();
    
    if (!settings.pushNotifications) {
      console.log('Push notifications disabled by user');
      return;
    }

    const notificationContent = {
      title,
      body,
      data,
      sound: settings.soundEnabled,
      vibrate: settings.vibrationEnabled ? [0, 250, 250, 250] : false,
    };

    let notificationId;
    if (scheduledTime) {
      // Schedule for later
      notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: { date: scheduledTime },
      });
    } else {
      // Show immediately
      notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null,
      });
    }

    return notificationId;
  } catch (error) {
    console.error('Error scheduling local notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    return true;
  } catch (error) {
    console.error('Error canceling notification:', error);
    return false;
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return true;
  } catch (error) {
    console.error('Error canceling all notifications:', error);
    return false;
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications() {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

// Set up notification listeners
let notificationListener;
let responseListener;

/**
 * Setup notification event listeners
 */
export function setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
  // Listener for notifications received while app is running
  notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
    
    // Show alert for immediate feedback
    Alert.alert(notification.request.content.title, notification.request.content.body);
    
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Listener for when user taps on notification
  responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response received:', response);
    
    if (onNotificationResponse) {
      onNotificationResponse(response);
    }
  });

  return { notificationListener, responseListener };
}

/**
 * Remove notification event listeners
 */
export function removeNotificationListeners() {
  if (notificationListener) {
    Notifications.removeNotificationSubscription(notificationListener);
  }
  if (responseListener) {
    Notifications.removeNotificationSubscription(responseListener);
  }
}

/**
 * Send notification for market alert
 */
export async function sendMarketAlert(commodity, change, price) {
  const settings = await getNotificationSettings();
  
  if (!settings.marketAlerts || !settings.pushNotifications) {
    return;
  }

  const title = 'Market Update';
  const body = `${commodity}: ${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  
  try {
    // Send notification
    const notificationId = await scheduleLocalNotification(title, body, {
      type: 'market_alert',
      commodity,
      change,
      price,
    });
    
    // Add to alert history
    await addAlert({
      type: 'market',
      severity: Math.abs(change) > 5 ? 'high' : 'medium',
      title,
      message: body,
      data: {
        commodity,
        change,
        price,
        notificationId
      }
    });
    
    return notificationId;
  } catch (error) {
    console.error('Error sending market alert:', error);
    return null;
  }
}

/**
 * Send notification for breaking news
 */
export async function sendBreakingNewsAlert(headline, source) {
  const settings = await getNotificationSettings();
  
  if (!settings.breakingNews || !settings.pushNotifications) {
    return;
  }

  const title = 'Breaking News';
  const body = headline;
  
  try {
    // Send notification
    const notificationId = await scheduleLocalNotification(title, body, {
      type: 'breaking_news',
      source,
    });
    
    // Add to alert history
    await addAlert({
      type: 'news',
      severity: 'high',
      title,
      message: body,
      data: {
        source,
        notificationId
      }
    });
    
    return notificationId;
  } catch (error) {
    console.error('Error sending breaking news alert:', error);
    return null;
  }
}

/**
 * Check if push notifications are enabled in iOS settings
 */
/**
 * Enhanced permission checking with detailed status information
 */
export async function getDetailedPermissionStatus() {
  try {
    debugLog('Getting detailed notification permission status...');
    
    const permissions = await Notifications.getPermissionsAsync();
    
    // iOS-specific permission handling
    if (Platform.OS === 'ios') {
      // Check for iOS-specific permission states
      const iosPermissions = permissions.ios || {};
      
      const result = {
        granted: permissions.status === 'granted',
        status: permissions.status,
        canAskAgain: permissions.canAskAgain,
        expires: permissions.expires,
        ios: {
          allowsAlert: iosPermissions.allowsAlert,
          allowsBadge: iosPermissions.allowsBadge,
          allowsSound: iosPermissions.allowsSound,
          allowsCriticalAlerts: iosPermissions.allowsCriticalAlerts,
          allowsDisplayInNotificationCenter: iosPermissions.allowsDisplayInNotificationCenter,
          allowsDisplayInCarPlay: iosPermissions.allowsDisplayInCarPlay,
          allowsDisplayOnLockScreen: iosPermissions.allowsDisplayOnLockScreen,
          providesAppNotificationSettings: iosPermissions.providesAppNotificationSettings,
        },
        timestamp: Date.now()
      };
      
      debugLog('Detailed permission status:', result);
      return result;
    } else {
      // Android permission handling
      const result = {
        granted: permissions.status === 'granted',
        status: permissions.status,
        canAskAgain: permissions.canAskAgain,
        expires: permissions.expires,
        timestamp: Date.now()
      };
      
      debugLog('Detailed permission status:', result);
      return result;
    }
  } catch (error) {
    debugError('Error getting detailed permission status', error);
    return {
      granted: false,
      status: 'error',
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Simple permission check (backward compatibility)
 */
export async function checkNotificationPermissions() {
  try {
    const detailedStatus = await getDetailedPermissionStatus();
    return detailedStatus.granted;
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return false;
  }
}

/**
 * Force refresh permission status and clear cached data
 */
export async function refreshPermissionStatus() {
  try {
    debugLog('Refreshing notification permission status...');
    
    // Clear any cached permission data
    const currentSettings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (currentSettings) {
      const settings = JSON.parse(currentSettings);
      delete settings._permissionDetails;
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    }
    
    // Get fresh permission status
    const freshStatus = await getDetailedPermissionStatus();
    debugLog('Fresh permission status:', freshStatus);
    
    // Update stored settings with fresh status
    const updatedSettings = await getNotificationSettings();
    
    return {
      success: true,
      permissionStatus: freshStatus,
      settings: updatedSettings
    };
  } catch (error) {
    debugError('Error refreshing permission status', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get user-friendly error message for permission status
 */
function getPermissionErrorMessage(status, platform) {
  switch (status) {
    case 'denied':
      return `Notifications are disabled. To enable them:\n\n${platform === 'ios' 
        ? 'Go to Settings > Integra Markets > Notifications and turn on Allow Notifications'
        : 'Go to Settings > Apps > Integra Markets > Notifications and enable notifications'}`;
    case 'undetermined':
      return 'Notification permissions are not set. Please try enabling notifications again.';
    case 'provisional':
      return 'Notifications are in provisional mode. Some features may be limited.';
    default:
      return `Notification status: ${status}. Please check your device settings.`;
  }
}

/**
 * Get user-friendly error message for registration failures
 */
function getRegistrationErrorMessage(error) {
  if (error.message.includes('network')) {
    return 'Network error occurred. Please check your internet connection and try again.';
  }
  if (error.message.includes('token')) {
    return 'Failed to generate notification token. Please restart the app and try again.';
  }
  if (error.message.includes('permission')) {
    return 'Permission error. Please check your notification settings and try again.';
  }
  return `Setup failed: ${error.message}. Please try again or contact support if the problem persists.`;
}

/**
 * Enhanced debug logging for notification permissions
 */
const DEBUG_PREFIX = '[NotificationService]';

function debugLog(message, data = null) {
  if (__DEV__) {
    console.log(`${DEBUG_PREFIX} ${message}`, data || '');
  }
}

function debugError(message, error = null) {
  if (__DEV__) {
    console.error(`${DEBUG_PREFIX} ERROR: ${message}`, error || '');
  }
}

function debugWarn(message, data = null) {
  if (__DEV__) {
    console.warn(`${DEBUG_PREFIX} WARNING: ${message}`, data || '');
  }
}

/**
 * Comprehensive debug information about notification state
 */
export async function getDebugInfo() {
  try {
    debugLog('Gathering comprehensive debug information...');
    
    const detailedStatus = await getDetailedPermissionStatus();
    const storedSettings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    const scheduledNotifications = await getScheduledNotifications();
    const consistencyCheck = await validatePermissionConsistency();
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      platformVersion: Platform.Version,
      detailedPermissionStatus: detailedStatus,
      storedSettings: storedSettings ? JSON.parse(storedSettings) : null,
      hasPushToken: !!pushToken,
      pushTokenLength: pushToken ? pushToken.length : 0,
      scheduledNotificationsCount: scheduledNotifications.length,
      consistencyCheck,
      appState: {
        isInForeground: true, // This would need to be passed in or detected
        notificationHandlerSet: !!Notifications.getNotificationHandler()
      }
    };
    
    debugLog('Debug info gathered:', debugInfo);
    return debugInfo;
  } catch (error) {
    debugError('Failed to gather debug info', error);
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Log permission state changes for debugging
 */
export function logPermissionStateChange(oldState, newState, context = '') {
  if (__DEV__) {
    debugLog(`Permission state change ${context}:`, {
      from: oldState,
      to: newState,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Validate permission state consistency
 */
export async function validatePermissionConsistency() {
  try {
    const detailedStatus = await getDetailedPermissionStatus();
    const storedSettings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    const settings = storedSettings ? JSON.parse(storedSettings) : defaultNotificationSettings;
    
    const inconsistencies = [];
    
    // Check if stored setting matches actual permission
    if (settings.pushNotifications !== detailedStatus.granted) {
      inconsistencies.push({
        type: 'permission_mismatch',
        stored: settings.pushNotifications,
        actual: detailedStatus.granted,
        message: `Stored permission (${settings.pushNotifications}) doesn't match actual permission (${detailedStatus.granted})`
      });
    }
    
    // Check for iOS-specific inconsistencies
    if (Platform.OS === 'ios' && detailedStatus.ios) {
      if (detailedStatus.granted && !detailedStatus.ios.allowsAlert) {
        inconsistencies.push({
          type: 'ios_alert_disabled',
          message: 'Notifications are granted but alerts are disabled in iOS settings'
        });
      }
    }
    
    return {
      consistent: inconsistencies.length === 0,
      inconsistencies,
      detailedStatus,
      storedSettings: settings
    };
  } catch (error) {
    debugError('Error validating permission consistency', error);
    return {
      consistent: false,
      error: error.message
    };
  }
}

export default {
  registerForPushNotificationsAsync,
  getNotificationSettings,
  saveNotificationSettings,
  getStoredPushToken,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  getScheduledNotifications,
  setupNotificationListeners,
  removeNotificationListeners,
  sendMarketAlert,
  sendBreakingNewsAlert,
  checkNotificationPermissions,
  getDetailedPermissionStatus,
  refreshPermissionStatus,
  validatePermissionConsistency,
  getDebugInfo,
  logPermissionStateChange,
};
