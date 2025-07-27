import React, { useState } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  TouchableOpacity 
} from 'react-native';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';

// Import all components
import {
  SentimentTag,
  SourceTag,
  SentimentBar,
  ImpactBadge,
  FilterTabs,
  Chip,
  ActionIcon,
  FilterType
} from '../components/common';

import Logo from '../components/mediakit/Logo';
import LoadingScreen from '../components/mediakit/LoadingScreen';
import WelcomeScreen from '../components/mediakit/WelcomeScreen';
import NotificationBadge, { BadgeWrapper } from '../components/mediakit/NotificationBadge';

const ComponentDemo: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [showLoading, setShowLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set());

  if (showLoading) {
    return (
      <LoadingScreen 
        message="Loading demo components..." 
        showProgress 
        progress={75} 
      />
    );
  }

  if (showWelcome) {
    return (
      <WelcomeScreen 
        onGetStarted={() => setShowWelcome(false)}
        showFeatures
      />
    );
  }

  const toggleChip = (label: string) => {
    const newSet = new Set(selectedChips);
    if (newSet.has(label)) {
      newSet.delete(label);
    } else {
      newSet.add(label);
    }
    setSelectedChips(newSet);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Logo variant="full" size="large" />
          <Text style={styles.title}>Component Demo</Text>
        </View>

        {/* Logo Variants */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logo Variants</Text>
          <View style={styles.row}>
            <Logo variant="icon" size="small" />
            <Logo variant="text" size="medium" />
            <Logo variant="full" size="small" />
          </View>
          <View style={styles.spacer} />
          <Text style={styles.sectionSubtitle}>With Green Accent</Text>
          <View style={styles.row}>
            <Logo variant="text" size="medium" accentColor={Colors.bullish} />
            <Logo variant="full" size="small" accentColor={Colors.bullish} />
          </View>
          <View style={styles.spacer} />
          <Text style={styles.sectionSubtitle}>Different Sizes</Text>
          <View style={styles.row}>
            <Logo variant="full" size="large" accentColor={Colors.accentPositive} />
          </View>
        </View>

        {/* Sentiment Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sentiment Tags</Text>
          <View style={styles.row}>
            <SentimentTag sentiment="BULLISH" score={0.85} />
            <SentimentTag sentiment="BEARISH" score={0.65} />
            <SentimentTag sentiment="NEUTRAL" score={0.50} />
          </View>
          <View style={styles.row}>
            <SentimentTag sentiment="BULLISH" score={0.85} size="small" />
            <SentimentTag sentiment="BEARISH" score={0.65} size="large" showIcon={false} />
          </View>
        </View>

        {/* Source Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Source Tags</Text>
          <View style={styles.row}>
            <SourceTag name="Reuters" url="https://reuters.com" />
            <SourceTag name="Bloomberg" />
            <SourceTag name="CNBC" url="https://cnbc.com" showIcon={false} />
          </View>
        </View>

        {/* Sentiment Bars */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sentiment Bars</Text>
          <SentimentBar bullish={60} bearish={25} neutral={15} />
          <View style={styles.spacer} />
          <SentimentBar 
            bullish={45} 
            bearish={35} 
            neutral={20} 
            showPercentages={false} 
          />
          <View style={styles.spacer} />
          <SentimentBar 
            bullish={70} 
            bearish={20} 
            neutral={10} 
            compact 
            height={10}
          />
        </View>

        {/* Impact Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impact Badges</Text>
          <View style={styles.row}>
            <ImpactBadge level="LOW" />
            <ImpactBadge level="MEDIUM" />
            <ImpactBadge level="HIGH" />
          </View>
          <View style={styles.row}>
            <ImpactBadge level="HIGH" size="small" />
            <ImpactBadge level="MEDIUM" size="large" showConfidence confidence={0.87} />
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filter Tabs</Text>
          <FilterTabs
            tabs={['All', 'Bullish', 'Bearish', 'Neutral']}
            activeTab={activeFilter}
            onTabChange={setActiveFilter}
          />
        </View>

        {/* Chips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chips</Text>
          <View style={styles.chipContainer}>
            <Chip label="Technology" />
            <Chip label="Finance" value={42} />
            <Chip 
              label="Energy" 
              selected={selectedChips.has('Energy')}
              onPress={() => toggleChip('Energy')}
            />
            <Chip 
              label="Healthcare" 
              selected={selectedChips.has('Healthcare')}
              onPress={() => toggleChip('Healthcare')}
              size="small"
            />
            <Chip label="Large Chip" size="large" />
          </View>
        </View>

        {/* Notification Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Badges</Text>
          <View style={styles.row}>
            <NotificationBadge count={5} />
            <NotificationBadge count={99} variant="alert" />
            <NotificationBadge count={150} variant="success" />
            <NotificationBadge showDot variant="sentiment" />
          </View>
          <View style={styles.spacer} />
          <BadgeWrapper badge={{ count: 3, variant: 'alert' }}>
            <TouchableOpacity style={styles.iconButton}>
              <ActionIcon type="bookmark" size={24} color={Colors.text} />
            </TouchableOpacity>
          </BadgeWrapper>
        </View>

        {/* Demo Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Screen Demos</Text>
          <TouchableOpacity 
            style={styles.demoButton}
            onPress={() => setShowLoading(true)}
          >
            <Text style={styles.demoButtonText}>Show Loading Screen</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.demoButton}
            onPress={() => setShowWelcome(true)}
          >
            <Text style={styles.demoButtonText}>Show Welcome Screen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: 10,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginVertical: 5,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  spacer: {
    height: 15,
  },
  iconButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.card,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 5,
  },
  demoButtonText: {
    color: '#000',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
});

export default ComponentDemo;
