import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Debug script to check notification permissions
export async function debugNotificationPermissions() {
  console.log('=== NOTIFICATION DEBUG START ===');
  console.log('Platform:', Platform.OS);
  
  try {
    // Check current permissions
    const permissions = await Notifications.getPermissionsAsync();
    console.log('Current permissions:', JSON.stringify(permissions, null, 2));
    
    // Check if we can get device push token
    if (permissions.status === 'granted') {
      try {
        const token = await Notifications.getExpoPushTokenAsync();
        console.log('Push token available:', !!token?.data);
        console.log('Token preview:', token?.data?.substring(0, 50) + '...');
      } catch (tokenError) {
        console.error('Error getting push token:', tokenError);
      }
    }
    
    // Check device push token without Expo
    if (Platform.OS === 'ios') {
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        console.log('Device push token available:', !!deviceToken?.data);
      } catch (deviceError) {
        console.error('Error getting device token:', deviceError);
      }
    }
    
  } catch (error) {
    console.error('Error checking permissions:', error);
  }
  
  console.log('=== NOTIFICATION DEBUG END ===');
}

// Test requesting permissions
export async function testRequestPermissions() {
  console.log('=== TESTING PERMISSION REQUEST ===');
  
  try {
    const result = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowDisplayInCarPlay: false,
        allowCriticalAlerts: false,
        provideAppNotificationSettings: false,
        allowProvisional: false,
        allowAnnouncements: false,
      },
    });
    
    console.log('Permission request result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return null;
  }
}