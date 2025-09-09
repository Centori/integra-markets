# iOS Notification Testing Guide

## 📱 iOS Simulator Limitations

**Important**: iOS Simulator has significant limitations for push notifications:
- ❌ Cannot receive real push notifications from APNs (Apple Push Notification service)
- ❌ Cannot register for remote notifications
- ✅ CAN test local notifications
- ✅ CAN simulate push notifications using `.apns` files (Xcode 11.4+)

## 🧪 Testing Methods

### Method 1: Local Notifications (Works on Simulator)

Create a test component to trigger local notifications:

```javascript
// Create file: components/NotificationTester.js
import React from 'react';
import { View, Button, StyleSheet, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

export const NotificationTester = () => {
  const scheduleLocalNotification = async (type = 'default') => {
    const configs = {
      default: {
        title: '📈 Market Update',
        body: 'Gold prices surged 2.5% in early trading',
        data: { type: 'market' },
        categoryIdentifier: 'MARKET_ALERT',
      },
      alert: {
        title: '⚠️ Price Alert',
        body: 'Bitcoin dropped below your threshold of $40,000',
        data: { type: 'alert', asset: 'BTC' },
        categoryIdentifier: 'MARKET_ALERT',
      },
      news: {
        title: '📰 Breaking News',
        body: 'Fed announces surprise rate cut decision',
        data: { type: 'news' },
        categoryIdentifier: 'BREAKING_NEWS',
      },
      badge: {
        title: '🔔 New Notifications',
        body: 'You have 5 unread market alerts',
        badge: 5,
        data: { type: 'badge_test' },
      },
    };

    const config = configs[type] || configs.default;

    await Notifications.scheduleNotificationAsync({
      content: {
        ...config,
        sound: true,
      },
      trigger: {
        seconds: 2, // Show after 2 seconds
      },
    });

    Alert.alert('Test Notification', `${type} notification scheduled for 2 seconds from now`);
  };

  const testImmediateNotification = async () => {
    await Notifications.presentNotificationAsync({
      title: '🚀 Immediate Test',
      body: 'This is an immediate notification test',
      data: { immediate: true },
      sound: true,
      badge: 1,
    });
  };

  const clearBadge = async () => {
    await Notifications.setBadgeCountAsync(0);
    Alert.alert('Badge Cleared', 'Notification badge count reset to 0');
  };

  return (
    <View style={styles.container}>
      <Button 
        title="Test Market Update" 
        onPress={() => scheduleLocalNotification('default')} 
      />
      <Button 
        title="Test Price Alert" 
        onPress={() => scheduleLocalNotification('alert')} 
        color="#F05454"
      />
      <Button 
        title="Test Breaking News" 
        onPress={() => scheduleLocalNotification('news')} 
        color="#30A5FF"
      />
      <Button 
        title="Test with Badge (5)" 
        onPress={() => scheduleLocalNotification('badge')} 
        color="#4ECCA3"
      />
      <Button 
        title="Immediate Notification" 
        onPress={testImmediateNotification} 
        color="#FF9800"
      />
      <Button 
        title="Clear Badge" 
        onPress={clearBadge} 
        color="#666"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 10,
  },
});
```

### Method 2: Simulating Push Notifications with .apns Files

Create APNS payload files to simulate push notifications:

```json
// Create file: test-notifications/market-alert.apns
{
  "Simulator Target Bundle": "com.centori.integramarkets",
  "aps": {
    "alert": {
      "title": "📈 Market Alert",
      "subtitle": "Commodity Prices",
      "body": "Gold surged 3.2% following Fed announcement"
    },
    "badge": 1,
    "sound": "default",
    "category": "MARKET_ALERT"
  },
  "data": {
    "type": "market",
    "asset": "GOLD",
    "change": "+3.2%"
  }
}
```

```json
// Create file: test-notifications/breaking-news.apns
{
  "Simulator Target Bundle": "com.centori.integramarkets",
  "aps": {
    "alert": {
      "title": "📰 Breaking News",
      "body": "OPEC announces surprise production cut"
    },
    "badge": 3,
    "sound": "default",
    "category": "BREAKING_NEWS",
    "mutable-content": 1
  },
  "data": {
    "type": "news",
    "priority": "high",
    "article_id": "12345"
  }
}
```

```json
// Create file: test-notifications/price-alert.apns
{
  "Simulator Target Bundle": "com.centori.integramarkets",
  "aps": {
    "alert": {
      "title": "⚠️ Price Alert",
      "body": "Bitcoin dropped below $40,000 threshold"
    },
    "badge": 2,
    "sound": "default",
    "category": "MARKET_ALERT",
    "interruption-level": "time-sensitive"
  },
  "data": {
    "type": "price_alert",
    "asset": "BTC",
    "threshold": 40000,
    "current": 39850
  }
}
```

### Method 3: Test Script for Simulator

```bash
#!/bin/bash
# Create file: scripts/test-notifications.sh

# Function to send notification to simulator
send_notification() {
  local file=$1
  echo "📤 Sending notification: $file"
  xcrun simctl push booted com.centori.integramarkets "test-notifications/$file"
}

# Test different notification types
echo "🧪 Testing Integra Markets Notifications"
echo "========================================="

# Market alert
send_notification "market-alert.apns"
sleep 3

# Breaking news
send_notification "breaking-news.apns"
sleep 3

# Price alert
send_notification "price-alert.apns"

echo "✅ All test notifications sent!"
```

