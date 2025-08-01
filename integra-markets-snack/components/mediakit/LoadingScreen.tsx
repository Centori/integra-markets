import React, { useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  ActivityIndicator,
  Text,
  Dimensions 
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import Logo from './Logo';

interface LoadingScreenProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading market data...',
  showProgress = false,
  progress = 0
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial fade in and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, scaleAnim, pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { scale: pulseAnim }
            ],
          },
        ]}
      >
        <Logo variant="icon" size="xlarge" />
      </Animated.View>

      <Animated.View 
        style={[
          styles.textContainer,
          { opacity: fadeAnim }
        ]}
      >
        <Logo variant="text" size="large" />
      </Animated.View>

      <View style={styles.loadingContainer}>
        {showProgress ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${progress}%`,
                    opacity: fadeAnim 
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        ) : (
          <ActivityIndicator 
            size="large" 
            color={Colors.accent} 
            style={styles.activityIndicator}
          />
        )}
        
        <Animated.Text 
          style={[
            styles.message,
            { opacity: fadeAnim }
          ]}
        >
          {message}
        </Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  textContainer: {
    marginBottom: 60,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  activityIndicator: {
    marginBottom: 20,
  },
  progressContainer: {
    width: screenWidth * 0.7,
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  progressText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: Typography.fontWeight.medium,
  },
  message: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default LoadingScreen;
