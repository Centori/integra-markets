// App.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import TodayDashboard from './components/TodayDashboard';
import IntegraLoadingPage from './components/IntegraLoadingPage';
import OnboardingForm from './components/OnboardingForm';
import AlertPreferencesForm from './components/AlertPreferencesForm';
import { activateAgentMode, getAgentStatus } from './config/agent';
import { checkApiStatus } from './services/api';
import AIAnalysisOverlay from './components/AIAnalysisOverlay';

// --- Color Palette ---
const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3', // Mint Green
  accentNeutral: '#A0A0A0', // Gray
  accentNegative: '#F05454', // Red
  accentData: '#30A5FF',   // Cyan Blue
  divider: '#333333',
};

// --- Sample Data with Enhanced Preprocessing ---
const enhancedNewsData = [
  {
    id: '1',
    sentiment: 'NEUTRAL',
    icon: 'trending-flat',
    score: '0.50',
    headline: 'US Natural Gas Storage Exceeds Expectations',
    summary: 'Weekly natural gas storage report shows higher than expected inventory build, indicating potential oversupply conditions in key markets.',
    source: 'Bloomberg',
    sourceUrl: '#',
    timestamp: '2 hours ago',
    isAiInsight: true,
    preprocessing: {
      commodity: 'gas',
      event_type: 'supply_shock',
      region: 'North America',
      entities: ['United States', 'Henry Hub'],
      trigger_keywords: ['storage', 'inventory', 'oversupply'],
      market_impact: 'bearish',
      severity: 'medium',
      confidence_score: 0.78
    }
  },
  {
    id: '2',
    sentiment: 'BEARISH',
    icon: 'trending-down',
    score: '0.78',
    headline: 'Drought Conditions Worsen in Key Corn Growing Regions',
    summary: 'Extended drought in the US Midwest has raised concerns about corn yields for the upcoming harvest season, potentially affecting global supply.',
    source: 'Reuters',
    sourceUrl: '#',
    timestamp: '3 hours ago',
    isAiInsight: true,
    preprocessing: {
      commodity: 'agriculture',
      event_type: 'weather_event',
      region: 'North America',
      entities: ['United States', 'Midwest', 'USDA'],
      trigger_keywords: ['drought', 'corn', 'harvest', 'supply'],
      market_impact: 'bullish',
      severity: 'high',
      confidence_score: 0.85
    }
  },
  {
    id: '3',
    sentiment: 'BEARISH',
    icon: 'trending-down',
    score: '0.83',
    headline: 'Iran Sanctions Tighten Oil Export Restrictions',
    summary: 'New sanctions targeting Iranian oil exports could remove significant supply from global markets, according to energy analysts.',
    source: 'Financial Times',
    sourceUrl: '#',
    timestamp: '4 hours ago',
    isAiInsight: true,
    preprocessing: {
      commodity: 'oil',
      event_type: 'geopolitical_tension',
      region: 'Middle East',
      entities: ['Iran', 'OPEC'],
      trigger_keywords: ['sanctions', 'oil exports', 'supply disruption'],
      market_impact: 'bullish',
      severity: 'high',
      confidence_score: 0.92
    }
  },
  {
    id: '4',
    sentiment: 'BULLISH',
    icon: 'trending-up',
    score: '0.72',
    headline: 'Gold Prices Rally on Fed Policy Uncertainty',
    summary: 'Precious metals gain momentum as investors seek safe haven assets amid monetary policy shifts and inflation concerns.',
    source: 'MarketWatch',
    sourceUrl: '#',
    timestamp: '1 hour ago',
    isAiInsight: true,
    preprocessing: {
      commodity: 'metals',
      event_type: 'policy_change',
      region: 'North America',
      entities: ['Fed', 'Federal Reserve'],
      trigger_keywords: ['gold', 'safe haven', 'inflation', 'monetary policy'],
      market_impact: 'bullish',
      severity: 'medium',
      confidence_score: 0.68
    }
  },
  {
    id: '5',
    sentiment: 'NEUTRAL',
    icon: 'trending-flat',
    score: '0.45',
    headline: 'Chile Copper Mine Strike Enters Second Week',
    summary: 'Labor disputes at major Chilean copper facilities continue to affect global supply chains and pricing dynamics.',
    source: 'Mining Weekly',
    sourceUrl: '#',
    timestamp: '30 minutes ago',
    isAiInsight: true,
    preprocessing: {
      commodity: 'metals',
      event_type: 'supply_shock',
      region: 'Latin America',
      entities: ['Chile', 'BHP', 'Codelco'],
      trigger_keywords: ['copper', 'mine strike', 'supply disruption'],
      market_impact: 'bullish',
      severity: 'high',
      confidence_score: 0.89
    }
  },
];

