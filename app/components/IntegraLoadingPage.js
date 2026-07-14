import React from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';

const colors = {
  bgPrimary: '#121212',
  textPrimary: '#ECECEC',
  accentPositive: '#4ECCA3',
};

// Matches the original (build 64 era) launch look: the "i" mark with the
// "Integra Markets" wordmark beneath it, on the dark background.
const IntegraLoadingPage = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.wordmark}>Integra Markets</Text>
      <ActivityIndicator size="small" color={colors.accentPositive} style={styles.spinner} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 22,
  },
  wordmark: {
    color: colors.textPrimary,
    fontSize: 20,
    marginTop: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  spinner: {
    marginTop: 18,
  },
});

export default IntegraLoadingPage;
