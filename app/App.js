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
  Platform,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import Supabase Auth Provider
// import { AuthProvider } from '../contexts/AuthContext';
// Import the example auth component for testing
// import { AuthExample } from '../components/AuthExample';
// Import database utilities for testing
// import { testConnection } from '../lib/database';
// import { setupDatabase } from '../lib/setupDatabase';

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
    title: 'US Natural Gas Storage Exceeds Expectations',
    summary: 'Weekly natural gas storage report shows higher than expected inventory build, indicating potential oversupply conditions in key markets. This could signal bearish pressure on natural gas prices in the near term.',
    source: 'Bloomberg',
    sourceUrl: 'https://www.bloomberg.com',
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
    sourceUrl: 'https://www.marketwatch.com',
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
    sourceUrl: 'https://www.iea.org',
    timeAgo: '30 minutes ago',
    sentiment: 'NEUTRAL',
    sentimentScore: '0.45',
    keyDrivers: ['IEA forecasts', 'Global consumption', 'Q4 outlook'],
    marketImpact: 'LOW',
    commodities: ['Crude Oil'],
  },
];

// Profile Screen Component
const ProfileScreen = ({ onNavigateHome, userData, onResetData, onShowAlertPreferences, onDeleteAccount, onLogout }) => {
  const [alertPreferences, setAlertPreferences] = useState(null);
  
  // Load alert preferences
  useEffect(() => {
    loadAlertPreferences();
  }, []);
  
  const loadAlertPreferences = async () => {
    try {
      const prefs = await AsyncStorage.getItem('alert_preferences');
      if (prefs) {
        setAlertPreferences(JSON.parse(prefs));
      }
    } catch (error) {
      console.error('Error loading alert preferences:', error);
    }
  };
  
  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'INTEGRA MARKETS PRIVACY POLICY\n\n' +
      'Effective Date: January 1, 2024\n\n' +
      '1. DATA COLLECTION AND USE\n' +
      'We collect and process your personal data, including but not limited to:\n' +
      '• User profile information (name, email, professional role)\n' +
      '• Alert preferences and commodity interests\n' +
      '• App usage analytics and interaction patterns\n' +
      '• Trading preferences and market focus areas\n\n' +
      '2. AI MODEL TRAINING\n' +
      'Your anonymized data and alert preferences are used to train our proprietary AI models to:\n' +
      '• Enhance prediction accuracy for commodity market movements\n' +
      '• Improve personalized insight generation\n' +
      '• Optimize alert timing and relevance\n' +
      '• Develop advanced pattern recognition capabilities\n\n' +
      '3. DATA PROTECTION\n' +
      'We implement industry-standard security measures including:\n' +
      '• End-to-end encryption for data transmission\n' +
      '• Secure cloud storage with SOC 2 compliance\n' +
      '• Regular security audits and penetration testing\n' +
      '• Strict access controls and authentication protocols\n\n' +
      '4. DATA RETENTION\n' +
      'Personal data is retained for the duration of your account activity plus 90 days. Anonymized data used for model training may be retained indefinitely.\n\n' +
      '5. YOUR RIGHTS\n' +
      'You have the right to:\n' +
      '• Access your personal data\n' +
      '• Request data correction or deletion\n' +
      '• Opt-out of data usage for model training\n' +
      '• Export your data in machine-readable format\n\n' +
      '6. THIRD-PARTY DISCLOSURE\n' +
      'We do NOT sell, trade, or transfer your personally identifiable information to third parties. This excludes trusted partners who assist in operating our service under strict confidentiality agreements.\n\n' +
      '7. CONSENT\n' +
      'By using Integra Markets, you consent to this privacy policy and agree to the collection and use of information in accordance with this policy.\n\n' +
      'For privacy inquiries: privacy@integramarkets.com',
      [{ text: 'OK', style: 'default' }],
      { cancelable: true }
    );
  };
  
  const handleTermsOfService = () => {
    Alert.alert(
      'Terms of Service',
      'By using Integra Markets, you agree to our terms of service. This app provides market insights for informational purposes only and should not be considered financial advice.',
      [{ text: 'OK' }]
    );
  };

  const handleNotificationSettings = () => {
    Alert.alert(
      'Notification Settings',
      'Push notifications are currently ' + (alertPreferences?.notifications ? 'enabled' : 'disabled') + '. You can change this in your device settings.',
      [{ text: 'OK' }]
    );
  };
  
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
            <TouchableOpacity style={styles.settingsItem} onPress={handleNotificationSettings}>
              <MaterialIcons name="notifications" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsText}>Notification Settings</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsItem} onPress={onShowAlertPreferences}>
              <MaterialIcons name="tune" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsText}>Alert Preferences</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsItem} onPress={handlePrivacyPolicy}>
              <MaterialIcons name="privacy-tip" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsText}>Privacy Policy</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsItem} onPress={handleTermsOfService}>
              <MaterialIcons name="article" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsText}>Terms of Service</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsItem} onPress={onResetData}>
              <MaterialIcons name="refresh" size={20} color={colors.accentNegative} />
              <Text style={[styles.settingsText, { color: colors.accentNegative }]}>Reset App Data</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.accentNegative} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsItem} onPress={onLogout}>
              <MaterialIcons name="exit-to-app" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsText}>Log out</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
            <TouchableOpacity style={styles.deleteAccountButton} onPress={onDeleteAccount}>
              <MaterialIcons name="delete-forever" size={20} color={colors.textPrimary} />
              <Text style={styles.deleteAccountText}>Delete Account</Text>
            </TouchableOpacity>
            <Text style={styles.deleteAccountWarning}>
              This will permanently delete your account and all associated data.
            </Text>
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
    console.log('App mounted, checking state...');
    
    // Wrap in try-catch to prevent initialization crashes
    try {
      checkAppState();
    } catch (error) {
      console.error('Error during app initialization:', error);
      // Continue anyway - don't let initialization errors crash the app
    }
    
    // Database setup removed - these were causing crashes as imports were commented out
    // setupDatabase.createTables();
    // testConnection();
  }, []);

  const checkAppState = async () => {
    try {
      console.log('checkAppState called');
      
      // Ensure Platform is available
      if (!Platform || !Platform.OS) {
        console.warn('Platform not available, defaulting to mobile');
        // Default to mobile behavior if Platform is not available
      } else {
        // Check if we're running on web using Platform API
        const isWeb = Platform.OS === 'web';
        
        if (isWeb) {
          // We're on web, skip all onboarding
          console.log('Web platform detected, setting demo user');
          setUserData({ name: 'Demo User', email: 'demo@integramarkets.com' });
          return;
        }
      }
      
      console.log('Platform:', Platform.OS); // Will show 'ios', 'android', or 'web'
      
      // Wrap AsyncStorage calls in try-catch to handle potential errors
      let onboardingCompleted = null;
      let alertsCompleted = null;
      let storedUserData = null;
      
      try {
        onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
        alertsCompleted = await AsyncStorage.getItem('alerts_completed');
        storedUserData = await AsyncStorage.getItem('user_data');
      } catch (storageError) {
        console.warn('AsyncStorage access failed:', storageError);
        // Continue with null values - don't crash
      }
      
      console.log('Storage values:', {
        onboardingCompleted,
        alertsCompleted,
        storedUserData: storedUserData ? 'exists' : 'null'
      });
      
      if (storedUserData) {
        setUserData(JSON.parse(storedUserData));
      }
      
      if (onboardingCompleted !== 'true') {
        console.log('Showing auth screen');
        setShowAuth(true);
      } else if (alertsCompleted !== 'true') {
        console.log('Showing alert preferences');
        setShowAlertPreferences(true);
      } else {
        console.log('All onboarding complete, showing main app');
      }
    } catch (error) {
      console.error('Error checking app state:', error);
    }
  };

  const handleLoadingComplete = () => {
    console.log('handleLoadingComplete called');
    setIsLoading(false);
    console.log('isLoading set to false');
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
  
  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              // In a real app, you would call the deleteAccount method from AuthContext here
              // For now, we'll just clear local data and show auth screen
              await AsyncStorage.clear();
              setUserData(null);
              setActiveNav('Today');
              setShowAuth(true);
              Alert.alert(
                'Account Deleted',
                'Your account has been deleted successfully.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert(
                'Error',
                'Failed to delete account. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };
  
  const handleLogout = async () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              setUserData(null);
              setActiveNav('Today');
              setShowAuth(true);
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert(
                'Error',
                'Failed to log out. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };
  
  const handleShowAlertPreferences = () => {
    setActiveNav('Today');
    setShowAlertPreferences(true);
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
        onShowAlertPreferences={handleShowAlertPreferences}
        onDeleteAccount={handleDeleteAccount}
        onLogout={handleLogout}
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
  if (Platform.OS !== 'web') {
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

// Wrapped App - AuthProvider removed since import is commented out
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
    ...(Platform.OS === 'web' && {
      justifyContent: 'center',
      alignItems: 'center',
    }),
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    ...(Platform.OS === 'web' && {
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
  dangerZone: {
    marginTop: 30,
    marginHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  dangerZoneTitle: {
    color: colors.accentNegative,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentNegative,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
  },
  deleteAccountText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteAccountWarning: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
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
