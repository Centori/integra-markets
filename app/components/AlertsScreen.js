import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HollowCircularIcon from './HollowCircularIcon';
import { api } from '../services/api';
import { realtimeNotificationService } from '../services/realtimeNotificationService';
import { notificationPersistenceService } from '../services/notificationPersistenceService';

// Color Palette
const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  bgTertiary: '#252525',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3',
  accentNegative: '#F05454',
  accentNeutral: '#EAB308',
  accentData: '#30A5FF',
  divider: '#333333',
  cardBorder: '#2A2A2A',
};

const AlertsScreen = ({ onNavigateToAlertPreferences, onUnreadCountChange }) => {
  const [alertPreferences, setAlertPreferences] = useState({
    commodities: [],
    regions: [],
    currencies: [],
    keywords: [],
    websiteURLs: [],
    alertFrequency: 'Real-time',
    alertThreshold: 'Medium',
    pushNotifications: true,
    emailAlerts: false,
  });
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [newsAlerts, setNewsAlerts] = useState(true);
  
  // Real notifications from API
  const [notifications, setNotifications] = useState([]);
  const [marketAlerts, setMarketAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAlertPreferences();
    loadNotifications();
    loadMarketAlerts();
    
    // Subscribe to real-time updates
    const unsubscribe = realtimeNotificationService.addListener((data) => {
      if (data.type === 'new_notifications' || data.type === 'unread_count_update') {
        // Reload notifications when updates are detected
        loadNotifications();
        if (data.type === 'new_notifications') {
          loadMarketAlerts(); // Also refresh market alerts
        }
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const loadAlertPreferences = async () => {
    try {
      // Try to load from API first
      const response = await api.get('/notifications/preferences');
      if (response.data) {
        setAlertPreferences(response.data);
        setPushAlerts(response.data.push_notifications);
        setEmailAlerts(response.data.email_alerts);
        setPriceAlerts(response.data.price_alerts);
        setNewsAlerts(response.data.breaking_news);
        
        // Save to local storage
        await AsyncStorage.setItem('alert_preferences', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Error loading preferences from API:', error);
      // Fallback to local storage
      const savedPreferences = await AsyncStorage.getItem('alert_preferences');
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        setAlertPreferences(preferences);
      }
    } finally {
      setPreferencesLoaded(true);
    }
  };
  
  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, load cached notifications for immediate display
      const cachedNotifications = await notificationPersistenceService.loadNotifications();
      if (cachedNotifications.length > 0) {
        setNotifications(cachedNotifications);
        // Calculate unread count from cached data
        const cachedUnread = cachedNotifications.filter(n => !n.is_read).length;
        setUnreadCount(cachedUnread);
        if (onUnreadCountChange) {
          onUnreadCountChange(cachedUnread);
        }
      }
      
      // Then fetch from API
      try {
        const response = await api.get('/notifications');
        if (response.data) {
          const remoteNotifications = response.data.notifications || [];
          
          // Merge with cached notifications
          const merged = await notificationPersistenceService.mergeNotifications(
            cachedNotifications,
            remoteNotifications
          );
          
          // Save merged notifications to cache
          await notificationPersistenceService.saveNotifications(merged);
          
          setNotifications(merged);
          const newUnreadCount = response.data.unread_count || 0;
          setUnreadCount(newUnreadCount);
          if (onUnreadCountChange) {
            onUnreadCountChange(newUnreadCount);
          }
        }
      } catch (apiError) {
        console.error('Error fetching notifications from API:', apiError);
        // If API fails but we have cached data, don't show error
        if (cachedNotifications.length === 0) {
          setError('Unable to load notifications. Please check your connection.');
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };
  
  const loadMarketAlerts = async () => {
    try {
      // Load cached market alerts first
      const cachedAlerts = await notificationPersistenceService.loadMarketAlerts();
      if (cachedAlerts.length > 0) {
        setMarketAlerts(cachedAlerts);
      }
      
      // Then fetch from API
      try {
        const response = await api.get('/notifications/market-alerts', {
          params: { limit: 10 }
        });
        if (response.data) {
          const remoteAlerts = response.data.alerts || [];
          setMarketAlerts(remoteAlerts);
          
          // Save to cache
          await notificationPersistenceService.saveMarketAlerts(remoteAlerts);
        }
      } catch (apiError) {
        console.error('Error fetching market alerts from API:', apiError);
        // Continue with cached data if API fails
      }
    } catch (error) {
      console.error('Error loading market alerts:', error);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadNotifications(),
      loadMarketAlerts(),
      loadAlertPreferences()
    ]);
    setRefreshing(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return colors.accentNegative;
      case 'medium':
        return colors.accentNeutral;
      case 'low':
        return colors.accentPositive;
      default:
        return colors.textSecondary;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'price':
        return 'trending-up';
      case 'news':
        return 'article';
      case 'threshold':
        return 'warning';
      default:
        return 'notifications';
    }
  };

  const handleAlertTap = async (alert) => {
    console.log('Alert tapped:', alert.id);
    
    // Mark as read if not already
    if (!alert.is_read) {
      try {
        await api.post(`/notifications/${alert.id}/read`);
        // Update local state
        const updatedNotifications = notifications.map(n => 
          n.id === alert.id ? { ...n, is_read: true } : n
        );
        setNotifications(updatedNotifications);
        
        // Update cached notification
        await notificationPersistenceService.markAsReadLocally(alert.id);
        
        const newUnreadCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newUnreadCount);
        if (onUnreadCountChange) {
          onUnreadCountChange(newUnreadCount);
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    // TODO: Navigate to relevant screen based on alert type
  };
  
  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const handleSettingChange = async (setting, value) => {
    try {
      let updateData = {};
      
      switch (setting) {
        case 'push':
          setPushAlerts(value);
          updateData.push_notifications = value;
          break;
        case 'email':
          setEmailAlerts(value);
          updateData.email_alerts = value;
          break;
        case 'price':
          setPriceAlerts(value);
          updateData.price_alerts = value;
          break;
        case 'news':
          setNewsAlerts(value);
          updateData.breaking_news = value;
          break;
      }
      
      // Update preferences on server
      await api.put('/notifications/preferences', updateData);
      
      // Update local storage
      const updatedPrefs = { ...alertPreferences, ...updateData };
      await AsyncStorage.setItem('alert_preferences', JSON.stringify(updatedPrefs));
      setAlertPreferences(updatedPrefs);
      
    } catch (error) {
      console.error('Error updating setting:', error);
      // Revert on error
      switch (setting) {
        case 'push': setPushAlerts(!value); break;
        case 'email': setEmailAlerts(!value); break;
        case 'price': setPriceAlerts(!value); break;
        case 'news': setNewsAlerts(!value); break;
      }
    }
  };

  const renderPreferenceItem = (label, items, emptyMessage) => {
    if (!preferencesLoaded) {
      return (
        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>{label}:</Text>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    return (
      <View style={styles.preferenceItem}>
        <Text style={styles.preferenceLabel}>{label}:</Text>
        <Text style={styles.preferenceValue}>
          {items && items.length > 0 ? items.join(', ') : emptyMessage}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentPositive}
          />
        }
      >
        {/* Alert Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Preferences</Text>
          <View style={styles.preferencesContainer}>
            {renderPreferenceItem(
              'Commodities',
              alertPreferences.commodities,
              'No commodities selected'
            )}
            {renderPreferenceItem(
              'Regions',
              alertPreferences.regions,
              'No regions selected'
            )}
            {renderPreferenceItem(
              'Currencies',
              alertPreferences.currencies,
              'No currencies selected'
            )}
            {renderPreferenceItem(
              'Keywords',
              alertPreferences.keywords,
              'No keywords added'
            )}
            {renderPreferenceItem(
              'Website Sources',
              alertPreferences.websiteURLs,
              'No website sources added'
            )}
            
            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceLabel}>Alert Frequency:</Text>
              <Text style={styles.preferenceValue}>
                {preferencesLoaded ? alertPreferences.alertFrequency : 'Loading...'}
              </Text>
            </View>
            
            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceLabel}>Alert Threshold:</Text>
              <Text style={styles.preferenceValue}>
                {preferencesLoaded ? alertPreferences.alertThreshold : 'Loading...'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.editPreferencesButton}
            onPress={onNavigateToAlertPreferences}
          >
            <Text style={styles.editPreferencesText}>Edit Alert Preferences</Text>
          </TouchableOpacity>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Switch
              value={pushAlerts}
              onValueChange={(value) => handleSettingChange('push', value)}
              trackColor={{ false: colors.bgSecondary, true: colors.accentPositive }}
              thumbColor={pushAlerts ? colors.textPrimary : colors.textSecondary}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Email Alerts</Text>
            <Switch
              value={emailAlerts}
              onValueChange={(value) => handleSettingChange('email', value)}
              trackColor={{ false: colors.bgSecondary, true: colors.accentPositive }}
              thumbColor={emailAlerts ? colors.textPrimary : colors.textSecondary}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Price Alerts</Text>
            <Switch
              value={priceAlerts}
              onValueChange={(value) => handleSettingChange('price', value)}
              trackColor={{ false: colors.bgSecondary, true: colors.accentPositive }}
              thumbColor={priceAlerts ? colors.textPrimary : colors.textSecondary}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>News Alerts</Text>
            <Switch
              value={newsAlerts}
              onValueChange={(value) => handleSettingChange('news', value)}
              trackColor={{ false: colors.bgSecondary, true: colors.accentPositive }}
              thumbColor={newsAlerts ? colors.textPrimary : colors.textSecondary}
            />
          </View>
        </View>

        {/* Recent Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          
          {loading ? (
            <ActivityIndicator size="large" color={colors.accentPositive} style={styles.loader} />
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={loadNotifications} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="notifications-none" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySubtext}>You'll see market alerts and updates here</Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[styles.alertItem, !notification.is_read && styles.unreadAlert]}
                onPress={() => handleAlertTap(notification)}
              >
                <View style={styles.alertIcon}>
                  <HollowCircularIcon
                    name={getTypeIcon(notification.type)}
                    size={20}
                    color={getSeverityColor(notification.severity)}
                    padding={4}
                  />
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>{notification.title}</Text>
                  <Text style={styles.alertMessage}>{notification.body}</Text>
                  <View style={styles.alertMeta}>
                    <Text style={styles.alertTime}>{formatTimeAgo(notification.created_at)}</Text>
                    {notification.commodity && (
                      <Text style={styles.alertCommodity}>{notification.commodity}</Text>
                    )}
                  </View>
                </View>
                {!notification.is_read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))
          )}
        </View>
        
        {/* Market Alerts Section */}
        {marketAlerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Market Alerts</Text>
            {marketAlerts.map((alert) => (
              <View key={alert.id} style={styles.marketAlertItem}>
                <View style={styles.marketAlertHeader}>
                  <Text style={styles.marketAlertCommodity}>{alert.commodity}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
                    <Text style={styles.severityText}>{alert.severity.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.marketAlertMessage}>{alert.message}</Text>
                {alert.change_percent && (
                  <View style={styles.marketAlertStats}>
                    <MaterialIcons 
                      name={alert.change_percent > 0 ? "trending-up" : "trending-down"} 
                      size={16} 
                      color={alert.change_percent > 0 ? colors.accentPositive : colors.accentNegative} 
                    />
                    <Text style={[
                      styles.changePercent,
                      { color: alert.change_percent > 0 ? colors.accentPositive : colors.accentNegative }
                    ]}>
                      {Math.abs(alert.change_percent).toFixed(2)}%
                    </Text>
                    {alert.current_price && (
                      <Text style={styles.currentPrice}>${alert.current_price.toFixed(2)}</Text>
                    )}
                  </View>
                )}
                <Text style={styles.marketAlertTime}>{formatTimeAgo(alert.created_at)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <HollowCircularIcon name="add" size={20} color={colors.accentData} padding={4} />
            <Text style={styles.actionText}>Add New Alert</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <HollowCircularIcon name="settings" size={20} color={colors.accentData} padding={4} />
            <Text style={styles.actionText}>Manage Alerts</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <HollowCircularIcon name="history" size={20} color={colors.accentData} padding={4} />
            <Text style={styles.actionText}>View Alert History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 15,
  },
  preferencesContainer: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  preferenceValue: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 2,
    textAlign: 'right',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'right',
    flex: 2,
  },
  editPreferencesButton: {
    backgroundColor: colors.accentData,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  editPreferencesText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  unreadAlert: {
    backgroundColor: colors.bgTertiary,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentPositive,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  actionText: {
    fontSize: 16,
    color: colors.accentData,
    marginLeft: 10,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  unreadBadge: {
    backgroundColor: colors.accentNegative,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unreadBadgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  loader: {
    marginVertical: 40,
  },
  errorContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.accentData,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  alertCommodity: {
    fontSize: 12,
    color: colors.accentData,
    marginLeft: 8,
    fontWeight: '500',
  },
  marketAlertItem: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  marketAlertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  marketAlertCommodity: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: colors.bgPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  marketAlertMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  marketAlertStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  changePercent: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    marginRight: 8,
  },
  currentPrice: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  marketAlertTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default AlertsScreen;