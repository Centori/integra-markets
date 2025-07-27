// Test file to verify all imports work correctly
import React from 'react';
import { View, Text } from 'react-native';

// Test design system imports
import { Colors } from './constants/colors';
import { Typography } from './constants/typography';

// Test common components imports
import {
  Icon,
  SentimentIcon,
  ActionIcon,
  SentimentTag,
  SourceTag,
  SentimentBar,
  ImpactBadge,
  FilterTabs,
  Chip,
} from './components/common';

// Test individual common component imports
import IconDirect from './components/common/Icon';
import SentimentTagDirect from './components/common/SentimentTag';
import SourceTagDirect from './components/common/SourceTag';
import SentimentBarDirect from './components/common/SentimentBar';
import ImpactBadgeDirect from './components/common/ImpactBadge';
import FilterTabsDirect from './components/common/FilterTabs';
import ChipDirect from './components/common/Chip';

// Test media kit imports
import Logo from './components/mediakit/Logo';
import LoadingScreen from './components/mediakit/LoadingScreen';
import WelcomeScreen from './components/mediakit/WelcomeScreen';
import NotificationBadge, { BadgeWrapper } from './components/mediakit/NotificationBadge';

// Test component to verify everything renders
const TestImports: React.FC = () => {
  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: Colors.background }}>
      <Text style={{ color: Colors.text, fontSize: Typography.fontSize.lg }}>
        Import Test - All components loaded successfully!
      </Text>
      
      {/* Test rendering a few components */}
      <SentimentTag sentiment="BULLISH" score={0.75} />
      <SourceTag name="Reuters" url="https://reuters.com" />
      <Chip label="Technology" />
      <Logo variant="icon" size="medium" />
      <NotificationBadge count={5} />
    </View>
  );
};

export default TestImports;

// Log success if this file compiles
console.log('✅ All imports verified successfully!');
