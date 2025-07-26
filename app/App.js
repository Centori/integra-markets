// Full Integra App v1.0 - TestFlight Ready with All Features
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import all components
import IntegraLoadingPage from './components/IntegraLoadingPage';
import AuthLoadingScreen from './components/AuthLoadingScreen';
import OnboardingForm from './components/OnboardingForm';
import AlertPreferencesForm from './components/AlertPreferencesForm';
import NewsCard from './components/NewsCard';
import AIAnalysisOverlay from './components/AIAnalysisOverlay';

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

// Sample news data
const sampleNewsData = [
  {
    id: '1',
    title: 'Oil Prices Surge as OPEC Announces Production Cuts',
    summary: 'Major oil producers agree to reduce output by 2 million barrels per day, sending crude prices up 5% in early trading.',
    source: 'Bloomberg',
    timestamp: '2 hours ago',
    sentiment: 'BULLISH',
    sentimentScore: 0.82,
    keyDrivers: ['OPEC production cuts', 'Supply constraints', 'Strong demand outlook'],
    marketImpact: 'HIGH',
    commodities: ['Crude Oil', 'Natural Gas'],
  },
  {
    id: '2',
    title: 'Wheat Futures Fall on Improved Weather Conditions',
    summary: 'Better than expected rainfall in key growing regions eases drought concerns, pushing wheat prices lower.',
    source: 'Reuters',
    timestamp: '4 hours ago',
    sentiment: 'BEARISH',
    sentimentScore: 0.65,
    keyDrivers: ['Improved weather', 'Higher yield expectations', 'Reduced supply concerns'],
    marketImpact: 'MEDIUM',
    commodities: ['Wheat', 'Corn'],
  },
  {
    id: '3',
    title: 'Gold Holds Steady Amid Mixed Economic Signals',
    summary: 'Precious metal trades in tight range as investors weigh inflation concerns against dollar strength.',
    source: 'Financial Times',
    timestamp: '6 hours ago',
    sentiment: 'NEUTRAL',
    sentimentScore: 0.50,
    keyDrivers: ['Dollar strength', 'Inflation hedge demand', 'Central bank policies'],
    marketImpact: 'LOW',
    commodities: ['Gold', 'Silver'],
  },
];

// Profile Screen Component
const ProfileScreen = ({ onNavigateHome, userData, onResetData }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onNavigateHome} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <MaterialIcons name="person" size={40} color={colors.bgPrimary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {userData?.name || 'Integra User'}
              </Text>
              <Text style={styles.profileEmail}>
                {userData?.email || 'user@integramarkets.com'}
              </Text>
            </View>
          </View>

          <View style={styles.settingsSection}>
            <TouchableOpacity style={styles.settingsItem}>
              <MaterialIcons name="notifications" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsText}>Notification Settings</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsItem}>
              <MaterialIcons name="tune" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsText}>Alert Preferences</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsItem}>
              <MaterialIcons name="privacy-tip" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsText}>Privacy Policy</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsItem}>
              <MaterialIcons name="article" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsText}>Terms of Service</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsItem} onPress={onResetData}>
              <MaterialIcons name="refresh" size={20} color={colors.accentNegative} />
              <Text style={[styles.settingsText, { color: colors.accentNegative }]}>Reset App Data</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.accentNegative} />
            </TouchableOpacity>
          </View>

          <View style={styles.appInfo}>
            <Text style={styles.appVersion}>Integra Markets v1.0.0</Text>
            <Text style={styles.appSubtext}>AI-powered commodity trading insights</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

