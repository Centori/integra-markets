import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { notificationTestSprite } from '../tests/notificationTestSprite';

// Color Palette
const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  bgTertiary: '#252525',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3',
  accentNegative: '#F05454',
  accentNeutral: '#EAB308',
  accentData: '#30A5FF',
  divider: '#333333',
  cardBorder: '#2A2A2A',
};

const DevTestScreen = ({ onBack }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [currentTest, setCurrentTest] = useState('');

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setCurrentTest('Initializing tests...');

    try {
      // Run the test suite
      await notificationTestSprite.runAllTests();
      
      // Get results
      setTestResults(notificationTestSprite.testResults);
      setCurrentTest('Tests completed!');
    } catch (error) {
      console.error('Test runner error:', error);
      setCurrentTest('Test suite failed');
    } finally {
      setIsRunning(false);
    }
  };

  const cleanup = async () => {
    setIsRunning(true);
    setCurrentTest('Cleaning up test data...');

    try {
      await notificationTestSprite.cleanup();
      setCurrentTest('Cleanup completed');
      setTestResults([]);
    } catch (error) {
      console.error('Cleanup error:', error);
      setCurrentTest('Cleanup failed');
    } finally {
      setIsRunning(false);
    }
  };

  const getResultIcon = (status) => {
    return status === 'PASSED' ? 'check-circle' : 'error';
  };

  const getResultColor = (status) => {
    return status === 'PASSED' ? colors.accentPositive : colors.accentNegative;
  };

  const calculateStats = () => {
    const passed = testResults.filter(r => r.status === 'PASSED').length;
    const failed = testResults.filter(r => r.status === 'FAILED').length;
    const total = testResults.length;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    return { passed, failed, total, successRate };
  };

  const stats = calculateStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TestSprite Runner</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <MaterialIcons name="science" size={32} color={colors.accentData} />
        <Text style={styles.infoTitle}>Notification Test Suite</Text>
        <Text style={styles.infoText}>
          Run automated tests for the notification system including push tokens, 
          real-time updates, offline mode, and more.
        </Text>
      </View>

      {/* Stats Section */}
      {testResults.length > 0 && (
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accentPositive }]}>
              {stats.passed}
            </Text>
            <Text style={styles.statLabel}>Passed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accentNegative }]}>
              {stats.failed}
            </Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accentData }]}>
              {stats.successRate}%
            </Text>
            <Text style={styles.statLabel}>Success</Text>
          </View>
        </View>
      )}

      {/* Current Status */}
      {currentTest && (
        <View style={styles.statusSection}>
          {isRunning && <ActivityIndicator size="small" color={colors.accentData} />}
          <Text style={styles.statusText}>{currentTest}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[styles.actionButton, styles.runButton]}
          onPress={runTests}
          disabled={isRunning}
        >
          <MaterialIcons name="play-arrow" size={20} color={colors.bgPrimary} />
          <Text style={styles.actionButtonText}>Run All Tests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.cleanupButton]}
          onPress={cleanup}
          disabled={isRunning}
        >
          <MaterialIcons name="cleaning-services" size={20} color={colors.textPrimary} />
          <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
            Clean Up
          </Text>
        </TouchableOpacity>
      </View>

      {/* Test Results */}
      <ScrollView style={styles.resultsSection} showsVerticalScrollIndicator={false}>
        {testResults.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <MaterialIcons
              name={getResultIcon(result.status)}
              size={24}
              color={getResultColor(result.status)}
            />
            <View style={styles.resultContent}>
              <Text style={styles.resultName}>{result.name}</Text>
              <Text style={styles.resultMessage}>{result.message}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Warning */}
      {__DEV__ && (
        <View style={styles.warningSection}>
          <MaterialIcons name="info" size={16} color={colors.accentNeutral} />
          <Text style={styles.warningText}>
            Development mode only. Tests create real notifications.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  backButton: {
    padding: 5,
  },
  headerSpacer: {
    width: 34,
  },
  infoSection: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 10,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.bgSecondary,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 10,
  },
  statusText: {
    fontSize: 14,
    color: colors.accentData,
    fontStyle: 'italic',
  },
  actionSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  runButton: {
    backgroundColor: colors.accentPositive,
  },
  cleanupButton: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.bgPrimary,
  },
  resultsSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bgSecondary,
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  resultMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSecondary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  warningText: {
    fontSize: 12,
    color: colors.accentNeutral,
  },
});

export default DevTestScreen;
