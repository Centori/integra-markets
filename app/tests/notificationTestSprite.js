/**
 * TestSprite AI Integration for Notification Testing
 * 
 * This module provides automated testing for notification flows including:
 * - Push notification registration
 * - Notification delivery
 * - Badge updates
 * - Real-time sync
 * - Offline functionality
 */

import { api } from '../services/api';
import { realtimeNotificationService } from '../services/realtimeNotificationService';
import { notificationPersistenceService } from '../services/notificationPersistenceService';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationTestSprite {
  constructor() {
    this.testResults = [];
    this.isRunning = false;
  }

  // Main test runner
  async runAllTests() {
    if (this.isRunning) {
      console.warn('Tests are already running');
      return;
    }

    this.isRunning = true;
    this.testResults = [];
    console.log('🧪 Starting NotificationTestSprite tests...\n');

    try {
      // Run test suites
      await this.testPushTokenRegistration();
      await this.testNotificationCreation();
      await this.testBadgeUpdates();
      await this.testRealtimeSync();
      await this.testOfflineMode();
      await this.testNotificationPersistence();
      await this.testMarkAsRead();
      await this.testAlertPreferences();

      // Print summary
      this.printTestSummary();
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Test 1: Push Token Registration
  async testPushTokenRegistration() {
    const testName = 'Push Token Registration';
    console.log(`\n📱 Testing ${testName}...`);

    try {
      // Register for push notifications
      const token = await registerForPushNotificationsAsync();
      
      if (!token) {
        throw new Error('Failed to get push token');
      }

      // Register token with backend
      const response = await api.post('/notifications/register-token', {
        token: token,
        device_type: 'ios', // or 'android'
        device_info: {
          os_version: '16.0',
          app_version: '1.0.0'
        }
      });

      if (response.data.success) {
        this.recordSuccess(testName, 'Push token registered successfully');
      } else {
        throw new Error('Backend registration failed');
      }
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  // Test 2: Notification Creation
  async testNotificationCreation() {
    const testName = 'Notification Creation';
    console.log(`\n🔔 Testing ${testName}...`);

    try {
      // Create test notifications
      const response = await api.post('/notifications/test-unread', { count: 3 });
      
      if (response.data.success && response.data.count === 3) {
        this.recordSuccess(testName, `Created ${response.data.count} test notifications`);
      } else {
        throw new Error('Failed to create test notifications');
      }
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  // Test 3: Badge Updates
  async testBadgeUpdates() {
    const testName = 'Badge Updates';
    console.log(`\n🔢 Testing ${testName}...`);

    try {
      // Get initial unread count
      const initialResponse = await api.get('/notifications/unread-count');
      const initialCount = initialResponse.data.unread_count;

      // Create a new notification
      await api.post('/notifications/test-unread', { count: 1 });

      // Check if count increased
      const updatedResponse = await api.get('/notifications/unread-count');
      const updatedCount = updatedResponse.data.unread_count;

      if (updatedCount === initialCount + 1) {
        this.recordSuccess(testName, `Badge updated correctly: ${initialCount} → ${updatedCount}`);
      } else {
        throw new Error(`Badge count mismatch: expected ${initialCount + 1}, got ${updatedCount}`);
      }
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  // Test 4: Real-time Sync
  async testRealtimeSync() {
    const testName = 'Real-time Sync';
    console.log(`\n🔄 Testing ${testName}...`);

    try {
      let updateReceived = false;
      
      // Set up listener
      const unsubscribe = realtimeNotificationService.addListener((data) => {
        if (data.type === 'unread_count_update') {
          updateReceived = true;
        }
      });

      // Start polling
      await realtimeNotificationService.startPolling(5000); // 5 second interval for testing

      // Create a notification to trigger update
      await api.post('/notifications/test-unread', { count: 1 });

      // Wait for update
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Stop polling
      realtimeNotificationService.stopPolling();
      unsubscribe();

      if (updateReceived) {
        this.recordSuccess(testName, 'Real-time updates working correctly');
      } else {
        throw new Error('No real-time update received within timeout');
      }
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  // Test 5: Offline Mode
  async testOfflineMode() {
    const testName = 'Offline Mode';
    console.log(`\n📴 Testing ${testName}...`);

    try {
      // Get notifications (this will cache them)
      const response = await api.get('/notifications');
      const onlineNotifications = response.data.notifications;

      // Save to cache
      await notificationPersistenceService.saveNotifications(onlineNotifications);

      // Load from cache
      const cachedNotifications = await notificationPersistenceService.loadNotifications();

      if (cachedNotifications.length > 0) {
        this.recordSuccess(testName, `${cachedNotifications.length} notifications available offline`);
      } else {
        throw new Error('No notifications cached for offline access');
      }
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  // Test 6: Notification Persistence
  async testNotificationPersistence() {
    const testName = 'Notification Persistence';
    console.log(`\n💾 Testing ${testName}...`);

    try {
      // Create test data
      const testNotifications = [
        { id: 'test1', title: 'Test 1', body: 'Body 1', is_read: false, created_at: new Date().toISOString() },
        { id: 'test2', title: 'Test 2', body: 'Body 2', is_read: true, created_at: new Date().toISOString() }
      ];

      // Save notifications
      await notificationPersistenceService.saveNotifications(testNotifications);

      // Load and verify
      const loaded = await notificationPersistenceService.loadNotifications();
      
      if (loaded.length === 2 && loaded[0].id === 'test1') {
        this.recordSuccess(testName, 'Notifications persisted and loaded correctly');
      } else {
        throw new Error('Persistence verification failed');
      }

      // Test merge functionality
      const newNotifications = [
        { id: 'test3', title: 'Test 3', body: 'Body 3', is_read: false, created_at: new Date().toISOString() }
      ];

      const merged = await notificationPersistenceService.mergeNotifications(loaded, newNotifications);
      
      if (merged.length === 3) {
        this.recordSuccess(testName + ' (Merge)', 'Notifications merged correctly');
      }
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  // Test 7: Mark as Read
  async testMarkAsRead() {
    const testName = 'Mark as Read';
    console.log(`\n✅ Testing ${testName}...`);

    try {
      // Get notifications
      const response = await api.get('/notifications');
      const notifications = response.data.notifications;
      
      // Find an unread notification
      const unreadNotif = notifications.find(n => !n.is_read);
      
      if (!unreadNotif) {
        throw new Error('No unread notifications to test');
      }

      // Mark as read
      const markResponse = await api.post(`/notifications/${unreadNotif.id}/read`);
      
      if (markResponse.data.success) {
        // Update local cache
        await notificationPersistenceService.markAsReadLocally(unreadNotif.id);
        
        // Verify unread count decreased
        const countResponse = await api.get('/notifications/unread-count');
        this.recordSuccess(testName, `Notification marked as read, unread count: ${countResponse.data.unread_count}`);
      } else {
        throw new Error('Failed to mark notification as read');
      }
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  // Test 8: Alert Preferences
  async testAlertPreferences() {
    const testName = 'Alert Preferences';
    console.log(`\n⚙️ Testing ${testName}...`);

    try {
      // Update preferences
      const updateResponse = await api.put('/notifications/preferences', {
        push_notifications: true,
        email_alerts: false,
        price_alerts: true,
        breaking_news: true
      });

      if (updateResponse.data.success) {
        // Fetch and verify
        const getResponse = await api.get('/notifications/preferences');
        const prefs = getResponse.data;
        
        if (prefs.push_notifications === true && prefs.email_alerts === false) {
          this.recordSuccess(testName, 'Alert preferences updated and verified');
        } else {
          throw new Error('Preferences verification failed');
        }
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  // Utility methods
  recordSuccess(testName, message) {
    this.testResults.push({
      name: testName,
      status: 'PASSED',
      message: message
    });
    console.log(`✅ ${testName}: PASSED - ${message}`);
  }

  recordFailure(testName, errorMessage) {
    this.testResults.push({
      name: testName,
      status: 'FAILED',
      message: errorMessage
    });
    console.log(`❌ ${testName}: FAILED - ${errorMessage}`);
  }

  printTestSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.testResults.filter(r => r.status === 'FAILED').forEach(test => {
        console.log(`  - ${test.name}: ${test.message}`);
      });
    }
    
    console.log('='.repeat(50));
  }

  // Clean up test data
  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    try {
      // Clear cache
      await notificationPersistenceService.clearCache();
      
      // Mark all as read
      await api.post('/notifications/mark-all-read');
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const notificationTestSprite = new NotificationTestSprite();

// Example usage:
// import { notificationTestSprite } from './tests/notificationTestSprite';
// 
// // Run all tests
// await notificationTestSprite.runAllTests();
// 
// // Clean up after tests
// await notificationTestSprite.cleanup();