// Main App Component
const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAlertPreferences, setShowAlertPreferences] = useState(false);
  const [activeNav, setActiveNav] = useState('Today');
  const [activeFilter, setActiveFilter] = useState('All');
  const [userData, setUserData] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  // Check app state on mount
  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
      const alertsCompleted = await AsyncStorage.getItem('alerts_completed');
      const storedUserData = await AsyncStorage.getItem('user_data');
      
      if (storedUserData) {
        setUserData(JSON.parse(storedUserData));
      }
      
      if (onboardingCompleted !== 'true') {
        setShowAuth(true);
      } else if (alertsCompleted !== 'true') {
        setShowAlertPreferences(true);
      }
    } catch (error) {
      console.error('Error checking app state:', error);
    }
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  const handleAuthComplete = (authData) => {
    setUserData(authData);
    setShowAuth(false);
    setShowOnboarding(true);
  };

  const handleAuthSkip = () => {
    setShowAuth(false);
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = async (formData) => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      await AsyncStorage.setItem('user_data', JSON.stringify({ ...userData, ...formData }));
      setUserData({ ...userData, ...formData });
      setShowOnboarding(false);
      setShowAlertPreferences(true);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    setShowAlertPreferences(true);
  };

  const handleAlertPreferencesComplete = async (preferences) => {
    try {
      await AsyncStorage.setItem('alerts_completed', 'true');
      await AsyncStorage.setItem('alert_preferences', JSON.stringify(preferences));
      setShowAlertPreferences(false);
    } catch (error) {
      console.error('Error saving alert preferences:', error);
    }
  };

  const handleAlertPreferencesSkip = async () => {
    try {
      await AsyncStorage.setItem('alerts_completed', 'true');
      setShowAlertPreferences(false);
    } catch (error) {
      console.error('Error skipping alerts:', error);
    }
  };

  const resetAppData = async () => {
    Alert.alert(
      'Reset App Data',
      'This will clear all your preferences and data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              setUserData(null);
              setActiveNav('Today');
              setShowAuth(true);
              Alert.alert(
                'Success',
                'All preferences have been cleared',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error resetting app:', error);
            }
          },
        },
      ]
    );
  };

  const handleArticlePress = (article) => {
    setSelectedArticle(article);
    setShowAIAnalysis(true);
  };

  const getFilteredNews = () => {
    if (activeFilter === 'All') return sampleNewsData;
    return sampleNewsData.filter(item => item.sentiment === activeFilter.toUpperCase());
  };

  // Render bottom navigation
  const renderBottomNav = () => (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => setActiveNav('Today')}
      >
        <MaterialIcons
          name="flash-on"
          size={24}
          color={activeNav === 'Today' ? colors.accentPositive : colors.textSecondary}
        />
        <Text style={[styles.navLabel, activeNav === 'Today' && styles.activeNavLabel]}>
          Today
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => setActiveNav('Alerts')}
      >
        <MaterialIcons
          name="notifications"
          size={24}
          color={activeNav === 'Alerts' ? colors.accentPositive : colors.textSecondary}
        />
        <Text style={[styles.navLabel, activeNav === 'Alerts' && styles.activeNavLabel]}>
          Alerts
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => setActiveNav('Profile')}
      >
        <MaterialIcons
          name="person"
          size={24}
          color={activeNav === 'Profile' ? colors.accentPositive : colors.textSecondary}
        />
        <Text style={[styles.navLabel, activeNav === 'Profile' && styles.activeNavLabel]}>
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render loading screen
  if (isLoading) {
    return <IntegraLoadingPage onLoadingComplete={handleLoadingComplete} />;
  }

  // Render auth screen
  if (showAuth) {
    return (
      <AuthLoadingScreen
        onAuthComplete={handleAuthComplete}
        onSkip={handleAuthSkip}
      />
    );
  }

  // Render onboarding
  if (showOnboarding) {
    return (
      <OnboardingForm
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        showSkipOption={true}
        userData={userData}
      />
    );
  }

  // Render alert preferences
  if (showAlertPreferences) {
    return (
      <AlertPreferencesForm
        onComplete={handleAlertPreferencesComplete}
        onSkip={handleAlertPreferencesSkip}
        showSkipOption={true}
      />
    );
  }

  // Render profile screen
  if (activeNav === 'Profile') {
    return (
      <ProfileScreen
        onNavigateHome={() => setActiveNav('Today')}
        userData={userData}
        onResetData={resetAppData}
      />
    );
  }

  // Render alerts screen
  if (activeNav === 'Alerts') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Alerts</Text>
          </View>
          <View style={styles.alertsContainer}>
            <MaterialIcons name="notifications" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No alerts yet</Text>
            <Text style={styles.emptySubtext}>We'll notify you when important market events occur</Text>
            <TouchableOpacity
              style={styles.setupAlertsButton}
              onPress={() => setShowAlertPreferences(true)}
            >
              <Text style={styles.setupAlertsText}>Setup Alerts</Text>
            </TouchableOpacity>
          </View>
          {renderBottomNav()}
        </View>
      </SafeAreaView>
    );
  }

  // Main news feed screen
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today</Text>
          <TouchableOpacity>
            <MaterialIcons name="notifications-none" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['All', 'Bullish', 'Neutral', 'Bearish'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.activeFilterChip]}
              onPress={() => setActiveFilter(filter)}
            >
              {filter === 'Bullish' && <MaterialIcons name="trending-up" size={14} color={activeFilter === filter ? colors.bgPrimary : colors.textSecondary} />}
              {filter === 'Bearish' && <MaterialIcons name="trending-down" size={14} color={activeFilter === filter ? colors.bgPrimary : colors.textSecondary} />}
              {filter === 'Neutral' && <MaterialIcons name="trending-flat" size={14} color={activeFilter === filter ? colors.bgPrimary : colors.textSecondary} />}
              <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView style={styles.feed} showsVerticalScrollIndicator={false}>
          {getFilteredNews().map((item) => (
            <TouchableOpacity key={item.id} onPress={() => handleArticlePress(item)}>
              <NewsCard item={item} />
            </TouchableOpacity>
          ))}
          
          <View style={styles.endOfFeed}>
            <View style={styles.integraIcon}>
              <Text style={styles.integraIconText}>i</Text>
            </View>
            <Text style={styles.endOfFeedText}>You're all caught up!</Text>
            <TouchableOpacity style={styles.refreshButton}>
              <MaterialIcons name="refresh" size={16} color={colors.accentData} />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {renderBottomNav()}
      </View>

      {showAIAnalysis && selectedArticle && (
        <AIAnalysisOverlay
          article={selectedArticle}
          visible={showAIAnalysis}
          onClose={() => {
            setShowAIAnalysis(false);
            setSelectedArticle(null);
          }}
        />
      )}
    </SafeAreaView>
  );
};

// Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <MaterialIcons name="error" size={48} color={colors.accentPositive} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

// Wrapped App
const WrappedApp = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
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
  backButton: {
    padding: 5,
  },
  headerSpacer: {
    width: 34,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    maxHeight: 60,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  activeFilterChip: {
    backgroundColor: colors.accentPositive,
    borderColor: colors.accentPositive,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 4,
  },
  activeFilterText: {
    color: colors.bgPrimary,
    fontWeight: '600',
  },
  feed: {
    flex: 1,
    paddingHorizontal: 20,
  },
  endOfFeed: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 80,
  },
  integraIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.accentPositive,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  integraIconText: {
    color: colors.bgPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  endOfFeedText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
  },
  refreshText: {
    color: colors.accentData,
    fontSize: 14,
    marginLeft: 6,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingBottom: 20,
    paddingTop: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  navLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  activeNavLabel: {
    color: colors.accentPositive,
  },
  alertsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  setupAlertsButton: {
    backgroundColor: colors.accentPositive,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  setupAlertsText: {
    color: colors.bgPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.bgSecondary,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentPositive,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  settingsSection: {
    marginTop: 30,
    marginHorizontal: 20,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  settingsText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    marginLeft: 15,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 100,
  },
  appVersion: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  appSubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: colors.accentPositive,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  retryText: {
    color: colors.bgPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WrappedApp;
