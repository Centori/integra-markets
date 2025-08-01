import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { SentimentIcon } from './Icon';

export type SentimentType = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

interface SentimentTagProps {
  sentiment: SentimentType;
  score: number;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const SentimentTag: React.FC<SentimentTagProps> = ({ 
  sentiment, 
  score, 
  showIcon = true,
  size = 'medium'
}) => {
  const getSentimentColor = () => {
    switch (sentiment) {
      case 'BULLISH':
        return Colors.bullish;
      case 'BEARISH':
        return Colors.bearish;
      case 'NEUTRAL':
        return Colors.neutral;
      default:
        return Colors.neutral;
    }
  };

  const getSentimentIconType = () => {
    switch (sentiment) {
      case 'BULLISH':
        return 'bullish' as const;
      case 'BEARISH':
        return 'bearish' as const;
      case 'NEUTRAL':
        return 'neutral' as const;
      default:
        return 'neutral' as const;
    }
  };

  const getStyles = () => {
    const baseStyles = styles[size];
    return {
      ...baseStyles,
      color: getSentimentColor()
    };
  };

  return (
    <View style={styles.container}>
      {showIcon && (
        <SentimentIcon 
          type={getSentimentIconType()} 
          size={size === 'small' ? 12 : size === 'large' ? 18 : 16}
          color={getSentimentColor()}
        />
      )}
      <Text style={getStyles()}>
        {sentiment} {score.toFixed(2)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  small: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.lineHeight.tight,
  },
  medium: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.lineHeight.tight,
  },
  large: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.lineHeight.normal,
  },
});

export default SentimentTag;