const filters = ['All', 'Bullish', 'Neutral', 'Bearish'];
const navItems = [
  { label: 'Today', icon: 'flash-on' },
  { label: 'Alerts', icon: 'notifications' },
  { label: 'Profile', icon: 'person' },
];

// --- Reusable News Card Component ---
const NewsCard = ({ item }) => {
  const [showAIAnalysisOverlay, setShowAIAnalysisOverlay] = useState(false);
  
  let sentimentStyle, sentimentBgStyle, scoreBgStyle, iconColor;
  
  switch (item.sentiment) {
    case 'BULLISH':
      sentimentStyle = styles.bullish;
      sentimentBgStyle = styles.bullishBg;
      scoreBgStyle = styles.scoreBullishBg;
      iconColor = colors.accentPositive;
      break;
    case 'NEUTRAL':
      sentimentStyle = styles.neutral;
      sentimentBgStyle = styles.neutralBg;
      scoreBgStyle = styles.scoreNeutralBg;
      iconColor = colors.accentNeutral;
      break;
    case 'BEARISH':
    default:
      sentimentStyle = styles.bearish;
      sentimentBgStyle = styles.bearishBg;
      scoreBgStyle = styles.scoreBearishBg;
      iconColor = colors.accentNegative;
      break;
  }

  return (
    <>
      <TouchableOpacity 
        style={styles.card}
        onPress={() => setShowAIAnalysisOverlay(true)}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          {/* Left side: Sentiment + Score */}
          <View style={styles.sentimentInfo}>
            <View style={[styles.sentimentTag, sentimentBgStyle]}>
              <MaterialIcons name={item.icon} size={14} color={iconColor} />
              <Text style={[styles.sentimentText, sentimentStyle]}>{item.sentiment}</Text>
            </View>
            <View style={[styles.scoreTag, scoreBgStyle]}>
              <Text style={styles.scoreText}>{item.score}</Text>
            </View>
          </View>
          {/* Right side: AI Sparkle Icon */}
          {item.isAiInsight && (
            <MaterialIcons name="auto-awesome" size={18} color={colors.accentData} />
          )}
        </View>
        {/* Card Body */}
        <View style={styles.cardBody}>
          <Text style={styles.headline}>{item.headline}</Text>
          <Text style={styles.summary}>{item.summary}</Text>
        </View>
        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <TouchableOpacity onPress={(e) => { e.stopPropagation(); Linking.openURL(item.sourceUrl); }}>
            <Text style={styles.sourceLink}>
              {item.source} <MaterialIcons name="open-in-new" size={12} color={colors.accentData} />
            </Text>
          </TouchableOpacity>
          {/* Three dots menu and Share Button */}
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); Alert.alert('Share', 'Share this article'); }}>
              <MaterialIcons name="share" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); Alert.alert('More options', 'Additional options'); }}>
              <MaterialIcons name="more-horiz" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
      </TouchableOpacity>

      {/* AI Analysis Overlay */}
      <AIAnalysisOverlay
        isVisible={showAIAnalysisOverlay}
        onClose={() => setShowAIAnalysisOverlay(false)}
        news={item}
      />
    </>
  );
};

