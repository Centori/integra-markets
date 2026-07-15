import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Hollow Circular Icon Component
// Creates a clean, minimalist hollow circular icon with flat design
const HollowCircularIcon = ({ 
  name, 
  size = 24, 
  color = '#4ECCA3', 
  borderWidth = 2, 
  padding = 8 
}) => {
  const circleSize = size + (padding * 2);
  const iconSize = size * 0.6; // Icon is 60% of the circle size for better proportion
  
  return (
    <View style={[
      styles.circleContainer,
      {
        width: circleSize,
        height: circleSize,
        borderRadius: circleSize / 2,
        borderColor: color,
        borderWidth: borderWidth,
      }
    ]}>
      <MaterialIcons 
        name={name} 
        size={iconSize} 
        color={color} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  circleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});

export default HollowCircularIcon;