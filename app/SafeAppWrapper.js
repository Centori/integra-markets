import React from 'react';
import { Text, StyleSheet, SafeAreaView } from 'react-native';

// Simple safe app wrapper without hooks or context dependencies
function SafeAppWrapper() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Integra Markets</Text>
      <Text style={styles.subtitle}>AI-powered commodity trading insights</Text>
    </SafeAreaView>
  );
}

export default SafeAppWrapper;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#ECECEC',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#A0A0A0',
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ECECEC',
    fontSize: 18,
    marginBottom: 10,
  },
  errorDetails: {
    color: '#A0A0A0',
    fontSize: 14,
    textAlign: 'center',
  },
});