// --- Enhanced Alerts Screen Component ---
const AlertsScreen = ({ onNavigateToPreferences, onNavigateHome }) => {
  const [activeAlertTab, setActiveAlertTab] = useState('Keyword');
  
  const alertTabs = ['Keyword', 'Website URL'];
  
  const userAlerts = [
    { id: 1, title: 'OIL', subtitle: '> $85', type: 'price', enabled: true },
    { id: 2, title: 'GOLD', subtitle: 'Bearish trend', type: 'sentiment', enabled: false },
    { id: 3, title: 'WHEAT', subtitle: 'Breaking news', type: 'news', enabled: true },
  ];
  
  const keywordAlerts = [
    { id: 1, keyword: 'Brent', enabled: true },
    { id: 2, keyword: 'WTI', enabled: true },
    { id: 3, keyword: 'Hurricane', enabled: true },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.mobileContainer}>
        {/* Header with navigation back */}
        <View style={styles.alertsHeader}>
          <TouchableOpacity onPress={onNavigateHome} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.accentData} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Alerts</Text>
          <View style={styles.alertsHeaderActions}>
            <TouchableOpacity onPress={onNavigateToPreferences}>
              <MaterialIcons name="settings" size={24} color={colors.accentData} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Add Alert', 'Create new alert')}>
              <MaterialIcons name="add" size={24} color={colors.accentData} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Alert Type Tabs */}
        <View style={styles.alertTabsContainer}>
          {alertTabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.alertTab, activeAlertTab === tab ? styles.activeAlertTab : {}]}
              onPress={() => setActiveAlertTab(tab)}
            >
              <MaterialIcons 
                name={tab === 'Keyword' ? 'label' : 'language'} 
                size={16} 
                color={activeAlertTab === tab ? colors.textPrimary : colors.textSecondary} 
              />
              <Text style={[styles.alertTabText, activeAlertTab === tab ? styles.activeAlertTabText : {}]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Input */}
        <View style={styles.alertSearchContainer}>
          <MaterialIcons name="search" size={20} color={colors.textSecondary} />
          <Text style={styles.alertSearchPlaceholder}>Enter keyword to track...</Text>
          <TouchableOpacity>
            <MaterialIcons name="notifications" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.alertsContent}>
          {/* Your Alerts Section */}
          <Text style={styles.alertsSectionTitle}>YOUR ALERTS</Text>
          {userAlerts.map((alert) => (
            <View key={alert.id} style={styles.alertCard}>
              <View style={styles.alertCardContent}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertSubtitle}>{alert.subtitle}</Text>
              </View>
              <TouchableOpacity onPress={() => Alert.alert('Toggle Alert', `${alert.enabled ? 'Disable' : 'Enable'} ${alert.title} alert`)}>
                <MaterialIcons 
                  name={alert.enabled ? 'notifications' : 'notifications-off'} 
                  size={20} 
                  color={alert.enabled ? colors.accentPositive : colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          ))}

          {/* Keyword Alerts Section */}
          <Text style={styles.alertsSectionTitle}>KEYWORD ALERTS</Text>
          {keywordAlerts.map((alert) => (
            <View key={alert.id} style={styles.alertCard}>
              <View style={styles.alertCardContent}>
                <Text style={styles.alertTitle}>{alert.keyword}</Text>
              </View>
              <TouchableOpacity onPress={() => Alert.alert('Toggle Alert', `${alert.enabled ? 'Disable' : 'Enable'} ${alert.keyword} alert`)}>
                <MaterialIcons 
                  name={alert.enabled ? 'notifications' : 'notifications-off'} 
                  size={20} 
                  color={alert.enabled ? colors.accentPositive : colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          ))}

          {/* Quick Navigation Card */}
          <View style={styles.quickNavCard}>
            <TouchableOpacity onPress={onNavigateHome} style={styles.quickNavButton}>
              <MaterialIcons name="home" size={24} color={colors.accentData} />
              <Text style={styles.quickNavText}>Back to News Feed</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={onNavigateHome}>
            <MaterialIcons name="flash-on" size={24} color={colors.textSecondary} />
            <Text style={styles.navLabel}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <MaterialIcons name="notifications" size={24} color={colors.accentPositive} />
            <Text style={[styles.navLabel, styles.activeNavLabel]}>Alerts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => Alert.alert('Profile', 'Navigate to profile')}>
            <MaterialIcons name="person" size={24} color={colors.textSecondary} />
            <Text style={styles.navLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// --- Enhanced Profile Screen Component ---
const ProfileScreen = ({ onNavigateToOnboarding, onNavigateToAlertPreferences, onResetUserData, onNavigateHome, userOnboarded, alertPreferencesSet }) => {
  const profileMenuItems = [
    {
      id: 'onboarding',
      title: 'View Onboarding',
      subtitle: 'Replay the welcome experience',
      icon: 'school',
      onPress: onNavigateToOnboarding,
      status: userOnboarded ? 'completed' : 'pending'
    },
    {
      id: 'alerts',
      title: 'Alert Preferences',
      subtitle: 'Customize your notifications',
      icon: 'tune',
      onPress: onNavigateToAlertPreferences,
      status: alertPreferencesSet ? 'completed' : 'pending'
    },
    {
      id: 'account',
      title: 'Account Settings',
      subtitle: 'Manage your account',
      icon: 'manage-accounts',
      onPress: () => Alert.alert('Account Settings', 'Account management coming soon'),
      status: 'available'
    },
    {
      id: 'notifications',
      title: 'Notification Settings',
      subtitle: 'Control push notifications',
      icon: 'notifications-active',
      onPress: () => Alert.alert('Notifications', 'Notification settings coming soon'),
      status: 'available'
    },
    {
      id: 'data',
      title: 'Data & Privacy',
      subtitle: 'Manage your data preferences',
      icon: 'privacy-tip',
      onPress: () => Alert.alert('Privacy', 'Privacy settings coming soon'),
      status: 'available'
    },
    {
      id: 'reset',
      title: 'Reset App Data',
      subtitle: 'Clear all preferences and start over',
      icon: 'refresh',
      onPress: onResetUserData,
      status: 'danger'
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.mobileContainer}>
        {/* Header with navigation back */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={onNavigateHome} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.accentData} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.profileContent}>
          {/* Profile Summary Card */}
          <View style={styles.profileSummaryCard}>
            <View style={styles.profileAvatar}>
              <MaterialIcons name="person" size={40} color={colors.textPrimary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Integra User</Text>
              <Text style={styles.profileStatus}>
                {userOnboarded && alertPreferencesSet ? 'Setup Complete' : 'Setup In Progress'}
              </Text>
            </View>
            <TouchableOpacity onPress={onNavigateHome} style={styles.homeQuickButton}>
              <MaterialIcons name="home" size={20} color={colors.accentData} />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.profileMenuSection}>
            <Text style={styles.sectionTitle}>Settings</Text>
            {profileMenuItems.map((item) => (
              <TouchableOpacity key={item.id} style={styles.profileMenuItem} onPress={item.onPress}>
                <View style={styles.menuItemLeft}>
                  <View style={[
                    styles.menuItemIcon,
                    item.status === 'danger' && styles.menuItemIconDanger
                  ]}>
                    <MaterialIcons 
                      name={item.icon} 
                      size={20} 
                      color={item.status === 'danger' ? colors.accentNegative : colors.accentData} 
                    />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={[
                      styles.menuItemTitle,
                      item.status === 'danger' && styles.menuItemTitleDanger
                    ]}>
                      {item.title}
                    </Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <View style={styles.menuItemRight}>
                  {item.status === 'completed' && (
                    <MaterialIcons name="check-circle" size={16} color={colors.accentPositive} />
                  )}
                  {item.status === 'pending' && (
                    <MaterialIcons name="warning" size={16} color={colors.accentNegative} />
                  )}
                  <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Navigation Card */}
          <View style={styles.quickNavCard}>
            <TouchableOpacity onPress={onNavigateHome} style={styles.quickNavButton}>
              <MaterialIcons name="home" size={24} color={colors.accentData} />
              <Text style={styles.quickNavText}>Back to News Feed</Text>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfoSection}>
            <Text style={styles.appInfoText}>Integra Markets v1.0.0</Text>
            <Text style={styles.appInfoSubtext}>AI-powered commodity trading insights</Text>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={onNavigateHome}>
            <MaterialIcons name="flash-on" size={24} color={colors.textSecondary} />
            <Text style={styles.navLabel}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => Alert.alert('Alerts', 'Navigate to alerts')}>
            <MaterialIcons name="notifications" size={24} color={colors.textSecondary} />
            <Text style={styles.navLabel}>Alerts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <MaterialIcons name="person" size={24} color={colors.accentPositive} />
            <Text style={[styles.navLabel, styles.activeNavLabel]}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// --- Main App Component ---
export default function App() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeNav, setActiveNav] = useState('Today');
  const [agentActive, setAgentActive] = useState(false);
  const [apiRunning, setApiRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAlertPreferences, setShowAlertPreferences] = useState(false);
  
  // Enhanced navigation state
  const [userOnboarded, setUserOnboarded] = useState(true); // Default to true for testing
  const [alertPreferencesSet, setAlertPreferencesSet] = useState(true); // Default to true for testing
  const [skipOnboarding, setSkipOnboarding] = useState(true); // Default to true for testing
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);

  // Load user preferences and onboarding state
  useEffect(() => {
    loadUserState();
  }, []);

  const loadUserState = async () => {
    try {
      // Check if user has completed onboarding
      const onboardingComplete = await AsyncStorage.getItem('onboarding_complete');
      const alertPrefsSet = await AsyncStorage.getItem('alert_preferences_set');
      const userSkippedOnboarding = await AsyncStorage.getItem('skipped_onboarding');
      
      // For testing, set defaults if no stored values
      setUserOnboarded(onboardingComplete === 'true' || onboardingComplete === null);
      setAlertPreferencesSet(alertPrefsSet === 'true' || alertPrefsSet === null);
      setSkipOnboarding(userSkippedOnboarding === 'true' || userSkippedOnboarding === null);
      
      console.log('User state loaded:', {
        onboarded: onboardingComplete === 'true' || onboardingComplete === null,
        alertPrefs: alertPrefsSet === 'true' || alertPrefsSet === null,
        skipped: userSkippedOnboarding === 'true' || userSkippedOnboarding === null
      });
    } catch (error) {
      console.warn('Error loading user state:', error);
      // Set defaults for testing
      setUserOnboarded(true);
      setAlertPreferencesSet(true);
      setSkipOnboarding(true);
    }
  };

  const saveUserState = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.warn('Error saving user state:', error);
    }
  };

  // Disable API calls for testing - just set to offline mode
  useEffect(() => {
    // For testing, just set API as offline and skip all backend checks
    setApiRunning(false);
    console.warn('API calls disabled for testing. Using sample data.');
    
    // Reduced loading time to 1 second for better UX
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // For testing, skip onboarding flows and go straight to main app
      console.log('Loading complete - going to main app');
    }, 1000);
    
    return () => {
      clearTimeout(timer);
    };
  }, []); // Remove dependencies to avoid re-triggering

  // Handle agent mode activation
  useEffect(() => {
    const activateAgent = () => {
      try {
        const config = activateAgentMode(apiRunning ? 'premium' : 'free');
        setAgentActive(config.enabled);
        console.log("Agent mode activated:", config);
        
        if (apiRunning) {
          console.log("Premium features enabled with Python backend integration");
        }
      } catch (error) {
        console.warn('Agent activation failed, continuing with basic mode');
        setAgentActive(false);
      }
    };
    
    // Activate agent mode when app is loaded
    if (!isLoading) {
      activateAgent();
    }
  }, [isLoading, apiRunning]);

  const handleOnboardingComplete = async (userData) => {
    console.log('Onboarding completed with data:', userData);
    await saveUserState('onboarding_complete', true);
    setUserOnboarded(true);
    setShowOnboarding(false);
    
    // Show alert preferences if not set
    if (!alertPreferencesSet) {
      setShowAlertPreferences(true);
    }
  };

  const handleOnboardingSkip = async () => {
    console.log('Onboarding skipped');
    await saveUserState('skipped_onboarding', true);
    setSkipOnboarding(true);
    setShowOnboarding(false);
    
    // Still offer alert preferences setup
    Alert.alert(
      'Quick Setup',
      'Would you like to set up alert preferences now, or do this later?',
      [
        {
          text: 'Later',
          style: 'cancel',
          onPress: () => {
            // Go straight to main app
          }
        },
        {
          text: 'Set Up Now',
          onPress: () => setShowAlertPreferences(true)
        }
      ]
    );
  };

  const handleAlertPreferencesComplete = async (preferences) => {
    console.log('Alert preferences completed:', preferences);
    await saveUserState('alert_preferences_set', true);
    setAlertPreferencesSet(true);
    setShowAlertPreferences(false);
  };

  const handleAlertPreferencesSkip = async () => {
    console.log('Alert preferences skipped');
    setShowAlertPreferences(false);
  };

  // Navigation helpers
  const navigateToOnboarding = () => {
    setShowOnboarding(true);
  };

  const navigateToAlertPreferences = () => {
    setShowAlertPreferences(true);
  };

  const resetUserData = async () => {
    Alert.alert(
      'Reset User Data',
      'This will clear all your preferences and show onboarding again. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'onboarding_complete',
                'alert_preferences_set',
                'skipped_onboarding'
              ]);
              
              // Reset state
              setUserOnboarded(false);
              setAlertPreferencesSet(false);
              setSkipOnboarding(false);
              setShowOnboarding(true);
            } catch (error) {
              console.warn('Error resetting user data:', error);
            }
          }
        }
      ]
    );
  };

  const getFilterIcon = (filterName) => {
     switch(filterName) {
        case 'All': return <MaterialCommunityIcons name="chart-line" size={14} color={activeFilter === filterName ? colors.bgPrimary: colors.textSecondary} />;
        case 'Bullish': return <MaterialIcons name="trending-up" size={14} color={activeFilter === filterName ? colors.bgPrimary: colors.textSecondary} />;
        case 'Neutral': return <MaterialIcons name="trending-flat" size={14} color={activeFilter === filterName ? colors.bgPrimary: colors.textSecondary} />;
        case 'Bearish': return <MaterialIcons name="trending-down" size={14} color={activeFilter === filterName ? colors.bgPrimary: colors.textSecondary} />;
        default: return null;
     }
  }

  // Handler for loading completion
  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  // Show loading screen
  if (isLoading) {
    return <IntegraLoadingPage onLoadingComplete={handleLoadingComplete} />;
  }

  // Show onboarding with skip option (only if explicitly requested)
  if (showOnboarding) {
    console.log('Showing onboarding');
    return (
      <OnboardingForm 
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        showSkipOption={true}
      />
    );
  }

  // Show alert preferences with skip option (only if explicitly requested)
  if (showAlertPreferences) {
    console.log('Showing alert preferences');
    return (
      <AlertPreferencesForm 
        onComplete={handleAlertPreferencesComplete}
        onSkip={handleAlertPreferencesSkip}
        showSkipOption={true}
      />
    );
  }

  // Main app navigation logic
  console.log('Showing main app with activeNav:', activeNav);
  
  // Render different screens based on activeNav
  if (activeNav === 'Alerts') {
    return (
      <AlertsScreen 
        onNavigateToPreferences={navigateToAlertPreferences}
        onNavigateHome={() => setActiveNav('Today')}
      />
    );
  }
  
  if (activeNav === 'Profile') {
    return (
      <ProfileScreen 
        onNavigateToOnboarding={navigateToOnboarding}
        onNavigateToAlertPreferences={navigateToAlertPreferences}
        onResetUserData={resetUserData}
        onNavigateHome={() => setActiveNav('Today')}
        userOnboarded={userOnboarded}
        alertPreferencesSet={alertPreferencesSet}
      />
    );
  }

  // Default: Today/The Wire screen (main news feed)
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.mobileContainer}>
        {/* Header with AI Agent Status and Menu */}
        <View style={styles.appHeader}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View>
                <Text style={styles.headerTitle}>News</Text>
                {agentActive && (
                  <View style={styles.agentStatusRow}>
                    <View style={[
                      styles.agentStatusDot, 
                      { backgroundColor: apiRunning ? colors.accentPositive : colors.accentNegative }
                    ]} />
                  </View>
                )}
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => Alert.alert('Notifications', 'View all notifications')}>
                <MaterialIcons name="notifications-none" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMenuDrawer(!showMenuDrawer)}>
                <MaterialIcons name="menu" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Quick Menu Drawer */}
          {showMenuDrawer && (
            <View style={styles.menuDrawer}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowMenuDrawer(false);
                  navigateToOnboarding();
                }}
              >
                <MaterialIcons name="school" size={20} color={colors.accentData} />
                <Text style={styles.menuItemText}>View Onboarding</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowMenuDrawer(false);
                  navigateToAlertPreferences();
                }}
              >
                <MaterialIcons name="tune" size={20} color={colors.accentData} />
                <Text style={styles.menuItemText}>Alert Preferences</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowMenuDrawer(false);
                  setActiveNav('Profile');
                }}
              >
                <MaterialIcons name="person" size={20} color={colors.accentData} />
                <Text style={styles.menuItemText}>Profile & Settings</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.menuItem, styles.menuItemDanger]}
                onPress={() => {
                  setShowMenuDrawer(false);
                  resetUserData();
                }}
              >
                <MaterialIcons name="refresh" size={20} color={colors.accentNegative} />
                <Text style={[styles.menuItemText, styles.menuItemDangerText]}>Reset App Data</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Filter Tabs */}
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterBtn, activeFilter === filter ? styles.activeFilterBtn : {}]}
                onPress={() => setActiveFilter(filter)}
              >
                {getFilterIcon(filter)}
                <Text style={[styles.filterText, activeFilter === filter ? styles.activeFilterText : {}]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Trader Forecast Bar */}
        <TouchableOpacity style={styles.traderForecastBar} onPress={() => Alert.alert('Trader Forecasts', 'Show detailed forecast info.')}>
          <View style={styles.forecastSegments}>
            <View style={[styles.segment, { flex: 1, backgroundColor: colors.accentNegative }]} />
            <View style={[styles.segment, { flex: 3, backgroundColor: colors.accentPositive }]}>
              <View style={styles.activeSegmentIndicator}/>
            </View>
            <View style={[styles.segment, { flex: 1, backgroundColor: colors.accentNeutral }]} />
          </View>
          <Text style={styles.traderForecastText}>114 trader forecasts</Text>
        </TouchableOpacity>

        {/* News Feed */}
        <ScrollView style={styles.feed} contentContainerStyle={{ paddingBottom: 120 }}>
          {enhancedNewsData.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
          
          {/* "You're all caught up!" Section */}
          <View style={styles.caughtUpSection}>
            <View style={styles.integraIconContainer}>
              <View style={styles.integraIconSquare}>
                <Text style={styles.integraIconText}>i</Text>
              </View>
            </View>
            <Text style={styles.caughtUpText}>You're all caught up!</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={() => Alert.alert('Refresh', 'Refreshing news feed...')}>
              <MaterialIcons name="refresh" size={16} color={colors.accentData} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom Navigation with better indicators */}
        <View style={styles.bottomNav}>
          {navItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.navItem}
              onPress={() => {
                console.log('Navigating to:', item.label);
                setActiveNav(item.label);
                setShowMenuDrawer(false); // Close menu when navigating
              }}
            >
              <MaterialIcons
                name={item.icon}
                size={24}
                color={activeNav === item.label ? colors.accentPositive : colors.textSecondary}
              />
              <Text style={[styles.navLabel, activeNav === item.label ? styles.activeNavLabel : {}]}>
                {item.label}
              </Text>
              {/* Optional setup indicators - removed for cleaner UX during testing */}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  mobileContainer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  appHeader: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '300', // Light weight
  },
  agentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  agentStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  menuDrawer: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    padding: 15,
    shadowColor: colors.textSecondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  menuItemText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  menuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: 10,
    paddingTop: 10,
  },
  menuItemDangerText: {
    color: colors.accentNegative,
  },
  filtersContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 10,
    gap: 5,
  },
  activeFilterBtn: {
    backgroundColor: colors.accentPositive, // Example active style
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  activeFilterText: {
    color: colors.bgPrimary, // Dark text on active button
    fontWeight: '500',
  },
  feed: {
    flex: 1, // Takes remaining space
    paddingHorizontal: 15,
    marginTop: 5, // Small space below filters
  },
  // --- Card Styles ---
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15, // Space between cards
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Key change here!
    alignItems: 'center',
    marginBottom: 12,
  },
  sentimentInfo: { // Container for left side elements
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // Replaces margin-right on individual tags
  },
  sentimentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sentimentText: {
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  scoreTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  scoreText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  // Sentiment-specific styles
  bearish: { color: colors.accentNegative },
  bullish: { color: colors.accentPositive }, // Add if needed
  neutral: { color: colors.accentNeutral }, // Add if needed
  bearishBg: { backgroundColor: 'rgba(240, 84, 84, 0.1)' },
  scoreBearishBg: { backgroundColor: colors.accentNegative },
  bullishBg: { backgroundColor: 'rgba(78, 204, 163, 0.1)' },
  scoreBullishBg: { backgroundColor: colors.accentPositive },
  neutralBg: { backgroundColor: 'rgba(160, 160, 160, 0.1)' },
  scoreNeutralBg: { backgroundColor: colors.accentNeutral },
  cardBody: {
    marginBottom: 15, // Add space before footer line
  },
  headline: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 5,
    lineHeight: 22, // Adjust line height
  },
  summary: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 10,
  },
  sourceLink: {
    color: colors.accentData,
    fontSize: 13,
    fontWeight: '500',
  },
  timestamp: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // --- Bottom Nav Styles ---
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingVertical: 8, // Vertical padding
    paddingBottom: 5, // Extra padding at bottom if needed
  },
  navItem: {
    alignItems: 'center',
    flex: 1, // Distribute space evenly
    paddingVertical: 5,
  },
  navLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activeNavLabel: {
    color: colors.accentPositive, // Active color
  },
  setupIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    backgroundColor: colors.accentNegative,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupIndicatorText: {
    color: colors.bgPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  // --- Trader Forecast Bar Styles ---
  traderForecastBar: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  forecastSegments: {
    flexDirection: 'row',
    height: 6,
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.bgSecondary,
    marginBottom: 5,
  },
  segment: {
    height: '100%',
    position: 'relative',
  },
  activeSegmentIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    width: '50%',
    height: 2,
    backgroundColor: '#00FF00',
    borderRadius: 1,
  },
  traderForecastText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  // --- "You're all caught up!" Section Styles ---
  caughtUpSection: {
    alignItems: 'center',
    marginVertical: 30,
    paddingVertical: 20,
  },
  integraIconContainer: {
    marginBottom: 15,
  },
  integraIconSquare: {
    width: 40,
    height: 40,
    backgroundColor: colors.accentPositive,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  integraIconText: {
    color: colors.bgPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  caughtUpText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 15,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 8,
  },
  refreshButtonText: {
    color: colors.accentData,
    fontSize: 14,
    fontWeight: '500',
  },
  // --- Alerts Screen Styles ---
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    padding: 5,
  },
  alertsHeaderActions: {
    flexDirection: 'row',
    gap: 15,
  },
  alertTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  alertTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 10,
    gap: 5,
  },
  activeAlertTab: {
    backgroundColor: colors.accentData,
  },
  alertTabText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  activeAlertTabText: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  alertSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginHorizontal: 15,
    marginBottom: 20,
    gap: 10,
  },
  alertSearchPlaceholder: {
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  alertsContent: {
    flex: 1,
    paddingHorizontal: 15,
  },
  alertsSectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 15,
    marginTop: 10,
  },
  alertCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentPositive,
  },
  alertCardContent: {
    flex: 1,
  },
  alertTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  // Enhanced Profile Screen Styles
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerSpacer: {
    width: 34,
  },
  profileContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginBottom: 30,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentData,
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
  profileStatus: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  homeQuickButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.bgPrimary,
  },
  profileMenuSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  profileMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuItemIconDanger: {
    backgroundColor: 'rgba(240, 84, 84, 0.1)',
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  menuItemTitleDanger: {
    color: colors.accentNegative,
  },
  menuItemSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  // Quick Navigation Card Styles
  quickNavCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: colors.divider,
    borderStyle: 'dashed',
  },
  quickNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  quickNavText: {
    color: colors.accentData,
    fontSize: 16,
    fontWeight: '500',
  },
  // App Info Styles
  appInfoSection: {
    alignItems: 'center',
    paddingVertical: 30,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  appInfoText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  appInfoSubtext: {
    color: colors.textSecondary,
    fontSize: 12,
    opacity: 0.7,
  },
});