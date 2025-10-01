import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import { Colors } from '../../constants/colors';

export type NotificationIconVariant = 'default' | 'simplified' | 'android' | 'badge';
export type NotificationIconSize = 'small' | 'medium' | 'large' | number;

interface NotificationIconProps {
  variant?: NotificationIconVariant;
  size?: NotificationIconSize;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

const SIZE_MAP = {
  small: 24,
  medium: 48,
  large: 96,
};

/**
 * Simplified notification icon based on Integra's brand identity
 * Features a minimalist "i" design for better visibility at small sizes
 */
export const NotificationIcon: React.FC<NotificationIconProps> = ({
  variant = 'default',
  size = 'medium',
  color = Colors.accent,
  backgroundColor = 'transparent',
  style,
}) => {
  const iconSize = typeof size === 'number' ? size : SIZE_MAP[size];
  const strokeWidth = Math.max(1, iconSize * 0.06);
  
  // Android notification icons must be white/transparent for status bar
  const iconColor = variant === 'android' ? '#FFFFFF' : color;
  const bgColor = variant === 'android' ? 'transparent' : backgroundColor;
  
  const renderDefaultIcon = () => (
    <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100">
      {/* Background */}
      {bgColor !== 'transparent' && (
        <Rect width="100" height="100" fill={bgColor} rx="10" />
      )}
      
      {/* Outer square border */}
      <Rect
        x="20"
        y="20"
        width="60"
        height="60"
        fill="none"
        stroke={iconColor}
        strokeWidth={strokeWidth}
        rx="8"
      />
      
      {/* "i" symbol - dot and line */}
      <Circle cx="50" cy="35" r="4" fill={iconColor} />
      <Rect x="46" y="45" width="8" height="25" fill={iconColor} rx="2" />
    </Svg>
  );
  
  const renderSimplifiedIcon = () => (
    <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100">
      {bgColor !== 'transparent' && (
        <Rect width="100" height="100" fill={bgColor} rx="10" />
      )}
      
      {/* Simplified "i" without border for better small size visibility */}
      <Circle cx="50" cy="30" r="6" fill={iconColor} />
      <Rect x="44" y="42" width="12" height="38" fill={iconColor} rx="3" />
    </Svg>
  );
  
  const renderAndroidIcon = () => (
    <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100">
      {/* Android status bar icons must be pure white silhouettes */}
      <Circle cx="50" cy="28" r="8" fill="#FFFFFF" />
      <Rect x="42" y="44" width="16" height="42" fill="#FFFFFF" rx="4" />
    </Svg>
  );
  
  const renderBadgeIcon = () => (
    <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="45" fill={iconColor} />
      <Circle cx="50" cy="30" r="6" fill="#000000" />
      <Rect x="44" y="42" width="12" height="35" fill="#000000" rx="3" />
    </Svg>
  );
  
  let content;
  switch (variant) {
    case 'simplified':
      content = renderSimplifiedIcon();
      break;
    case 'android':
      content = renderAndroidIcon();
      break;
    case 'badge':
      content = renderBadgeIcon();
      break;
    default:
      content = renderDefaultIcon();
  }
  
  return (
    <View style={[styles.container, style]}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NotificationIcon;
