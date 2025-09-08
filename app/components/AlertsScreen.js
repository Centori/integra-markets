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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HollowCircularIcon from './HollowCircularIcon';

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

const AlertsScreen = ({ onNavigateToAlertPreferences, onNavigateToBookmarks }) => {
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

  // Sample alerts data
  const [alerts] = useState([
    {
      id: '1',
      title: 'Gold Price Alert',
      message: 'Gold has increased by 2.5% in the last hour',
      time: '2 min ago',
      type: 'price',
      severity: 'high',
      read: false,
    },
    {
      id: '2',
      title: 'Oil Market Update',
      message: 'Crude oil futures showing volatility due to geopolitical tensions',
      time: '15 min ago',
      type: 'news',
      severity: 'medium',
      read: true,
    },
    {
      id: '3',
      title: 'Copper Supply Chain',
      message: 'Major copper mine disruption reported in Chile',
      time: '1 hour ago',
      type: 'news',
      severity: 'high',
      read: false,
    },
  ]);

  useEffect(() => {
    loadAlertPreferences();
  }, []);

  const loadAlertPreferences = async () => {
    try {
      const savedPreferences = await AsyncStorage.getItem('alert_preferences');
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        setAlertPreferences(preferences);
      }
    } catch (error) {
      console.error('Error loading alert preferences:', error);
    } finally {
      setPreferencesLoaded(true);
    }
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

  const handleAlertTap = (alertId) => {
    console.log('Alert tapped:', alertId);
  };

  const handleSettingChange = (setting, value) => {
    switch (setting) {
      case 'push':
        setPushAlerts(value);
        break;
      case 'email':
        setEmailAlerts(value);
        break;
      case 'price':
        setPriceAlerts(value);
        break;
      case 'news':
        setNewsAlerts(value);
        break;
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
        <TouchableOpacity 
          style={styles.bookmarkButton}
          onPress={onNavigateToBookmarks}
        >
          <MaterialIcons name="bookmark" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* Recent Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Alerts</Text>
          {alerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={[styles.alertItem, !alert.read && styles.unreadAlert]}
              onPress={() => handleAlertTap(alert.id)}
            >
              <View style={styles.alertIcon}>
                <HollowCircularIcon
                  name={getTypeIcon(alert.type)}
                  size={20}
                  color={getSeverityColor(alert.severity)}
                  padding={4}
                />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertTime}>{alert.time}</Text>
              </View>
              {!alert.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}
        </View>

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
  bookmarkButton: {
    padding: 4,
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
});

export default AlertsScreen;