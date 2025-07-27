import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

interface ChipProps {
  label: string;
  value?: string | number;
  onPress?: () => void;
  variant?: 'default' | 'sentiment' | 'keyword';
  size?: 'small' | 'medium' | 'large';
  selected?: boolean;
}

export const Chip: React.FC<ChipProps> = ({ 
  label, 
  value,
  onPress,
  variant = 'default',
  size = 'medium',
  selected = false
}) => {
  const isInteractive = Boolean(onPress);
  
  const getChipStyles = () => {
    const baseStyle = {
      ...styles[size],
      backgroundColor: selected ? Colors.accent : Colors.chipBackground,
    };

    const textStyle = {
      ...styles.chipText,
      color: selected ? '#000000' : Colors.chipText,
      fontSize: styles[size].fontSize,
    };

    return { container: baseStyle, text: textStyle };
  };

  const chipStyles = getChipStyles();
  const displayText = value !== undefined ? `${label} (${value})` : label;

  if (isInteractive) {
    return (
      <TouchableOpacity 
        style={chipStyles.container}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={chipStyles.text}>
          {displayText}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={chipStyles.container}>
      <Text style={chipStyles.text}>
        {displayText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chipText: {
    fontWeight: Typography.fontWeight.medium,
  },
  small: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    fontSize: Typography.fontSize.xs,
    margin: 2,
    alignSelf: 'flex-start' as const,
  },
  medium: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    fontSize: Typography.fontSize.sm,
    margin: 4,
    alignSelf: 'flex-start' as const,
  },
  large: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    fontSize: Typography.fontSize.base,
    margin: 6,
    alignSelf: 'flex-start' as const,
  },
});

export default Chip;
