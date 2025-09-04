import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

class RealtimeNotificationService {
  constructor() {
    this.pollingInterval = null;
    this.listeners = new Set();
    this.lastNotificationId = null;
    this.unreadCount = 0;
    this.isPolling = false;
    this.pollingIntervalMs = 30000; // 30 seconds default
  }

  // Add a listener for notification updates
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners of updates
  notifyListeners(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Start polling for notifications
  async startPolling(intervalMs = 30000) {
    if (this.isPolling) {
      console.log('Notification polling already active');
      return;
    }

    this.pollingIntervalMs = intervalMs;
    this.isPolling = true;

    // Load last notification ID from storage
    try {
      const lastId = await AsyncStorage.getItem('last_notification_id');
      if (lastId) {
        this.lastNotificationId = lastId;
      }
    } catch (error) {
      console.error('Error loading last notification ID:', error);
    }

    // Initial fetch
    await this.checkForUpdates();

    // Set up polling interval
    this.pollingInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.pollingIntervalMs);

    console.log(`Started notification polling (interval: ${intervalMs}ms)`);
  }

  // Stop polling
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    console.log('Stopped notification polling');
  }

  // Check for notification updates
  async checkForUpdates() {
    try {
      // Fetch latest notifications
      const response = await api.get('/notifications', {
        params: {
          limit: 10,
          offset: 0
        }
      });

      if (response.data) {
        const { notifications, unread_count } = response.data;
        
        // Check if unread count changed
        const unreadCountChanged = unread_count !== this.unreadCount;
        this.unreadCount = unread_count;

        // Check for new notifications
        let hasNewNotifications = false;
        if (notifications && notifications.length > 0) {
          const latestId = notifications[0].id;
          
          if (this.lastNotificationId && latestId !== this.lastNotificationId) {
            hasNewNotifications = true;
            
            // Find all new notifications
            const newNotifications = [];
            for (const notif of notifications) {
              if (notif.id === this.lastNotificationId) break;
              newNotifications.push(notif);
            }

            // Store new last notification ID
            this.lastNotificationId = latestId;
            await AsyncStorage.setItem('last_notification_id', latestId);

            // Notify about new notifications
            if (newNotifications.length > 0) {
              this.notifyListeners({
                type: 'new_notifications',
                notifications: newNotifications,
                unreadCount: unread_count
              });
            }
          } else if (!this.lastNotificationId && notifications.length > 0) {
            // First time, just store the latest ID
            this.lastNotificationId = latestId;
            await AsyncStorage.setItem('last_notification_id', latestId);
          }
        }

        // Notify about unread count change
        if (unreadCountChanged || hasNewNotifications) {
          this.notifyListeners({
            type: 'unread_count_update',
            unreadCount: unread_count,
            hasNewNotifications
          });
        }
      }
    } catch (error) {
      console.error('Error checking for notification updates:', error);
    }
  }

  // Get current unread count
  getUnreadCount() {
    return this.unreadCount;
  }

  // Force refresh
  async refresh() {
    await this.checkForUpdates();
  }

  // Update polling interval
  updatePollingInterval(intervalMs) {
    if (this.isPolling) {
      this.stopPolling();
      this.startPolling(intervalMs);
    } else {
      this.pollingIntervalMs = intervalMs;
    }
  }
}

// Export singleton instance
export const realtimeNotificationService = new RealtimeNotificationService();
