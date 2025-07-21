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
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import TodayDashboard from './components/TodayDashboard';
import IntegraLoadingPage from './components/IntegraLoadingPage';
import AuthLoadingScreen from './components/AuthLoadingScreen';
import OnboardingForm from './components/OnboardingForm';
import AlertPreferencesForm from './components/AlertPreferencesForm';
import ProfileScreen from './components/ProfileScreen';
import ComprehensiveProfileScreen from './components/ComprehensiveProfileScreen';
import { activateAgentMode, getAgentStatus } from './config/agent';
import { checkApiStatus } from './services/api';

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
  
  const handleAIAnalysisPress = () => {
    setShowAIAnalysisOverlay(true);
  };
  
  const handleCloseAnalysis = () => {
    setShowAIAnalysisOverlay(false);
  };
  
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
    <View>
      <TouchableOpacity 
        style={styles.card}
        onPress={handleAIAnalysisPress}
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
            <TouchableOpacity onPress={handleAIAnalysisPress}>
              <MaterialIcons name="auto-awesome" size={18} color={colors.accentData} />
            </TouchableOpacity>
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

      {/* AI Analysis Modal */}
      {showAIAnalysisOverlay && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Integra Analysis</Text>
              <TouchableOpacity onPress={handleCloseAnalysis}>
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {/* Article Title */}
              <Text style={styles.articleTitle}>{item.headline}</Text>
              <Text style={styles.articleSource}>{item.source}</Text>
              
              {/* Summary Section */}
              <View style={styles.analysisSection}>
                <Text style={styles.sectionTitle}>Summary</Text>
                <Text style={styles.sectionText}>
                  {item.preprocessing?.commodity === 'gas' 
                    ? "Weekly natural gas storage report shows higher than expected inventory build, indicating potential oversupply conditions in key markets. This could signal bearish pressure on natural gas prices in the near term."
                    : item.preprocessing?.commodity === 'agriculture'
                    ? "Extended drought conditions in key agricultural regions raise concerns about crop yields and potential supply shortages. Weather patterns suggest continued stress on agricultural commodities."
                    : item.preprocessing?.commodity === 'oil'
                    ? "Geopolitical tensions and supply disruptions continue to create uncertainty in oil markets. Current events suggest potential for increased volatility and price movements."
                    : "Market analysis indicates significant developments that could impact commodity prices and trading strategies in the near term."
                  }
                </Text>
              </View>
              
              {/* Market Impact */}
              <View style={styles.analysisSection}>
                <Text style={styles.sectionTitle}>Market Impact</Text>
                <View style={styles.impactContainer}>
                  <View style={[styles.impactBadge, { 
                    backgroundColor: item.preprocessing?.severity === 'high' ? colors.accentNegative : 
                                   item.preprocessing?.severity === 'medium' ? colors.accentNeutral : colors.accentPositive 
                  }]}>
                    <Text style={styles.impactText}>
                      {item.preprocessing?.severity?.toUpperCase() || 'MEDIUM'}
                    </Text>
                  </View>
                  <Text style={styles.confidenceText}>
                    Confidence: {((item.preprocessing?.confidence_score || 0.5) * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
              
              {/* Key Drivers */}
              <View style={styles.analysisSection}>
                <Text style={styles.sectionTitle}>Key Sentiment Drivers</Text>
                <View style={styles.driversContainer}>
                  {(item.preprocessing?.trigger_keywords || ['market', 'supply', 'demand']).map((keyword, index) => (
                    <View key={index} style={styles.driverTag}>
                      <Text style={styles.driverText}>{keyword}</Text>
                    </View>
                  ))}
                </View>
              </View>
              
              {/* Trading Intelligence */}
              <View style={styles.analysisSection}>
                <Text style={styles.sectionTitle}>What this means for Traders</Text>
                <View style={styles.tradingInsights}>
                  <Text style={styles.insightText}>
                    • Monitor {item.preprocessing?.commodity || 'commodity'} markets for volatility
                  </Text>
                  <Text style={styles.insightText}>
                    • Consider risk management strategies for existing positions
                  </Text>
                  <Text style={styles.insightText}>
                    • Watch for confirmation signals in related markets
                  </Text>
                </View>
              </View>
              
              {/* AI Attribution */}
              <View style={styles.attribution}>
                <MaterialIcons name="auto-awesome" size={16} color={colors.textSecondary} />
                <Text style={styles.attributionText}>AI-powered market analysis</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};


// --- Main App Component ---
export default function App() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeNav, setActiveNav] = useState('Today');
  const [agentActive, setAgentActive] = useState(false);
  const [apiRunning, setApiRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAlertPreferences, setShowAlertPreferences] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userPreferences, setUserPreferences] = useState(null);
  
  // Enhanced navigation state
  const [userOnboarded, setUserOnboarded] = useState(false); // Start with false to check auth
  const [alertPreferencesSet, setAlertPreferencesSet] = useState(true); // Default to true for testing
  const [skipOnboarding, setSkipOnboarding] = useState(false); // Start with false
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  // Load user preferences and onboarding state
  useEffect(() => {
    loadUserState();
  }, []);

  const loadUserState = async () => {
    try {
      // Check authentication status first
      const savedUserData = await AsyncStorage.getItem('userData');
      const savedPreferences = await AsyncStorage.getItem('userPreferences');
      const onboardingComplete = await AsyncStorage.getItem('onboarding_complete');
      const alertPrefsSet = await AsyncStorage.getItem('alert_preferences_set');
      const userSkippedOnboarding = await AsyncStorage.getItem('skipped_onboarding');
      
      if (savedUserData) {
        const user = JSON.parse(savedUserData);
        setUserData(user);
        console.log('User authenticated:', user.username || user.email);
        
        if (savedPreferences) {
          setUserPreferences(JSON.parse(savedPreferences));
          setUserOnboarded(true);
        } else if (user.authMethod === 'google' && !user.hasCompletedOnboarding) {
          // Google user who hasn't completed full onboarding
          setShowOnboarding(true);
        } else {
          setUserOnboarded(onboardingComplete === 'true');
        }
      } else {
        // No user data, show authentication
        console.log('No user data found - showing authentication');
        setShowAuth(true);
        return; // Exit early
      }
      
      setAlertPreferencesSet(alertPrefsSet === 'true' || alertPrefsSet === null);
      setSkipOnboarding(userSkippedOnboarding === 'true');
      
      console.log('User state loaded:', {
        authenticated: !!savedUserData,
        onboarded: onboardingComplete === 'true' || !!savedPreferences,
        alertPrefs: alertPrefsSet === 'true' || alertPrefsSet === null,
        skipped: userSkippedOnboarding === 'true'
      });
    } catch (error) {
      console.warn('Error loading user state:', error);
      // If error, show authentication
      setShowAuth(true);
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
    
    // Show toast confirmation
    toastMessages.onboarding.completed();
    
    // Show alert preferences if not set
    if (!alertPreferencesSet) {
      setTimeout(() => {
        setShowAlertPreferences(true);
      }, 500); // Small delay after toast
    }
  };

  const handleOnboardingSkip = async () => {
    console.log('Onboarding skipped');
    await saveUserState('skipped_onboarding', true);
    setSkipOnboarding(true);
    setShowOnboarding(false);
    
    // Show toast confirmation
    toastMessages.onboarding.skipped();
    
    // Still offer alert preferences setup
    setTimeout(() => {
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
    }, 1000);
  };

  const handleAlertPreferencesComplete = async (preferences) => {
    console.log('Alert preferences completed:', preferences);
    await saveUserState('alert_preferences_set', true);
    setAlertPreferencesSet(true);
    setShowAlertPreferences(false);
    
    // Navigate back to main app
    setActiveNav('Today');
    
    // Show toast confirmation
    toastMessages.alerts.preferencesSet();
  };

  const handleAlertPreferencesSkip = async () => {
    console.log('Alert preferences skipped');
    setShowAlertPreferences(false);
    
    // Navigate back to main app
    setActiveNav('Today');
    
    // Show toast confirmation
    toastMessages.alerts.preferencesSkipped();
  };

  // Navigation helpers
  const navigateToOnboarding = () => {
    setShowOnboarding(true);
  };

  const navigateToAlertPreferences = () => {
    setShowAlertPreferences(true);
  };

  const handleAuthComplete = async (user) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      setUserData(user);
      setShowAuth(false);
      
      // Show welcome toast
      if (user.isNewUser) {
        toastMessages.auth.signupSuccess();
      } else {
        toastMessages.auth.loginSuccess();
      }
      
      // If it's a Google user or new email signup, go to onboarding
      // If it's a returning user, check for existing preferences
      if (user.authMethod === 'google' || user.isNewUser) {
        setShowOnboarding(true);  // Navigate to onboarding
      } else {
        const savedPreferences = await AsyncStorage.getItem('userPreferences');
        if (savedPreferences) {
          setUserPreferences(JSON.parse(savedPreferences));
          setUserOnboarded(true);
        } else {
          setShowOnboarding(true); // Navigate to onboarding if no preferences
        }
      }
    } catch (error) {
      console.error('Error saving user data:', error);
      toastMessages.auth.loginError();
      Alert.alert('Error', 'Failed to save user data. Please try again.');
    }
  };

  const handleAuthSkip = async (guestData) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(guestData));
      setUserData(guestData);
      setShowAuth(false);
      setShowOnboarding(true);
    } catch (error) {
      console.error('Error saving guest data:', error);
      Alert.alert('Error', 'Failed to save guest data. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await AsyncStorage.multiRemove(['userData', 'userPreferences', 'onboarding_complete', 'alert_preferences_set']);
      setUserData(null);
      setUserPreferences(null);
      setUserOnboarded(false);
      setShowAuth(true);
      setActiveNav('Today');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const resetUserData = async () => {
    Alert.alert(
      'Reset User Data',
      'This will clear all your preferences and show authentication again. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
                onPress: async () => {
                  try {
                    await AsyncStorage.multiRemove([
                      'userData',
                      'userPreferences',
                      'onboarding_complete',
                      'alert_preferences_set',
                      'skipped_onboarding'
                    ]);
                    
                    // Show toast confirmation
                    toastMessages.navigation.dataReset();
                    
                    // Reset state and show authentication
                    setUserData(null);
                    setUserPreferences(null);
                    setUserOnboarded(false);
                    setAlertPreferencesSet(false);
                    setSkipOnboarding(false);
                    
                    setTimeout(() => {
                      setShowAuth(true);
                    }, 2000); // Delay to let toast show
                  } catch (error) {
                    console.warn('Error resetting user data:', error);
                    toastMessages.general.error('Failed to reset app data');
                  }
                }
        }
      ]
    );
  };

  const deleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all local data
              await AsyncStorage.multiRemove([
                'userData',
                'userPreferences',
                'onboarding_complete',
                'alert_preferences_set',
                'skipped_onboarding'
              ]);
              
              // Show toast confirmation
              toastMessages.general.success('Account deleted successfully');
              
              // Reset state and show authentication
              setUserData(null);
              setUserPreferences(null);
              setUserOnboarded(false);
              setAlertPreferencesSet(false);
              setSkipOnboarding(false);
              
              setTimeout(() => {
                setShowAuth(true);
              }, 2000); // Delay to let toast show
            } catch (error) {
              console.warn('Error deleting account:', error);
              toastMessages.general.error('Failed to delete account');
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

  // Show authentication screen
  if (showAuth) {
    return (
      <AuthLoadingScreen 
        onAuthComplete={handleAuthComplete}
        onSkip={handleAuthSkip}
      />
    );
  }

  // Show onboarding with skip option (only if explicitly requested)
  if (showOnboarding) {
    console.log('Showing onboarding');
    return (
      <OnboardingForm 
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        showSkipOption={true}
        userData={userData}
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
    // Navigate directly to Alert Preferences instead of separate AlertsScreen
    return (
      <AlertPreferencesForm 
        onComplete={(preferences) => {
          console.log('Alert preferences completed:', preferences);
          setActiveNav('Today'); // Navigate back to main app
          if (preferences) {
            handleAlertPreferencesComplete(preferences);
          }
        }}
        onSkip={() => {
          console.log('Alert preferences skipped');
          setActiveNav('Today'); // Navigate back to main app
          handleAlertPreferencesSkip();
        }}
        showSkipOption={false}
      />
    );
  }
  
  if (activeNav === 'Profile') {
    // Sample data for testing the comprehensive profile screen
    const sampleUserProfile = {
      username: userData?.username || userData?.name || 'Integra User',
      role: userData?.role || 'trader',
      institution: userData?.institution || 'Independent Trader',
      bio: userData?.bio || 'Commodity trading professional focused on energy and metals markets.',
      experience: userData?.experience || '5+ years',
      marketFocus: userData?.marketFocus || ['Energy', 'Metals', 'Agriculture']
    };

    const sampleApiKeys = [
      {
        id: '1',
        name: 'OpenAI API Key',
        provider: 'openai',
        createdAt: new Date('2024-01-15')
      },
      {
        id: '2',
        name: 'Claude API Key',
        provider: 'claude',
        createdAt: new Date('2024-02-01')
      }
    ];

    const sampleBookmarks = [
      {
        id: '1',
        title: 'Oil Prices Surge on Middle East Tensions',
        source: 'Reuters'
      },
      {
        id: '2',
        title: 'Gold Reaches New High Amid Fed Uncertainty',
        source: 'Bloomberg'
      },
      {
        id: '3',
        title: 'Copper Supply Disruption in Chile',
        source: 'Mining Weekly'
      },
      {
        id: '4',
        title: 'Natural Gas Storage Levels Hit Record',
        source: 'Energy Intelligence'
      }
    ];

    return (
      <ComprehensiveProfileScreen 
        userProfile={sampleUserProfile}
        alertPreferences={{
          commodities: ['Crude Oil', 'Gold', 'Natural Gas', 'Copper'],
          frequency: 'daily',
          notifications: true
        }}
        apiKeys={sampleApiKeys}
        bookmarks={sampleBookmarks}
        selectedProvider='openai'
        onBack={() => setActiveNav('Today')}
        removeAPIKey={(keyId) => {
          console.log('Remove API key:', keyId);
          Alert.alert('API Key Removed', `API key ${keyId} has been removed.`);
        }}
        selectProvider={(provider) => {
          console.log('Selected provider:', provider);
          Alert.alert('Provider Selected', `${provider} is now the active AI provider.`);
        }}
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
                
                // Show navigation toast for non-current screens
                if (item.label !== activeNav) {
                  console.log(`Switched to ${item.label}`);
                }
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
  // Additional styles for enhanced ProfileScreen
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  editButton: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    color: colors.accentData,
    fontSize: 14,
    fontWeight: "500",
  },
  addButton: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 20,
    padding: 8,
  },
  bookmarkCount: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  profileCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  profileHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  profileBio: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  profileStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  profileStat: {
    alignItems: "center",
  },
  profileStatValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  profileStatLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  alertsCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: "hidden",
  },
  alertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  alertLabel: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  alertValue: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.divider,
  },
  emptyStateText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  keysList: {
    gap: 12,
  },
  keyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: "hidden",
  },
  keyContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  keyInfo: {
    flex: 1,
  },
  keyName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  keyProvider: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 2,
  },
  keyDate: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  deleteButton: {
    padding: 16,
    borderLeftWidth: 1,
    borderLeftColor: colors.divider,
  },
  bookmarksList: {
    gap: 12,
  },
  bookmarkItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  bookmarkContent: {
    flex: 1,
  },
  bookmarkTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  bookmarkSource: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  viewAllText: {
    color: colors.accentData,
    fontSize: 16,
    fontWeight: "500",
  },
  settingsList: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  settingText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  modalPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPlaceholderText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  modalCloseText: {
    color: colors.accentData,
    fontSize: 16,
    fontWeight: '500',
  },
  // AI Analysis Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
    maxHeight: 400,
  },
  articleTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 24,
  },
  articleSource: {
    color: colors.accentData,
    fontSize: 14,
    marginBottom: 20,
  },
  analysisSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.accentData,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentData,
    paddingLeft: 12,
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  impactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  impactBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  impactText: {
    color: colors.bgPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  confidenceText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  driversContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  driverTag: {
    backgroundColor: colors.accentData,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  driverText: {
    color: colors.bgPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  tradingInsights: {
    gap: 8,
  },
  insightText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  attribution: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: 16,
  },
  attributionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
