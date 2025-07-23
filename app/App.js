// FixedApp.js - Fixed version with crash prevention
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

// Simple error boundary wrapper
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <StatusBar barStyle="light-content" />
          <MaterialIcons name="error" size={48} color="#4ECCA3" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>Please restart the app</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

// Color palette
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

// Simplified loading component
const LoadingScreen = () => (
  <SafeAreaView style={styles.container}>
    <StatusBar barStyle="light-content" />
    <View style={styles.loadingContainer}>
      <View style={styles.logoContainer}>
        <MaterialIcons name="analytics" size={60} color={colors.accentPositive} />
      </View>
      <Text style={styles.loadingTitle}>Integra Markets</Text>
      <Text style={styles.loadingSubtitle}>Loading...</Text>
    </View>
  </SafeAreaView>
);

// Simplified onboarding component
const SimpleOnboarding = ({ onComplete, onSkip }) => (
  <SafeAreaView style={styles.container}>
    <StatusBar barStyle="light-content" />
    <View style={styles.onboardingContainer}>
      <View style={styles.logoContainer}>
        <MaterialIcons name="analytics" size={60} color={colors.accentPositive} />
      </View>
      
      <Text style={styles.onboardingTitle}>Welcome to Integra Markets</Text>
      <Text style={styles.onboardingSubtitle}>
        AI-powered commodity trading insights and prediction markets
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={onComplete}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={onSkip}>
          <Text style={styles.secondaryButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  </SafeAreaView>
);

// Sample news data
const sampleNews = [
  {
    id: '1',
    sentiment: 'BULLISH',
    icon: 'trending-up',
    score: '0.78',
    headline: 'Oil Prices Rally on Supply Concerns',
    summary: 'Crude oil futures surge amid geopolitical tensions and supply disruptions affecting global markets.',
    source: 'Bloomberg',
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    sentiment: 'BEARISH',
    icon: 'trending-down',
    score: '0.65',
    headline: 'Gold Retreats as Dollar Strengthens',
    summary: 'Precious metals fall as stronger dollar makes gold more expensive for international buyers.',
    source: 'Reuters',
    timestamp: '3 hours ago',
  },
];

// News card component
const NewsCard = ({ item }) => {
  const getSentimentColors = (sentiment) => {
    switch (sentiment) {
      case 'BULLISH':
        return { text: colors.accentPositive, bg: 'rgba(78, 204, 163, 0.1)' };
      case 'BEARISH':
        return { text: colors.accentNegative, bg: 'rgba(240, 84, 84, 0.1)' };
      default:
        return { text: colors.textSecondary, bg: colors.bgSecondary };
    }
  };

  const sentimentColors = getSentimentColors(item.sentiment);

  return (
    <View style={styles.newsCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.sentimentTag, { backgroundColor: sentimentColors.bg }]}>
          <MaterialIcons name={item.icon} size={16} color={sentimentColors.text} />
          <Text style={[styles.sentimentText, { color: sentimentColors.text }]}>
            {item.sentiment}
          </Text>
        </View>
        <View style={[styles.scoreTag, { backgroundColor: sentimentColors.text }]}>
          <Text style={styles.scoreText}>{item.score}</Text>
        </View>
      </View>
      
      <Text style={styles.headline}>{item.headline}</Text>
      <Text style={styles.summary}>{item.summary}</Text>
      
      <View style={styles.cardFooter}>
        <Text style={styles.source}>{item.source}</Text>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
      </View>
    </View>
  );
};

// Main app component
const FixedApp = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeNav, setActiveNav] = useState('Today');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simple initialization with error handling
    const initApp = async () => {
      try {
        console.log('Initializing app...');
        
        // Simulate loading and check for stored preferences
        setTimeout(() => {
          setIsLoading(false);
          // For now, always show onboarding for testing
          setShowOnboarding(true);
        }, 2000);
        
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  const handleOnboardingComplete = () => {
    console.log('Onboarding completed');
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    console.log('Onboarding skipped');
    setShowOnboarding(false);
  };

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" />
        <MaterialIcons name="error" size={48} color={colors.accentPositive} />
        <Text style={styles.errorTitle}>Error: {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setIsLoading(true);
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (showOnboarding) {
    return (
      <SimpleOnboarding 
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  // Main app UI
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today</Text>
        <TouchableOpacity onPress={() => Alert.alert('Settings', 'Settings coming soon!')}>
          <MaterialIcons name="settings" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* News Feed */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {sampleNews.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
        
        {/* End message */}
        <View style={styles.endMessage}>
          <Text style={styles.endMessageText}>You're all caught up! 🎉</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => Alert.alert('Refresh', 'Refreshing feed...')}
          >
            <MaterialIcons name="refresh" size={16} color={colors.accentData} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {['Today', 'Alerts', 'Profile'].map((item) => (
          <TouchableOpacity
            key={item}
            style={styles.navItem}
            onPress={() => setActiveNav(item)}
          >
            <MaterialIcons
              name={
                item === 'Today' ? 'flash-on' :
                item === 'Alerts' ? 'notifications' : 'person'
              }
              size={24}
              color={activeNav === item ? colors.accentPositive : colors.textSecondary}
            />
            <Text style={[
              styles.navLabel,
              { color: activeNav === item ? colors.accentPositive : colors.textSecondary }
            ]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

// Wrap with error boundary
const WrappedApp = () => (
  <ErrorBoundary>
    <FixedApp />
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(78, 204, 163, 0.1)',
    borderRadius: 50,
  },
  loadingTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingSubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  onboardingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  onboardingTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  onboardingSubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: colors.accentPositive,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.bgPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
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
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '300',
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  newsCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sentimentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scoreText: {
    color: colors.bgPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  headline: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 24,
  },
  summary: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  source: {
    color: colors.accentData,
    fontSize: 13,
    fontWeight: '500',
  },
  timestamp: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  endMessage: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  endMessageText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 16,
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
  refreshText: {
    color: colors.accentData,
    fontSize: 14,
    fontWeight: '500',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingVertical: 10,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 5,
  },
  navLabel: {
    fontSize: 10,
    marginTop: 2,
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
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
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
