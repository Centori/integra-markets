import React from 'react';
import { Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { ActionIcon } from './Icon';

interface SourceTagProps {
  name: string;
  url?: string;
  showIcon?: boolean;
  onPress?: () => void;
}

export const SourceTag: React.FC<SourceTagProps> = ({ 
  name, 
  url, 
  showIcon = true,
  onPress 
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (url) {
      Linking.openURL(url);
    }
  };

  const isInteractive = Boolean(url || onPress);

  if (!isInteractive) {
    return (
      <Text style={styles.sourceText}>
        {name}
      </Text>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.sourceLink}>
        {name}
      </Text>
      {showIcon && (
        <ActionIcon 
          type='external' 
          size={12} 
          color={Colors.accent}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  sourceLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.accent,
  },
});

export default SourceTag;
