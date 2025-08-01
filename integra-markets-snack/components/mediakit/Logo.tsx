import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

export type LogoVariant = 'full' | 'icon' | 'text';
export type LogoSize = 'small' | 'medium' | 'large' | 'xlarge';

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  color?: string;
  accentColor?: string; // For icon accent color
  style?: ViewStyle;
}

const LOGO_DIMENSIONS = {
  small: { width: 80, height: 24, iconSize: 24 },
  medium: { width: 120, height: 36, iconSize: 36 },
  large: { width: 160, height: 48, iconSize: 48 },
  xlarge: { width: 200, height: 60, iconSize: 60 },
};

// Logo assets
const LOGO_ASSETS = {
  icon: require('../../assets/icon.png'),
  full: require('../../assets/images/integra-logo-hq.png'),
  adaptive: require('../../assets/adaptive-icon.png'),
};

export const Logo: React.FC<LogoProps> = ({ 
  variant = 'full',
  size = 'medium',
  color = Colors.text,
  accentColor,
  style
}) => {
  const dimensions = LOGO_DIMENSIONS[size];
  
  const renderIcon = () => {
    return (
      <Image
        source={LOGO_ASSETS.icon}
        style={[
          styles.iconImage,
          { 
            width: dimensions.iconSize, 
            height: dimensions.iconSize,
          }
        ]}
        resizeMode="contain"
      />
    );
  };

  const renderText = () => {
    const fontSize = size === 'small' ? 16 : 
                    size === 'medium' ? 20 : 
                    size === 'large' ? 24 : 28;
    
    return (
      <View style={styles.textContainer}>
        <Text style={[
          styles.logoText,
          { fontSize, color }
        ]}>
          Integra
        </Text>
        <Text style={[
          styles.logoSubtext,
          { fontSize: fontSize * 0.8, color: accentColor || Colors.accent }
        ]}>
          Markets
        </Text>
      </View>
    );
  };

  if (variant === 'icon') {
    return (
      <View style={[styles.container, style]}>
        {renderIcon()}
      </View>
    );
  }

  if (variant === 'text') {
    return (
      <View style={[styles.container, style]}>
        {renderText()}
      </View>
    );
  }

  // Full variant
  return (
    <View style={[styles.container, styles.fullContainer, style]}>
      {renderIcon()}
      {renderText()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    borderRadius: 8,
  },
  iconText: {
    fontWeight: Typography.fontWeight.bold,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  logoText: {
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: -0.5,
  },
  logoSubtext: {
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: -0.3,
  },
});

export default Logo;
