import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications are handled when the app is running
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
 * Register for push notifications and get push token
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
      });
      
      await Notifications.setNotificationChannelAsync('breaking-news', {
        name: 'Breaking News',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#30A5FF',
        sound: 'breaking_news.wav',
      });
    }

    // Check existing permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // If permission not granted, show user-friendly message
    if (finalStatus !== 'granted') {
      Alert.alert('Notifications Disabled', 'Enable notifications in settings to receive market alerts');
      return null;
    }

    // Get push token
    token = await Notifications.getExpoPushTokenAsync();
    
    // Store the token locally
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token.data);
    
    console.log('Push notification token obtained:', token.data);
    return token.data;
    
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    Alert.alert('Notification Error', 'Failed to setup push notifications');
    return null;
  }
}

/**
 * Get current notification settings
 */
export async function getNotificationSettings() {
  try {
    const settings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return settings ? JSON.parse(settings) : defaultNotificationSettings;
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return defaultNotificationSettings;
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

  const title = `${commodity} Alert`;
  const body = `Price ${change > 0 ? 'increased' : 'decreased'} to $${price}`;
  
  return await scheduleLocalNotification(title, body, {
    type: 'market_alert',
    commodity,
    change,
    price,
  });
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
  
  return await scheduleLocalNotification(title, body, {
    type: 'breaking_news',
    source,
  });
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
};
