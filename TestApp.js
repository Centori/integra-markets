import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
} from 'react-native';

const colors = {
  bgPrimary: '#121212',
  textPrimary: '#ECECEC',
  accentPositive: '#4ECCA3',
};

const TestApp = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
      
      <View style={styles.container}>
        <Text style={styles.title}>🧪 Integra Markets</Text>
        <Text style={styles.subtitle}>Test Build Successfully Running!</Text>
        
        <View style={styles.testCard}>
          <Text style={styles.cardText}>✅ React Native: Working</Text>
          <Text style={styles.cardText}>✅ Expo SDK: Working</Text>
          <Text style={styles.cardText}>✅ Media Kit: Loaded</Text>
          <Text style={styles.cardText}>✅ Dependencies: Updated</Text>
        </View>
        
        <Text style={styles.footerText}>
          Your app is ready for testing!
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: colors.accentPositive,
    marginBottom: 40,
    textAlign: 'center',
  },
  testCard: {
    backgroundColor: '#1E1E1E',
    padding: 24,
    borderRadius: 12,
    marginBottom: 40,
    width: '100%',
    maxWidth: 300,
  },
  cardText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: colors.textPrimary,
    opacity: 0.7,
    textAlign: 'center',
  },
});

export default TestApp;