## 🚀 How to Test

### Step 1: Set Up Test Environment

```bash
# 1. Create test directories
mkdir -p test-notifications
mkdir -p components

# 2. Add NotificationTester to your app
# In App.js or a test screen, add:
import { NotificationTester } from './components/NotificationTester';

// Add to your component:
<NotificationTester />
```

### Step 2: Run iOS Simulator

```bash
# Start the iOS simulator
npm run ios

# Or specifically choose a device
npm run ios -- --simulator="iPhone 15 Pro"
```

### Step 3: Test Local Notifications (Works on Simulator)

1. Open the app in the simulator
2. Use the NotificationTester component buttons
3. Notifications will appear after 2 seconds
4. Pull down to see Notification Center

### Step 4: Test Push Notifications (Simulator with .apns files)

```bash
# Method A: Using Xcode
# 1. Open Xcode
# 2. Device menu > Simulator > Drag .apns file onto simulator

# Method B: Using Terminal
# Get the device ID
xcrun simctl list devices | grep Booted

# Send notification (replace DEVICE_ID)
xcrun simctl push DEVICE_ID com.centori.integramarkets test-notifications/market-alert.apns

# Or if only one simulator is running:
xcrun simctl push booted com.centori.integramarkets test-notifications/market-alert.apns
```

### Step 5: Make the test script executable

```bash
chmod +x scripts/test-notifications.sh
./scripts/test-notifications.sh
```

## 📱 Testing on Physical Device

For complete testing with real push notifications:

### 1. Configure Physical Device Testing

```javascript
// In your app, add device token logging
import * as Notifications from 'expo-notifications';

const registerForPushNotifications = async () => {
  const token = await Notifications.getExpoPushTokenAsync();
  console.log('📱 Device Push Token:', token.data);
  
  // Copy this token for testing
  Alert.alert('Push Token', token.data);
};
```

### 2. Use Expo Push Notification Tool

Visit: https://expo.dev/notifications

1. Enter your device's push token
2. Configure the notification:
   - Title: "📈 Market Alert"
   - Body: "Test notification from Expo"
   - Data: `{"type": "test"}`
   - Sound: Default
   - Badge: 1

### 3. Test with curl

```bash
# Send via Expo's API
curl -H "Content-Type: application/json" -X POST "https://exp.host/--/api/v2/push/send" -d '{
  "to": "ExponentPushToken[YOUR_TOKEN_HERE]",
  "title": "📈 Integra Markets",
  "body": "Gold prices surge 2.5%",
  "data": {"type": "market_alert"},
  "sound": "default",
  "badge": 1
}'
```

## 🧰 Debug Tips

### 1. Check Notification Permissions

```javascript
const checkPermissions = async () => {
  const { status } = await Notifications.getPermissionsAsync();
  console.log('Permission status:', status);
  
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    console.log('New permission status:', newStatus);
  }
};
```

### 2. Monitor Notification Events

```javascript
// Add to App.js
useEffect(() => {
  // Notification received while app is in foreground
  const subscription1 = Notifications.addNotificationReceivedListener(notification => {
    console.log('📥 Notification Received:', notification);
  });

  // User interacted with notification
  const subscription2 = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('👆 Notification Clicked:', response);
  });

  return () => {
    subscription1.remove();
    subscription2.remove();
  };
}, []);
```

### 3. Test Different States

- **Foreground**: App is open and active
- **Background**: App is minimized but running
- **Killed**: App is completely closed

Test notifications in each state to ensure proper handling.

## 🎯 Testing Checklist

- [ ] Local notifications appear correctly
- [ ] Notification icons display properly
- [ ] Badge count updates correctly
- [ ] Sound plays when expected
- [ ] Notification categories work (action buttons)
- [ ] Deep linking from notifications works
- [ ] Notifications appear in Notification Center
- [ ] Clear badge functionality works
- [ ] Different notification types have correct styling

## 🔧 Troubleshooting

### Notifications Not Appearing

1. Check permissions are granted
2. Ensure app bundle ID matches
3. Verify notification handler is set
4. Check device is not in Do Not Disturb

### Icons Not Showing

1. Verify icon files exist in correct locations
2. Check icon format (PNG, correct sizes)
3. Rebuild the app after icon changes

### Simulator Issues

```bash
# Reset simulator if notifications stop working
Device > Erase All Content and Settings

# Or via terminal
xcrun simctl erase all
```

## 📝 Quick Commands Reference

```bash
# List available simulators
xcrun simctl list devices

# Boot specific simulator
xcrun simctl boot "iPhone 15 Pro"

# Send test notification
xcrun simctl push booted com.centori.integramarkets test.apns

# Install app on simulator
xcrun simctl install booted path/to/app.app

# Open URL in simulator (for deep linking)
xcrun simctl openurl booted "integra://market/gold"

# Take screenshot
xcrun simctl io booted screenshot notification-test.png
```

---

**Note**: For production testing, always test on real devices as simulator behavior may differ from actual devices, especially for:
- Background app refresh
- Notification delivery timing
- Sound and haptic feedback
- System integration features
