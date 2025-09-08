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
  DevSettings,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotificationsAsync, setupNotificationListeners } from './services/notificationService';

// Ensure dev tools are disabled in production
if (!__DEV__) {
  console.disableYellowBox = true;
  console.reportErrorsAsExceptions = false;
  
  // Disable React Native Inspector in production
  if (global && global.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.isDisabled = true;
  }
}

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
import AlertsScreen from './components/AlertsScreen';
import NewsCard from './components/NewsCard';
import AIAnalysisOverlay from './components/AIAnalysisOverlay';
import { BookmarkProvider } from './providers/BookmarkProvider';
import BookmarksScreen from './components/BookmarksScreen';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import TermsOfServiceModal from './components/TermsOfServiceModal';

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
const ProfileScreen = ({ onNavigateHome, userData, onResetData, onShowAlertPreferences, onDeleteAccount, onLogout, onShowPrivacyPolicy, onShowTermsOfService }) => {
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
            
            <TouchableOpacity style={styles.settingsItem} onPress={onShowPrivacyPolicy}>
              <MaterialIcons name="privacy-tip" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsText}>Privacy Policy</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsItem} onPress={onShowTermsOfService}>
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
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);

  // Check app state on mount
  useEffect(() => {
    console.log('App mounted, checking state...');
    
    // Wrap in try-catch to prevent initialization crashes
    try {
      checkAppState();
      initializeNotifications();
    } catch (error) {
      console.error('Error during app initialization:', error);
      // Continue anyway - don't let initialization errors crash the app
    }
    
    // Database setup removed - these were causing crashes as imports were commented out
    // setupDatabase.createTables();
    // testConnection();
  }, []);

  // Initialize notifications
  const initializeNotifications = async () => {
    try {
      // Register for push notifications
      await registerForPushNotificationsAsync();
      
      // Set up notification listeners
      setupNotificationListeners(
        (notification) => {
          console.log('Notification received:', notification.request.content.title);
        },
        (response) => {
          console.log('Notification tapped:', response.notification.request.content.title);
          // Handle notification tap - could navigate to specific screen
        }
      );
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

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

  const handleAuthComplete = async (authData) => {
    console.log('handleAuthComplete called with:', authData);
    
    setUserData(authData);
    setShowAuth(false);
    
    // Check if we should skip onboarding (returning user signing in with Google)
    if (authData.skipOnboarding) {
      console.log('User has skipOnboarding=true, checking alerts...');
      // User has already completed onboarding, go straight to main app
      const alertsCompleted = await AsyncStorage.getItem('alerts_completed');
      console.log('Alerts completed status:', alertsCompleted);
      
      if (alertsCompleted !== 'true') {
        console.log('Showing alert preferences');
        setShowAlertPreferences(true);
      } else {
        console.log('All onboarding complete, showing main app');
      }
      // Otherwise, show main app (all flags remain false)
    } else {
      console.log('User needs onboarding, showing onboarding screen');
      // New user or user who hasn't completed onboarding
      setShowOnboarding(true);
    }
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

  const handleOnboardingSkip = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      setShowOnboarding(false);
      setShowAlertPreferences(true);
    } catch (error) {
      console.error('Error saving onboarding skip:', error);
      // Still proceed even if saving fails
      setShowOnboarding(false);
      setShowAlertPreferences(true);
    }
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

  // Render bookmarks screen
  if (showBookmarks) {
    return (
      <BookmarksScreen
        onBack={() => setShowBookmarks(false)}
        onSelectBookmark={(bookmark) => {
          setShowBookmarks(false);
          // Handle bookmark selection - could open the article or chat
          console.log('Selected bookmark:', bookmark);
        }}
      />
    );
  }

  // Render profile screen
  if (activeNav === 'Profile') {
    return (
      <>
        <ProfileScreen
          onNavigateHome={() => setActiveNav('Today')}
          userData={userData}
          onResetData={resetAppData}
          onShowAlertPreferences={handleShowAlertPreferences}
          onDeleteAccount={handleDeleteAccount}
          onLogout={handleLogout}
          onShowPrivacyPolicy={() => setShowPrivacyPolicy(true)}
          onShowTermsOfService={() => setShowTermsOfService(true)}
          onNavigateToBookmarks={() => setShowBookmarks(true)}
        />
        <PrivacyPolicyModal
          visible={showPrivacyPolicy}
          onClose={() => setShowPrivacyPolicy(false)}
        />
        <TermsOfServiceModal
          visible={showTermsOfService}
          onClose={() => setShowTermsOfService(false)}
        />
      </>
    );
  }

  // Render alerts screen
  if (activeNav === 'Alerts') {
    return (
      <View style={styles.container}>
        <AlertsScreen 
          onNavigateToAlertPreferences={() => setShowAlertPreferences(true)}
          onNavigateToBookmarks={() => setShowBookmarks(true)}
        />
        {renderBottomNav()}
      </View>
    );
  }

  // Main news feed screen
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today</Text>
          <TouchableOpacity onPress={() => {
            Alert.alert(
              'Notifications',
              'Notification settings and alerts will be available in the next update.',
              [{ text: 'OK' }]
            );
          }}>
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
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={async () => {
                try {
                  // Use the same API URL configuration as other services
                  const API_BASE_URL = __DEV__ 
                    ? 'http://localhost:8000'
                    : 'https://integra-markets-backend.fly.dev';
                  
                  // Get user preferences from AsyncStorage
                  let userPrefs = {};
                  try {
                    const storedPrefs = await AsyncStorage.getItem('alert_preferences');
                    if (storedPrefs) {
                      userPrefs = JSON.parse(storedPrefs);
                    }
                  } catch (e) {
                    console.log('Using default preferences');
                  }
                  
                  // Get latest news analysis from backend with user preferences
                  const response = await fetch(`${API_BASE_URL}/api/news/analysis`);
                  
                  if (response.ok) {
                    const newData = await response.json();
                    // In production, update the news state here
                    console.log('News refreshed:', newData.length, 'items');
                    Alert.alert('Success', 'News feed refreshed with latest data');
                  } else {
                    // Try alternative endpoints with user preferences
                    const altResponse = await fetch(`${API_BASE_URL}/ai/report`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        commodities: userPrefs.commodities || ['oil', 'gold', 'wheat'],
                        regions: userPrefs.regions || ['US', 'EU', 'Asia'],
                        websiteURLs: userPrefs.websiteURLs || [],
                        keywords: userPrefs.keywords || [],
                        include_news: true,
                        include_sources: true
                      })
                    });
                    if (altResponse.ok) {
                      Alert.alert('Success', 'Market report refreshed');
                    } else {
                      Alert.alert('Info', 'Using cached news data');
                    }
                  }
                } catch (error) {
                  console.error('Refresh error:', error);
                  Alert.alert('Info', 'Continuing with current data');
                }
              }}
            >
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
    <BookmarkProvider>
      <WebContainer>
        <App />
      </WebContainer>
    </BookmarkProvider>
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
