import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

// Error boundary component for React Native
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong</Text>
          <Text style={styles.errorDetails}>
            {this.state.error?.toString() || 'Unknown error'}
          </Text>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

// Safe app wrapper that handles crashes gracefully
export default function SafeAppWrapper() {
  try {
    // Try to load the main App
    const App = require('./app/App').default;
    
    return (
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Failed to load App:', error);
    
    // Return a minimal UI if App fails to load
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load app</Text>
        <Text style={styles.errorDetails}>{error.toString()}</Text>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
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
