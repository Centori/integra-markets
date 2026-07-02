import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import TodayDashboard from './app/components/TodayDashboard';
import AlertsScreen from './app/components/AlertsScreen';
import ProfileScreen from './app/components/ProfileScreen';
import PredictionMarketsScreen from './app/screens/PredictionMarketsScreen';
import IntegraLoadingPage from './app/components/IntegraLoadingPage';
import ErrorBoundary from './app/components/ErrorBoundary';
import { BookmarkProvider } from './app/providers/BookmarkProvider';
import { PaywallProvider } from './app/paywall/PaywallProvider';
import { bootstrapEntitlements } from './app/hooks/useEntitlement';
import PendingDeletionBanner from './app/components/PendingDeletionBanner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerForPushNotificationsAsync,
  setupNotificationListeners,
  removeNotificationListeners,
} from './app/services/notificationService';
import { getPendingDeletion } from './app/services/accountService';

// Decide which tab a notification should land the user on.
// Convention: server includes one of these in the push payload's `data`:
//   data.tab        — 'Today' | 'Alerts' | 'Profile' | 'Markets'  (explicit)
//   data.type       — 'divergence_alert' | 'market_alert' | 'breaking_news'
//   data.articleId  — opens Today and signals which article to open
// Default lands on Today (the news feed) — same as a normal app launch,
// never the splash.
const VALID_TABS = new Set(['Today', 'Alerts', 'Profile', 'Markets']);

function resolveTabFromNotification(notificationResponse) {
  const data = notificationResponse?.notification?.request?.content?.data || {};
  if (typeof data.tab === 'string' && VALID_TABS.has(data.tab)) return data.tab;
  switch (data.type) {
    case 'divergence_alert':
      return 'Alerts';
    case 'market_alert':
    case 'breaking_news':
    default:
      return 'Today';
  }
}

function extractArticleFromNotification(notificationResponse) {
  const data = notificationResponse?.notification?.request?.content?.data || {};
  if (!data.articleId && !data.articleUrl) return null;
  return {
    id: data.articleId || null,
    url: data.articleUrl || null,
    title: data.articleTitle || null,
  };
}

// Ensure __DEV__ is defined
if (typeof global.__DEV__ === 'undefined') {
  global.__DEV__ = process.env.NODE_ENV === 'development';
}

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('Today');
  const [isLoading, setIsLoading] = useState(true);
  const [agentActive, setAgentActive] = useState(true);
  const [pendingDeletionExpiresAt, setPendingDeletionExpiresAt] = useState(null);
  // Article the user wants to open, set by a notification tap with articleId/Url.
  // TodayDashboard reads this and pops AIAnalysisOverlay automatically.
  const [pendingArticle, setPendingArticle] = useState(null);
  // Track whether we've already consumed the cold-start notification so a re-render
  // (e.g. tab switch) doesn't accidentally re-route the user back to it.
  const consumedColdStart = useRef(false);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('has_launched');
      if (!hasLaunched) {
        // First launch - request notification permissions
        await registerForPushNotificationsAsync();
        await AsyncStorage.setItem('has_launched', 'true');
      }
    } catch (error) {
      console.error('Error checking first launch:', error);
    }
  };

  const refreshPendingDeletion = async () => {
    const result = await getPendingDeletion();
    if (result.ok) {
      setPendingDeletionExpiresAt(result.data ? result.data.expires_at : null);
    }
  };

  // Route based on a notification (foreground tap, background resume, or cold start).
  const routeFromNotification = (response) => {
    if (!response) return;
    const tab = resolveTabFromNotification(response);
    const article = extractArticleFromNotification(response);
    setActiveTab(tab);
    if (article) setPendingArticle(article);
  };

  useEffect(() => {
    checkFirstLaunch();
    refreshPendingDeletion();
    // Fire-and-forget: initialize RevenueCat + fetch current tier. Falls back
    // to free_trial silently if the native module isn't linked.
    bootstrapEntitlements().catch((err) => console.warn('entitlements bootstrap failed:', err));

    let splashDelay = 2000;

    // Cold-start: did a notification launch the app? If so, route now and
    // collapse the splash so the user lands on the target without a 2s pause.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response && !consumedColdStart.current) {
          consumedColdStart.current = true;
          routeFromNotification(response);
          splashDelay = 300; // long enough for the splash logo to render once
        }
      })
      .catch((err) => console.warn('cold-start notification check failed:', err))
      .finally(() => {
        setTimeout(() => setIsLoading(false), splashDelay);
      });

    // Foreground + background taps go through the listener.
    const listeners = setupNotificationListeners(
      /* onNotificationReceived */ undefined,
      /* onNotificationResponse */ (response) => routeFromNotification(response)
    );

    return () => {
      removeNotificationListeners();
    };
  }, []);

  if (isLoading) {
    return <IntegraLoadingPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'Today':
        return (
          <TodayDashboard
            agentActive={agentActive}
            pendingArticle={pendingArticle}
            onPendingArticleConsumed={() => setPendingArticle(null)}
          />
        );
      case 'Markets':
        return <PredictionMarketsScreen />;
      case 'Alerts':
        return <AlertsScreen />;
      case 'Profile':
        return (
          <ProfileScreen
            onAccountDeletionScheduled={(expiresAt) => {
              setPendingDeletionExpiresAt(expiresAt);
              setActiveTab('Today');
            }}
          />
        );
      default:
        return <TodayDashboard agentActive={agentActive} />;
    }
  };

  return (
    <ErrorBoundary>
      <BookmarkProvider>
        <PaywallProvider>
        <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />

        {pendingDeletionExpiresAt ? (
          <PendingDeletionBanner
            expiresAt={pendingDeletionExpiresAt}
            onRestored={() => setPendingDeletionExpiresAt(null)}
          />
        ) : null}

        {/* Main Content */}
        <View style={styles.content}>
          {renderContent()}
        </View>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'Today' && styles.navItemActive]}
            onPress={() => setActiveTab('Today')}
          >
            <Ionicons
              name={activeTab === 'Today' ? 'today' : 'today-outline'}
              size={24}
              color={activeTab === 'Today' ? '#4ECCA3' : '#666666'}
            />
            <Text style={[styles.navText, activeTab === 'Today' && styles.navTextActive]}>
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'Alerts' && styles.navItemActive]}
            onPress={() => setActiveTab('Alerts')}
          >
            <Ionicons
              name={activeTab === 'Alerts' ? 'notifications' : 'notifications-outline'}
              size={24}
              color={activeTab === 'Alerts' ? '#4ECCA3' : '#666666'}
            />
            <Text style={[styles.navText, activeTab === 'Alerts' && styles.navTextActive]}>
              Alerts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'Profile' && styles.navItemActive]}
            onPress={() => setActiveTab('Profile')}
          >
            <Ionicons
              name={activeTab === 'Profile' ? 'person' : 'person-outline'}
              size={24}
              color={activeTab === 'Profile' ? '#4ECCA3' : '#666666'}
            />
            <Text style={[styles.navText, activeTab === 'Profile' && styles.navTextActive]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
        </PaywallProvider>
      </BookmarkProvider>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingBottom: 20,
    paddingTop: 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navItemActive: {
    // Active state styling handled by icon and text colors
  },
  navText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    fontWeight: '500',
  },
  navTextActive: {
    color: '#4ECCA3',
    fontWeight: '600',
  },
});

export default MainApp;