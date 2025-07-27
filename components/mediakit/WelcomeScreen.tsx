import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity,
  Dimensions,
  ScrollView
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import Logo from './Logo';
import { SentimentIcon } from '../common/Icon';

interface WelcomeScreenProps {
  onGetStarted?: () => void;
  showFeatures?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FEATURES = [
  {
    icon: 'bullish' as const,
    title: 'AI-Powered Analysis',
    description: 'Get real-time sentiment analysis of market news'
  },
  {
    icon: 'bearish' as const,
    title: 'Market Insights',
    description: 'Track market movements with comprehensive data'
  },
  {
    icon: 'neutral' as const,
    title: 'Smart Notifications',
    description: 'Stay informed with personalized alerts'
  }
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onGetStarted,
  showFeatures = true
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Animate content in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        delay: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, buttonScale]);

  const renderFeature = (feature: typeof FEATURES[0], index: number) => {
    const delay = index * 200 + 400;
    const featureFade = useRef(new Animated.Value(0)).current;
    const featureSlide = useRef(new Animated.Value(30)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(featureFade, {
          toValue: 1,
          duration: 600,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(featureSlide, {
          toValue: 0,
          duration: 600,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    return (
      <Animated.View 
        key={index}
        style={[
          styles.featureItem,
          {
            opacity: featureFade,
            transform: [{ translateY: featureSlide }],
          },
        ]}
      >
        <View style={styles.featureIcon}>
          <SentimentIcon type={feature.icon} size={24} />
        </View>
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureDescription}>{feature.description}</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View 
        style={[
          styles.logoSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Logo variant="icon" size="xlarge" style={styles.logoIcon} />
        <Logo variant="text" size="xlarge" />
      </Animated.View>

      <Animated.View 
        style={[
          styles.taglineContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <Text style={styles.tagline}>
          Your AI-Powered Gateway to
        </Text>
        <Text style={styles.taglineHighlight}>
          Smarter Market Decisions
        </Text>
      </Animated.View>

      {showFeatures && (
        <View style={styles.featuresContainer}>
          {FEATURES.map((feature, index) => renderFeature(feature, index))}
        </View>
      )}

      <Animated.View 
        style={[
          styles.buttonContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: buttonScale }],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.getStartedButton}
          onPress={onGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
        
        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service
        </Text>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 60,
    minHeight: screenHeight,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: screenHeight * 0.1,
    marginBottom: 40,
  },
  logoIcon: {
    marginBottom: 20,
  },
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  tagline: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  taglineHighlight: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  featuresContainer: {
    marginBottom: 60,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.normal,
  },
  buttonContainer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  getStartedButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 28,
    marginBottom: 20,
    width: '100%',
    maxWidth: 280,
  },
  buttonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: '#000000',
    textAlign: 'center',
  },
  termsText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default WelcomeScreen;
