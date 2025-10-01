import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
} from 'react-native';

const BreakingNewsIndicator = () => {
  // Animation value for pulsing effect
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Create pulsing animation
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);
    
    // Run animation in loop
    Animated.loop(pulse).start();
    
    return () => pulseAnim.stopAnimation();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.indicator,
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <Text style={styles.text}>BREAKING</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
  },
  indicator: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  }
});

export default BreakingNewsIndicator;
