import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_STORAGE_KEY = '@integra_notifications';
const MARKET_ALERTS_STORAGE_KEY = '@integra_market_alerts';
const SYNC_METADATA_KEY = '@integra_sync_metadata';

class NotificationPersistenceService {
  constructor() {
    this.maxNotifications = 100; // Keep last 100 notifications
    this.maxMarketAlerts = 50; // Keep last 50 market alerts
  }

  // Save notifications to local storage
  async saveNotifications(notifications) {
    try {
      // Keep only the most recent notifications
      const trimmedNotifications = notifications.slice(0, this.maxNotifications);
      
      await AsyncStorage.setItem(
        NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(trimmedNotifications)
      );
      
      // Update sync metadata
      await this.updateSyncMetadata('notifications');
      
      return true;
    } catch (error) {
      console.error('Error saving notifications:', error);
      return false;
    }
  }

  // Load notifications from local storage
  async loadNotifications() {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Error loading notifications:', error);
      return [];
    }
  }

  // Save market alerts to local storage
  async saveMarketAlerts(alerts) {
    try {
      // Keep only the most recent alerts
      const trimmedAlerts = alerts.slice(0, this.maxMarketAlerts);
      
      await AsyncStorage.setItem(
        MARKET_ALERTS_STORAGE_KEY,
        JSON.stringify(trimmedAlerts)
      );
      
      // Update sync metadata
      await this.updateSyncMetadata('market_alerts');
      
      return true;
    } catch (error) {
      console.error('Error saving market alerts:', error);
      return false;
    }
  }

  // Load market alerts from local storage
  async loadMarketAlerts() {
    try {
      const stored = await AsyncStorage.getItem(MARKET_ALERTS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Error loading market alerts:', error);
      return [];
    }
  }

  // Merge local and remote notifications
  async mergeNotifications(localNotifications, remoteNotifications) {
    try {
      // Create a map of notifications by ID for efficient lookup
      const notificationMap = new Map();
      
      // Add local notifications first
      localNotifications.forEach(notif => {
        notificationMap.set(notif.id, notif);
      });
      
      // Merge with remote notifications (remote takes precedence)
      remoteNotifications.forEach(notif => {
        notificationMap.set(notif.id, notif);
      });
      
      // Convert back to array and sort by created_at descending
      const merged = Array.from(notificationMap.values())
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, this.maxNotifications);
      
      return merged;
    } catch (error) {
      console.error('Error merging notifications:', error);
      return remoteNotifications;
    }
  }

  // Update a single notification (e.g., mark as read)
  async updateNotification(notificationId, updates) {
    try {
      const notifications = await this.loadNotifications();
      const index = notifications.findIndex(n => n.id === notificationId);
      
      if (index !== -1) {
        notifications[index] = { ...notifications[index], ...updates };
        await this.saveNotifications(notifications);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating notification:', error);
      return false;
    }
  }

  // Mark notification as read locally
  async markAsReadLocally(notificationId) {
    return this.updateNotification(notificationId, { is_read: true });
  }

  // Get sync metadata
  async getSyncMetadata() {
    try {
      const metadata = await AsyncStorage.getItem(SYNC_METADATA_KEY);
      if (metadata) {
        return JSON.parse(metadata);
      }
      return {
        notifications_last_sync: null,
        market_alerts_last_sync: null,
        last_notification_id: null
      };
    } catch (error) {
      console.error('Error loading sync metadata:', error);
      return {
        notifications_last_sync: null,
        market_alerts_last_sync: null,
        last_notification_id: null
      };
    }
  }

  // Update sync metadata
  async updateSyncMetadata(type, additionalData = {}) {
    try {
      const metadata = await this.getSyncMetadata();
      const now = new Date().toISOString();
      
      if (type === 'notifications') {
        metadata.notifications_last_sync = now;
      } else if (type === 'market_alerts') {
        metadata.market_alerts_last_sync = now;
      }
      
      // Merge additional data
      Object.assign(metadata, additionalData);
      
      await AsyncStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(metadata));
      return true;
    } catch (error) {
      console.error('Error updating sync metadata:', error);
      return false;
    }
  }

  // Clear all cached notifications
  async clearCache() {
    try {
      await AsyncStorage.multiRemove([
        NOTIFICATIONS_STORAGE_KEY,
        MARKET_ALERTS_STORAGE_KEY,
        SYNC_METADATA_KEY
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing notification cache:', error);
      return false;
    }
  }

  // Get cache size info
  async getCacheInfo() {
    try {
      const notifications = await this.loadNotifications();
      const marketAlerts = await this.loadMarketAlerts();
      const metadata = await this.getSyncMetadata();
      
      return {
        notificationCount: notifications.length,
        marketAlertCount: marketAlerts.length,
        lastNotificationSync: metadata.notifications_last_sync,
        lastMarketAlertSync: metadata.market_alerts_last_sync,
        totalCachedItems: notifications.length + marketAlerts.length
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return {
        notificationCount: 0,
        marketAlertCount: 0,
        lastNotificationSync: null,
        lastMarketAlertSync: null,
        totalCachedItems: 0
      };
    }
  }
}

// Export singleton instance
export const notificationPersistenceService = new NotificationPersistenceService();
