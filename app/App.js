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
import NewsCard from './components/NewsCard.tsx';
import AIAnalysisOverlay from './components/AIAnalysisOverlay.tsx';

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
    title: 'US Natural Gas Storage Exceeds Expectations',
    summary: 'Weekly natural gas storage report shows higher than expected inventory build, indicating potential oversupply conditions in key markets. This could signal bearish pressure on natural gas prices in the near term.',
    source: 'Bloomberg',
    timeAgo: '2 hours ago',
    sentiment: 'BEARISH',
    sentimentScore: '0.83',
    keyDrivers: ['Storage build', 'Oversupply conditions', 'Price pressure'],
    marketImpact: 'HIGH',
    commodities: ['Natural Gas'],
  },
  {
    id: '2',
    title: 'Gold Prices Rally on Fed Policy Uncertainty',
    summary: 'Precious metals gain momentum as investors seek safe haven assets amid monetary policy shifts...',
    source: 'MarketWatch',
    timeAgo: '1 hour ago',
    sentiment: 'BULLISH',
    sentimentScore: '0.72',
    keyDrivers: ['Fed policy', 'Safe haven demand', 'Monetary shifts'],
    marketImpact: 'MEDIUM',
    commodities: ['Gold', 'Silver'],
  },
  {
    id: '3',
    title: 'Oil Demand Forecasts Remain Steady',
    summary: 'International Energy Agency maintains stable outlook for global oil consumption through Q4...',
    source: 'IEA',
    timeAgo: '30 minutes ago',
    sentiment: 'NEUTRAL',
    sentimentScore: '0.45',
    keyDrivers: ['IEA forecasts', 'Global consumption', 'Q4 outlook'],
    marketImpact: 'LOW',
    commodities: ['Crude Oil'],
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
      // For web, skip onboarding and go directly to main app
      if (typeof window !== 'undefined') {
        // We're on web, skip all onboarding
        setUserData({ name: 'Demo User', email: 'demo@integramarkets.com' });
        return;
      }
      
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

  const getFilterChipColor = (filter) => {
    if (activeFilter !== filter) return colors.bgSecondary;
    
    switch (filter) {
      case 'Bullish': return '#4ade80';
      case 'Bearish': return '#ff6b6b';
      case 'Neutral': return '#fbbf24';
      default: return colors.accentPositive;
    }
  };

  const getFilterBorderColor = (filter) => {
    if (activeFilter !== filter) return colors.cardBorder;
    
    switch (filter) {
      case 'Bullish': return '#4ade80';
      case 'Bearish': return '#ff6b6b';
      case 'Neutral': return '#fbbf24';
      default: return colors.accentPositive;
    }
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
              style={[
                styles.filterChip,
                {
                  backgroundColor: getFilterChipColor(filter),
                  borderColor: getFilterBorderColor(filter)
                }
              ]}
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
            <NewsCard key={item.id} item={item} onAIClick={handleArticlePress} />
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
          newsData={{
            title: selectedArticle.title,
            summary: selectedArticle.summary || selectedArticle.content || '',
            source: selectedArticle.source || 'Unknown',
            timeAgo: selectedArticle.timeAgo || selectedArticle.date || '2 hours ago',
            sentiment: selectedArticle.sentiment || 'NEUTRAL',
            sentimentScore: parseFloat(selectedArticle.sentimentScore) || 0.5
          }}
          isVisible={showAIAnalysis}
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

// Web Container Component for Desktop Layout
const WebContainer = ({ children }) => {
  if (typeof window === 'undefined') {
    // Not on web, return children as-is
    return children;
  }
  
  return (
    <View style={webStyles.webWrapper}>
      <View style={webStyles.webContainer}>
        {children}
      </View>
    </View>
  );
};

// Wrapped App
const WrappedApp = () => (
  <ErrorBoundary>
    <WebContainer>
      <App />
    </WebContainer>
  </ErrorBoundary>
);

// Web-specific styles
const webStyles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    backgroundColor: '#0a0a0a', // Darker background for web
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  },
  webContainer: {
    width: 414, // iPhone Pro Max width
    height: '100vh',
    maxHeight: 896, // iPhone Pro Max height
    backgroundColor: colors.bgPrimary,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 30,
    overflow: 'hidden',
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    ...(typeof window !== 'undefined' && {
      justifyContent: 'center',
      alignItems: 'center',
    }),
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    ...(typeof window !== 'undefined' && {
      maxWidth: 414, // iPhone Pro Max width
      width: '100%',
      alignSelf: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 20,
    }),
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
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 999,
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
    fontWeight: '500',
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
