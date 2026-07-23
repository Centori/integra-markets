import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Kalshi brand green. This is a compact, brand-colored attribution mark for the
// divergence badge (mirrors PolymarketIcon's approach of a drawn mark rather
// than an embedded logo file). Drop an official PNG in assets/ and swap to
// <Image> if pixel-exact fidelity is required.
const KALSHI_GREEN = '#4DB391';

const KalshiIcon = ({ size = 28, rounded = true, style = undefined }) => {
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: rounded ? size / 2 : size * 0.16,
          backgroundColor: KALSHI_GREEN,
        },
        style,
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.6, lineHeight: size * 0.72 }]}>K</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#FFFFFF', fontWeight: '800' },
});

export default KalshiIcon;
