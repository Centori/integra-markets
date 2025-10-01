import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3',
  cardBorder: '#2A2A2A',
};

const OnboardingForm = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = () => {
    if (name.trim() && email.trim()) {
      onComplete({ name: name.trim(), email: email.trim() });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Integra</Text>
        <Text style={styles.subtitle}>Let's get you set up</Text>
        
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Your Name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TouchableOpacity
            style={[styles.button, (!name.trim() || !email.trim()) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!name.trim() || !email.trim()}
          >
            <Text style={styles.buttonText}>Get Started</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    gap: 20,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.accentPositive,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.bgPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OnboardingForm;