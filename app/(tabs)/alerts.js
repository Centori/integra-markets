import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3',
  accentNegative: '#F05454',
  accentData: '#30A5FF',
  divider: '#333333',
};

export default function AlertsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [newsAlerts, setNewsAlerts] = useState(true);
  
  // User alert preferences - loaded from AsyncStorage
  const [alertPreferences, setAlertPreferences] = useState({
    commodities: [],
    regions: [],
    currencies: [],
    keywords: [],
    websiteURLs: [],
    alertFrequency: 'daily',
    alertThreshold: 'medium'
  });
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Load alert preferences from AsyncStorage
  useEffect(() => {
    const loadAlertPreferences = async () => {
      try {
        const storedPreferences = await AsyncStorage.getItem('alert_preferences');
        if (storedPreferences) {
          const preferences = JSON.parse(storedPreferences);
          setAlertPreferences({
            commodities: preferences.commodities || [],
            regions: preferences.regions || [],
            currencies: preferences.currencies || [],
            keywords: preferences.keywords || [],
            websiteURLs: preferences.websiteURLs || [],
            alertFrequency: preferences.alertFrequency || 'daily',
            alertThreshold: preferences.alertThreshold || 'medium'
          });
        }
        setPreferencesLoaded(true);
      } catch (error) {
        console.error('Error loading alert preferences:', error);
        setPreferencesLoaded(true);
      }
    };

    loadAlertPreferences();
  }, []);

  const alerts = [
    {
      id: 1,
      commodity: 'Crude Oil',
      message: 'Price above $75/barrel threshold',
      time: '2h ago',
      type: 'price',
      severity: 'high'
    },
    {
      id: 2,
      commodity: 'Gold',
      message: 'Breaking news: Fed policy announcement',
      time: '4h ago',
      type: 'news',
      severity: 'medium'
    },
    {
      id: 3,
      commodity: 'Natural Gas',
      message: 'Storage levels exceed seasonal average',
      time: '6h ago',
      type: 'data',
      severity: 'low'
    }
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return colors.accentNegative;
      case 'medium': return '#FFD700';
      case 'low': return colors.accentPositive;
      default: return colors.textSecondary;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'price': return 'trending-up';
      case 'news': return 'article';
      case 'data': return 'analytics';
      default: return 'notifications';
    }
  };

  const handleAlertTap = (alert) => {
    Toast.show({
      type: 'info',
      text1: alert.commodity,
      text2: alert.message
    });
  };

  const handleSettingChange = (setting, value) => {
    Toast.show({
      type: 'success',
      text1: 'Setting Updated',
      text2: `${setting} ${value ? 'enabled' : 'disabled'}`
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
        <TouchableOpacity 
          onPress={() => Toast.show({ type: 'info', text1: 'Settings', text2: 'Alert settings' })}
        >
          <MaterialIcons name="settings" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Alert Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>Receive alerts on your device</Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={(value) => {
                  setPushEnabled(value);
                  handleSettingChange('Push notifications', value);
                }}
                trackColor={{ false: colors.divider, true: colors.accentPositive }}
                thumbColor={colors.textPrimary}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email Alerts</Text>
                <Text style={styles.settingDescription}>Receive alerts via email</Text>
              </View>
              <Switch
                value={emailEnabled}
                onValueChange={(value) => {
                  setEmailEnabled(value);
                  handleSettingChange('Email alerts', value);
                }}
                trackColor={{ false: colors.divider, true: colors.accentPositive }}
                thumbColor={colors.textPrimary}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Price Alerts</Text>
                <Text style={styles.settingDescription}>Commodity price thresholds</Text>
              </View>
              <Switch
                value={priceAlerts}
                onValueChange={(value) => {
                  setPriceAlerts(value);
                  handleSettingChange('Price alerts', value);
                }}
                trackColor={{ false: colors.divider, true: colors.accentPositive }}
                thumbColor={colors.textPrimary}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>News Alerts</Text>
                <Text style={styles.settingDescription}>Breaking market news</Text>
              </View>
              <Switch
                value={newsAlerts}
                onValueChange={(value) => {
                  setNewsAlerts(value);
                  handleSettingChange('News alerts', value);
                }}
                trackColor={{ false: colors.divider, true: colors.accentPositive }}
                thumbColor={colors.textPrimary}
              />
            </View>
          </View>
        </View>

        {/* Alert Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Alert Preferences</Text>
          
          {!preferencesLoaded ? (
            <View style={styles.settingCard}>
              <Text style={styles.loadingText}>Loading preferences...</Text>
            </View>
          ) : (
            <View style={styles.settingCard}>
              {/* Commodities */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Commodities ({alertPreferences.commodities.length})</Text>
                  <Text style={styles.settingDescription}>
                    {alertPreferences.commodities.length > 0 
                      ? alertPreferences.commodities.join(', ')
                      : 'No commodities selected'
                    }
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </View>

              {/* Regions */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Regions ({alertPreferences.regions.length})</Text>
                  <Text style={styles.settingDescription}>
                    {alertPreferences.regions.length > 0 
                      ? alertPreferences.regions.join(', ')
                      : 'No regions selected'
                    }
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </View>

              {/* Currencies */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Currencies ({alertPreferences.currencies.length})</Text>
                  <Text style={styles.settingDescription}>
                    {alertPreferences.currencies.length > 0 
                      ? alertPreferences.currencies.join(', ')
                      : 'No currencies selected'
                    }
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </View>

              {/* Keywords */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Keywords ({alertPreferences.keywords.length})</Text>
                  <Text style={styles.settingDescription}>
                    {alertPreferences.keywords.length > 0 
                      ? alertPreferences.keywords.join(', ')
                      : 'No keywords added'
                    }
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </View>

              {/* Website Sources */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Website Sources ({alertPreferences.websiteURLs.length})</Text>
                  <Text style={styles.settingDescription}>
                    {alertPreferences.websiteURLs.length > 0 
                      ? alertPreferences.websiteURLs.join(', ')
                      : 'No website sources added'
                    }
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </View>

              {/* Alert Frequency */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Alert Frequency</Text>
                  <Text style={styles.settingDescription}>
                    {alertPreferences.alertFrequency.charAt(0).toUpperCase() + alertPreferences.alertFrequency.slice(1)}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </View>

              {/* Alert Threshold */}
              <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Alert Threshold</Text>
                  <Text style={styles.settingDescription}>
                    {alertPreferences.alertThreshold.charAt(0).toUpperCase() + alertPreferences.alertThreshold.slice(1)}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={styles.editPreferencesButton}
            onPress={() => Toast.show({ type: 'info', text1: 'Edit Preferences', text2: 'Navigate to preferences editor' })}
          >
            <MaterialIcons name="edit" size={20} color={colors.accentData} />
            <Text style={styles.editPreferencesText}>Edit Alert Preferences</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Recent Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Alerts</Text>
          
          {alerts.map(alert => (
            <TouchableOpacity 
              key={alert.id} 
              style={styles.alertCard}
              onPress={() => handleAlertTap(alert)}
            >
              <View style={styles.alertHeader}>
                <View style={styles.alertIconContainer}>
                  <MaterialIcons 
                    name={getTypeIcon(alert.type)} 
                    size={20} 
                    color={getSeverityColor(alert.severity)} 
                  />
                </View>
                <View style={styles.alertInfo}>
                  <Text style={styles.commodity}>{alert.commodity}</Text>
                  <Text style={styles.time}>{alert.time}</Text>
                </View>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
                  <Text style={styles.severityText}>{alert.severity.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.message}>{alert.message}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Toast.show({ type: 'info', text1: 'Add Alert', text2: 'Create new price alert' })}
          >
            <MaterialIcons name="add-alert" size={24} color={colors.accentPositive} />
            <Text style={styles.actionText}>Add Price Alert</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Toast.show({ type: 'info', text1: 'Manage', text2: 'Manage all alerts' })}
          >
            <MaterialIcons name="tune" size={24} color={colors.accentData} />
            <Text style={styles.actionText}>Manage All Alerts</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Toast.show({ type: 'info', text1: 'History', text2: 'View alert history' })}
          >
            <MaterialIcons name="history" size={24} color={colors.textSecondary} />
            <Text style={styles.actionText}>Alert History</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  settingCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  alertCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  commodity: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  time: {
    color: colors.textSecondary,
    fontSize: 12,
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
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionText: {
    color: colors.textPrimary,
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  editPreferencesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  editPreferencesText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.accentData,
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
});