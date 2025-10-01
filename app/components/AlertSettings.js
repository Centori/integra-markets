import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useAlertPreferences, { ALERT_FREQUENCIES } from '../hooks/useAlertPreferences';

const impactLevels = ['LOW', 'MEDIUM', 'HIGH'];

const AlertSettings = () => {
  const {
    preferences,
    setAlertFrequency,
    setMinimumImpact,
  } = useAlertPreferences();

  // Render frequency option
  const FrequencyOption = ({ label, value }) => (
    <TouchableOpacity
      style={[
        styles.optionButton,
        preferences.frequency === value && styles.selectedOption,
      ]}
      onPress={() => setAlertFrequency(value)}
    >
      <Text style={[
        styles.optionText,
        preferences.frequency === value && styles.selectedText,
      ]}>
        {label}
      </Text>
      {preferences.frequency === value && (
        <MaterialIcons name="check" size={20} color="#4ECCA3" />
      )}
    </TouchableOpacity>
  );

  // Render impact level option
  const ImpactOption = ({ level }) => (
    <TouchableOpacity
      style={[
        styles.optionButton,
        preferences.minImpact === level && styles.selectedOption,
      ]}
      onPress={() => setMinimumImpact(level)}
    >
      <Text style={[
        styles.optionText,
        preferences.minImpact === level && styles.selectedText,
      ]}>
        {level}
      </Text>
      {preferences.minImpact === level && (
        <MaterialIcons name="check" size={20} color="#4ECCA3" />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alert Frequency</Text>
        <Text style={styles.description}>
          Choose how often you want to receive alerts
        </Text>
        
        <View style={styles.optionsContainer}>
          <FrequencyOption 
            label="Real-time" 
            value={ALERT_FREQUENCIES.REALTIME} 
          />
          <FrequencyOption 
            label="Daily" 
            value={ALERT_FREQUENCIES.DAILY} 
          />
          <FrequencyOption 
            label="Weekly" 
            value={ALERT_FREQUENCIES.WEEKLY} 
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Minimum Impact Level</Text>
        <Text style={styles.description}>
          Only show alerts for news with at least this impact level
        </Text>
        
        <View style={styles.optionsContainer}>
          {impactLevels.map(level => (
            <ImpactOption key={level} level={level} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#A0A0A0',
    marginBottom: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    marginBottom: 16,
    minWidth: 100,
    justifyContent: 'center',
  },
  selectedOption: {
    backgroundColor: '#2C2C2C',
    borderColor: '#4ECCA3',
    borderWidth: 1,
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 8,
  },
  selectedText: {
    color: '#4ECCA3',
  },
});

export default AlertSettings;
