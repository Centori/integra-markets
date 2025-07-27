import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

interface SentimentBarProps {
  bullish: number;
  bearish: number;
  neutral: number;
  height?: number;
  showLabels?: boolean;
  showPercentages?: boolean;
  compact?: boolean;
}

interface ProgressRowProps {
  label: string;
  percent: number;
  color: string;
  showPercentage: boolean;
}

const ProgressRow: React.FC<ProgressRowProps> = ({ label, percent, color, showPercentage }) => (
  <View style={styles.progressRow}>
    <Text style={styles.progressLabel}>{label}</Text>
    <View style={styles.progressContainer}>
      <View style={styles.progressBackground}>
        <View 
          style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]} 
        />
      </View>
      {showPercentage && (
        <Text style={[styles.progressPercent, { color }]}>
          {percent}%
        </Text>
      )}
    </View>
  </View>
);

export const SentimentBar: React.FC<SentimentBarProps> = ({ 
  bullish, 
  bearish, 
  neutral,
  height = 6,
  showLabels = true,
  showPercentages = true,
  compact = false
}) => {
  // Normalize values to ensure they sum to 100
  const total = bullish + bearish + neutral;
  const bullishPercent = Math.round((bullish / total) * 100);
  const bearishPercent = Math.round((bearish / total) * 100);
  const neutralPercent = 100 - bullishPercent - bearishPercent;

  if (compact) {
    return (
      <View style={[styles.compactBar, { height }]}>
        <View 
          style={[
            styles.compactSegment, 
            { 
              width: `${bullishPercent}%`, 
              backgroundColor: Colors.bullish 
            }
          ]} 
        />
        <View 
          style={[
            styles.compactSegment, 
            { 
              width: `${bearishPercent}%`, 
              backgroundColor: Colors.bearish 
            }
          ]} 
        />
        <View 
          style={[
            styles.compactSegment, 
            { 
              width: `${neutralPercent}%`, 
              backgroundColor: Colors.neutral 
            }
          ]} 
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ProgressRow 
        label='Bullish' 
        percent={bullish} 
        color={Colors.bullish}
        showPercentage={showPercentages}
      />
      <ProgressRow 
        label='Bearish' 
        percent={bearish} 
        color={Colors.bearish}
        showPercentage={showPercentages}
      />
      <ProgressRow 
        label='Neutral' 
        percent={neutral} 
        color={Colors.neutral}
        showPercentage={showPercentages}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    minWidth: 60,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 8,
  },
  progressBackground: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.progressBackground,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    minWidth: 35,
    textAlign: 'right',
  },
  compactBar: {
    flexDirection: 'row',
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: Colors.progressBackground,
  },
  compactSegment: {
    height: '100%',
  },
});

export default SentimentBar;
