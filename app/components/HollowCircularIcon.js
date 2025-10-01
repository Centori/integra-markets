import React from 'react';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const HollowCircularIcon = ({ name, size, color, padding = 8 }) => {
  const iconSize = size || 24;
  const containerSize = iconSize + (padding * 2);

  return (
    <View
      style={{
        width: containerSize,
        height: containerSize,
        borderRadius: containerSize / 2,
        borderWidth: 2,
        borderColor: color,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <MaterialIcons name={name} size={iconSize} color={color} />
    </View>
  );
};

export default HollowCircularIcon;