// TestApp.js - Minimal version to test for crashes
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Simple color palette
const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3',
};

const TestApp = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simple initialization
    const initApp = async () => {
      try {
        console.log('Initializing test app...');
        
        // Simulate loading
        setTimeout(() => {
          setIsLoading(false);
          setCurrentScreen('main');
          console.log('Test app initialized successfully');
        }, 2000);
        
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={48} color={colors.accentPositive} />
          <Text style={styles.errorTitle}>Error Detected</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setIsLoading(true);
              setCurrentScreen('loading');
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="analytics" size={60} color={colors.accentPositive} />
          </View>
          <Text style={styles.loadingTitle}>Testing Integra</Text>
          <Text style={styles.loadingSubtitle}>Checking for crashes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.mainContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Test App Running</Text>
          <MaterialIcons name="check-circle" size={24} color={colors.accentPositive} />
        </View>
        
        <View style={styles.content}>
          <Text style={styles.successTitle}>🎉 No Crashes Detected!</Text>
          <Text style={styles.successText}>
            The basic app structure is working properly. This means the crash is likely in one of the more complex components.
          </Text>
          
          <TouchableOpacity 
            style={styles.testButton}
            onPress={() => Alert.alert('Test', 'Alert system working!')}
          >
            <Text style={styles.testButtonText}>Test Alert</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.testButton}
            onPress={() => console.log('Console logging working!')}
          >
            <Text style={styles.testButtonText}>Test Console</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(78, 204, 163, 0.1)',
    borderRadius: 50,
  },
  loadingTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingSubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  mainContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgSecondary,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  successText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  testButton: {
    backgroundColor: colors.accentPositive,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginBottom: 15,
  },
  testButtonText: {
    color: colors.bgPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: colors.accentPositive,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  retryButtonText: {
    color: colors.bgPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TestApp;
