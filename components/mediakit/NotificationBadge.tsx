import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle, Image } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import badgeConfig from '../../assets/badges/badge-config.json';

export type BadgeVariant = 'default' | 'sentiment' | 'alert' | 'success';
export type BadgeSize = 'small' | 'medium' | 'large';

interface NotificationBadgeProps {
  count?: number;
  showDot?: boolean;
  variant?: BadgeVariant;
  size?: BadgeSize;
  animate?: boolean;
  style?: ViewStyle;
}

const BADGE_COLORS = {
  default: badgeConfig.brandColors.accent,
  sentiment: badgeConfig.brandColors.bullish,
  alert: badgeConfig.brandColors.bearish,
  success: badgeConfig.brandColors.bullish,
};

const BADGE_SIZES = {
  small: {
    minWidth: 16,
    height: 16,
    fontSize: 10,
    dotSize: 8,
  },
  medium: {
    minWidth: 20,
    height: 20,
    fontSize: 12,
    dotSize: 10,
  },
  large: {
    minWidth: 24,
    height: 24,
    fontSize: 14,
    dotSize: 12,
  },
};

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  showDot = false,
  variant = 'default',
  size = 'medium',
  animate = true,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animate && (count || showDot)) {
      // Initial pop animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Continuous pulse for dots
      if (showDot) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
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
      }
    } else {
      scaleAnim.setValue(1);
    }
  }, [count, showDot, animate]);

  const badgeSize = BADGE_SIZES[size];
  const badgeColor = BADGE_COLORS[variant];

  // Don't render if no count and not showing dot
  if (!count && !showDot) {
    return null;
  }

  // Render dot variant
  if (showDot && !count) {
    return (
      <Animated.View
        style={[
          styles.dot,
          {
            width: badgeSize.dotSize,
            height: badgeSize.dotSize,
            backgroundColor: badgeColor,
            transform: [
              { scale: animate ? scaleAnim : 1 },
              { scale: animate ? pulseAnim : 1 },
            ],
          },
          style,
        ]}
      />
    );
  }

  // Format count display
  const displayCount = count && count > 99 ? '99+' : count?.toString();

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          minWidth: badgeSize.minWidth,
          height: badgeSize.height,
          backgroundColor: badgeColor,
          paddingHorizontal: size === 'small' ? 4 : 6,
          transform: [{ scale: animate ? scaleAnim : 1 }],
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            fontSize: badgeSize.fontSize,
          },
        ]}
      >
        {displayCount}
      </Text>
    </Animated.View>
  );
};

// Wrapper component for applying badge to other elements
interface BadgeWrapperProps {
  children: React.ReactNode;
  badge?: NotificationBadgeProps;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const BadgeWrapper: React.FC<BadgeWrapperProps> = ({
  children,
  badge,
  position = 'top-right',
}) => {
  if (!badge) {
    return <>{children}</>;
  }

  const getPositionStyle = () => {
    switch (position) {
      case 'top-right':
        return { top: -4, right: -4 };
      case 'top-left':
        return { top: -4, left: -4 };
      case 'bottom-right':
        return { bottom: -4, right: -4 };
      case 'bottom-left':
        return { bottom: -4, left: -4 };
    }
  };

  return (
    <View style={styles.wrapper}>
      {children}
      <View style={[styles.badgePosition, getPositionStyle()]}>
        <NotificationBadge {...badge} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#000000',
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  dot: {
    borderRadius: 50,
  },
  wrapper: {
    position: 'relative',
  },
  badgePosition: {
    position: 'absolute',
  },
});

export default NotificationBadge;
