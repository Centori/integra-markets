import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Platform 
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Colors } from '../constants/colors';

export const NotificationTester = () => {
  const [pushToken, setPushToken] = useState('');
  const [notification, setNotification] = useState(null);
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    // Get push token
    registerForPushNotificationsAsync().then(token => setPushToken(token || 'Not available'));

    // Listen for notifications
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      console.log('📥 Notification Received:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification Clicked:', response);
      Alert.alert(
        'Notification Interaction',
        `You clicked on: ${response.notification.request.content.title}`
      );
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  const registerForPushNotificationsAsync = async () => {
    let token;
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4ECCA3',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Failed to get push token for push notification!');
      return;
    }
    
    try {
      token = await Notifications.getExpoPushTokenAsync();
      console.log('Push Token:', token.data);
    } catch (error) {
      console.log('Error getting push token:', error);
    }

    return token?.data;
  };

  const scheduleLocalNotification = async (type = 'default') => {
    const configs = {
      default: {
        title: '📈 Market Update',
        body: 'Gold prices surged 2.5% in early trading',
        data: { type: 'market' },
        categoryIdentifier: 'MARKET_ALERT',
        badge: 1,
      },
      alert: {
        title: '⚠️ Price Alert',
        body: 'Bitcoin dropped below your threshold of $40,000',
        data: { type: 'alert', asset: 'BTC' },
        categoryIdentifier: 'MARKET_ALERT',
        badge: 2,
      },
      news: {
        title: '📰 Breaking News',
        body: 'Fed announces surprise rate cut decision',
        data: { type: 'news' },
        categoryIdentifier: 'BREAKING_NEWS',
        badge: 3,
      },
      badge: {
        title: '🔔 New Notifications',
        body: 'You have 5 unread market alerts',
        badge: 5,
        data: { type: 'badge_test' },
      },
      custom: {
        title: '🎯 Custom Alert',
        subtitle: 'Integra Markets',
        body: 'Testing new notification icon designs',
        data: { type: 'custom', test: true },
        badge: badgeCount + 1,
      },
    };

    const config = configs[type] || configs.default;

    await Notifications.scheduleNotificationAsync({
      content: {
        ...config,
        sound: true,
      },
      trigger: {
        seconds: 2,
      },
    });

    Alert.alert('Test Notification', `${type} notification scheduled for 2 seconds from now`);
    setBadgeCount(config.badge || badgeCount + 1);
  };

  const testImmediateNotification = async () => {
    await Notifications.presentNotificationAsync({
      title: '🚀 Immediate Test',
      body: 'This is an immediate notification test with the new icon',
      data: { immediate: true },
      sound: true,
      badge: 1,
    });
    setBadgeCount(1);
  };

  const clearBadge = async () => {
    await Notifications.setBadgeCountAsync(0);
    setBadgeCount(0);
    Alert.alert('Badge Cleared', 'Notification badge count reset to 0');
  };

  const setBadgeToNumber = async (num) => {
    await Notifications.setBadgeCountAsync(num);
    setBadgeCount(num);
    Alert.alert('Badge Set', `Badge count set to ${num}`);
  };

  const showPushToken = () => {
    Alert.alert(
      'Push Token',
      pushToken || 'No token available',
      [
        { text: 'Copy', onPress: () => console.log('Token:', pushToken) },
        { text: 'OK', style: 'cancel' }
      ]
    );
  };

  const checkPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    Alert.alert('Permission Status', `Notifications are ${status}`);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Notification Test Suite</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>
            Badge Count: {badgeCount}
          </Text>
          <Text style={styles.statusText} numberOfLines={2}>
            Token: {pushToken ? '✅ Available' : '❌ Not available'}
          </Text>
          {notification && (
            <Text style={styles.statusText}>
              Last: {notification.request.content.title}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Notifications</Text>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: Colors.accent }]}
          onPress={() => scheduleLocalNotification('default')}
        >
          <Text style={styles.buttonText}>📈 Market Update</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#F05454' }]}
          onPress={() => scheduleLocalNotification('alert')}
        >
          <Text style={styles.buttonText}>⚠️ Price Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#30A5FF' }]}
          onPress={() => scheduleLocalNotification('news')}
        >
          <Text style={styles.buttonText}>📰 Breaking News</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#4ECCA3' }]}
          onPress={() => scheduleLocalNotification('badge')}
        >
          <Text style={styles.buttonText}>🔔 Test Badge (5)</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#9C27B0' }]}
          onPress={() => scheduleLocalNotification('custom')}
        >
          <Text style={styles.buttonText}>🎯 Custom Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#FF9800' }]}
          onPress={testImmediateNotification}
        >
          <Text style={styles.buttonText}>🚀 Immediate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Badge Control</Text>
        
        <View style={styles.badgeRow}>
          <TouchableOpacity 
            style={[styles.badgeButton, { backgroundColor: '#2196F3' }]}
            onPress={() => setBadgeToNumber(1)}
          >
            <Text style={styles.buttonText}>1</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.badgeButton, { backgroundColor: '#2196F3' }]}
            onPress={() => setBadgeToNumber(5)}
          >
            <Text style={styles.buttonText}>5</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.badgeButton, { backgroundColor: '#2196F3' }]}
            onPress={() => setBadgeToNumber(10)}
          >
            <Text style={styles.buttonText}>10</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.badgeButton, { backgroundColor: '#2196F3' }]}
            onPress={() => setBadgeToNumber(99)}
          >
            <Text style={styles.buttonText}>99</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#666' }]}
          onPress={clearBadge}
        >
          <Text style={styles.buttonText}>Clear Badge</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Debug Tools</Text>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#795548' }]}
          onPress={checkPermissions}
        >
          <Text style={styles.buttonText}>Check Permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#607D8B' }]}
          onPress={showPushToken}
        >
          <Text style={styles.buttonText}>Show Push Token</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {Platform.OS === 'ios' && '🍎 iOS Simulator'}
          {Platform.OS === 'android' && '🤖 Android'}
        </Text>
        <Text style={styles.footerText}>
          Local notifications will work on simulator
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#555',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badgeButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
});

export default NotificationTester;
