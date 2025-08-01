import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface ImpactBadgeProps {
  level: ImpactLevel;
  size?: 'small' | 'medium' | 'large';
  showConfidence?: boolean;
  confidence?: number;
}

export const ImpactBadge: React.FC<ImpactBadgeProps> = ({ 
  level, 
  size = 'medium',
  showConfidence = false,
  confidence
}) => {
  const getImpactColor = () => {
    switch (level) {
      case 'LOW':
        return Colors.impact.low;
      case 'MEDIUM':
        return Colors.impact.medium;
      case 'HIGH':
        return Colors.impact.high;
      default:
        return Colors.impact.medium;
    }
  };

  const getContainerStyle = () => {
    const sizeKey = `${size}Container` as const;
    return [
      styles[sizeKey],
      { backgroundColor: getImpactColor() }
    ];
  };

  const getTextStyle = () => {
    const sizeKey = `${size}Text` as const;
    return [
      styles[sizeKey],
      { color: level === 'MEDIUM' ? Colors.text : '#000000' }
    ];
  };

  return (
    <View style={styles.wrapper}>
      <View style={getContainerStyle()}>
        <Text style={getTextStyle()}>
          {level}
        </Text>
      </View>
      {showConfidence && confidence !== undefined && (
        <Text style={styles.confidence}>
          Confidence: {confidence.toFixed(1)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-start',
    gap: 4,
  },
  confidence: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  smallContainer: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  smallText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  mediumContainer: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  mediumText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  largeContainer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  largeText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default ImpactBadge;
