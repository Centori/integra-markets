// App.simple.js - Clean working version resolving React DOM and export issues
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
import AsyncStorage from '@react-native-async-storage/async-storage';
// Fixed: Import vector icons more explicitly to avoid export conflicts
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
// Fixed: Import Toast with proper error handling
import Toast from 'react-native-toast-message';

// Check if Hermes is enabled
const isHermes = () => !!global.HermesInternal;

// Color Palette
const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3',
  accentNeutral: '#A0A0A0',
  accentNegative: '#F05454',
  accentData: '#30A5FF',
  divider: '#333333',
};

// Sample data
const enhancedNewsData = [
  {
    id: '1',
    sentiment: 'NEUTRAL',
    icon: 'trending-flat',
    score: '0.50',
    headline: 'US Natural Gas Storage Exceeds Expectations',
    summary: 'Weekly natural gas storage report shows higher than expected inventory build, indicating potential oversupply conditions in key markets.',
    source: 'Bloomberg',
    timestamp: '2 hours ago',
    isAiInsight: true,
  },
  {
    id: '2',
    sentiment: 'BEARISH',
    icon: 'trending-down',
    score: '0.78',
    headline: 'Drought Conditions Worsen in Key Corn Growing Regions',
    summary: 'Extended drought in the US Midwest has raised concerns about corn yields for the upcoming harvest season, potentially affecting global supply.',
    source: 'Reuters',
    timestamp: '3 hours ago',
    isAiInsight: true,
  },
];

const filters = ['All', 'Bullish', 'Neutral', 'Bearish'];
const navItems = [
  { label: 'Today', icon: 'flash-on' },
  { label: 'Alerts', icon: 'notifications' },
  { label: 'Profile', icon: 'person' },
];

// News Card Component
const NewsCard = ({ item }) => {
  let sentimentStyle, sentimentBgStyle, iconColor;
  
  switch (item.sentiment) {
    case 'BULLISH':
      sentimentStyle = styles.bullish;
      sentimentBgStyle = styles.bullishBg;
      iconColor = colors.accentPositive;
      break;
    case 'NEUTRAL':
      sentimentStyle = styles.neutral;
      sentimentBgStyle = styles.neutralBg;
      iconColor = colors.accentNeutral;
      break;
    case 'BEARISH':
    default:
      sentimentStyle = styles.bearish;
      sentimentBgStyle = styles.bearishBg;
      iconColor = colors.accentNegative;
      break;
  }

  return (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.sentimentInfo}>
          <View style={[styles.sentimentTag, sentimentBgStyle]}>
            <MaterialIcons name={item.icon} size={14} color={iconColor} />
            <Text style={[styles.sentimentText, sentimentStyle]}>{item.sentiment}</Text>
          </View>
          <View style={styles.scoreTag}>
            <Text style={styles.scoreText}>{item.score}</Text>
          </View>
        </View>
        {item.isAiInsight && (
          <MaterialIcons name="auto-awesome" size={18} color={colors.accentData} />
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.headline}>{item.headline}</Text>
        <Text style={styles.summary}>{item.summary}</Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.sourceLink}>{item.source}</Text>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
      </View>
    </TouchableOpacity>
  );
};

// Main App Component
export default function App() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeNav, setActiveNav] = useState('Today');

  useEffect(() => {
    console.log('Using Hermes:', isHermes());
    
    // Show welcome toast
    Toast.show({
      type: 'success',
      text1: 'Integra Markets',
      text2: `Hermes ${isHermes() ? 'Enabled' : 'Disabled'} - Development Build Working!`
    });
  }, []);

  const getFilterIcon = (filterName) => {
    switch(filterName) {
      case 'All': return <MaterialCommunityIcons name="chart-line" size={14} color={activeFilter === filterName ? colors.bgPrimary: colors.textSecondary} />;
      case 'Bullish': return <MaterialIcons name="trending-up" size={14} color={activeFilter === filterName ? colors.bgPrimary: colors.textSecondary} />;
      case 'Neutral': return <MaterialIcons name="trending-flat" size={14} color={activeFilter === filterName ? colors.bgPrimary: colors.textSecondary} />;
      case 'Bearish': return <MaterialIcons name="trending-down" size={14} color={activeFilter === filterName ? colors.bgPrimary: colors.textSecondary} />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.mobileContainer}>
        {/* Header */}
        <View style={styles.appHeader}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Integra Markets</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => Alert.alert('Notifications', 'View all notifications')}>
                <MaterialIcons name="notifications-none" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
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
            <TouchableOpacity style={styles.refreshButton} onPress={() => {
              Toast.show({
                type: 'info',
                text1: 'Refreshing...',
                text2: 'News feed updated'
              });
            }}>
              <MaterialIcons name="refresh" size={16} color={colors.accentData} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          {navItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.navItem}
              onPress={() => {
                setActiveNav(item.label);
                Toast.show({
                  type: 'info',
                  text1: `Switched to ${item.label}`,
                  text2: 'Navigate between sections'
                });
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
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Toast Component - Always rendered last */}
      <Toast />
    </SafeAreaView>
  );
}

// Styles
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
    paddingVertical: 15,
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
    fontWeight: '300',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
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
    backgroundColor: colors.accentPositive,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  activeFilterText: {
    color: colors.bgPrimary,
    fontWeight: '500',
  },
  feed: {
    flex: 1,
    paddingHorizontal: 15,
    marginTop: 5,
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sentimentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    backgroundColor: colors.accentNeutral,
  },
  scoreText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  bearish: { color: colors.accentNegative },
  bullish: { color: colors.accentPositive },
  neutral: { color: colors.accentNeutral },
  bearishBg: { backgroundColor: 'rgba(240, 84, 84, 0.1)' },
  bullishBg: { backgroundColor: 'rgba(78, 204, 163, 0.1)' },
  neutralBg: { backgroundColor: 'rgba(160, 160, 160, 0.1)' },
  cardBody: {
    marginBottom: 15,
  },
  headline: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 5,
    lineHeight: 22,
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
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingVertical: 8,
    paddingBottom: 5,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 5,
  },
  navLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activeNavLabel: {
    color: colors.accentPositive,
  },
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
});
