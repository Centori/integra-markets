import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

const colors = {
  bgPrimary: '#121212',
  textPrimary: '#ECECEC',
  accentPositive: '#4ECCA3',
};

const IntegraLoadingPage = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accentPositive} />
      <Text style={styles.text}>Loading Integra...</Text>
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
  text: {
    color: colors.textPrimary,
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
});

export default IntegraLoadingPage;