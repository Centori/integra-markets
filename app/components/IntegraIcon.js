import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const IntegraIcon = ({ size = 24, animated = false, variant = 'default', style }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animated) {
      const pulseSequence = Animated.sequence([
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
      ]);

      Animated.loop(pulseSequence).start();
    }
  }, [animated]);

  const getColors = () => {
    switch (variant) {
      case 'success':
        return { primary: '#4ECCA3', secondary: '#30A5FF' };
      case 'error':
        return { primary: '#F05454', secondary: '#FFD700' };
      case 'warning':
        return { primary: '#FFD700', secondary: '#F05454' };
      case 'default':
      default:
        return { primary: '#30A5FF', secondary: '#4ECCA3' };
    }
  };

  const colors = getColors();
  const containerSize = size;
  const innerCircleSize = size * 0.7;
  const dotSize = size * 0.15;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          transform: [{ scale: pulseAnim }],
        },
        style,
      ]}
    >
      <View
        style={[
          styles.outerCircle,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            borderColor: colors.primary,
          },
        ]}
      >
        <View
          style={[
            styles.innerCircle,
            {
              width: innerCircleSize,
              height: innerCircleSize,
              borderRadius: innerCircleSize / 2,
              backgroundColor: colors.secondary,
            },
          ]}
        />
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: colors.primary,
              top: containerSize * 0.2,
            },
          ]}
        />
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: colors.primary,
              bottom: containerSize * 0.2,
            },
          ]}
        />
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: colors.primary,
              left: containerSize * 0.2,
            },
          ]}
        />
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: colors.primary,
              right: containerSize * 0.2,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerCircle: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    position: 'absolute',
  },
  dot: {
    position: 'absolute',
  },
});

export default IntegraIcon;