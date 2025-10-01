import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../services/authService';

const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3',
  accentPositiveBg: 'rgba(78, 204, 163, 0.1)',
  cardBorder: '#333333',
};

type PasswordResetScreenProps = {
  onBack: () => void;
  onSuccess?: () => void;
};

export default function PasswordResetScreen({ onBack, onSuccess }: PasswordResetScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { success, error } = await authService.sendPasswordResetEmail(email.trim());
      
      if (success) {
        setSent(true);
        Alert.alert(
          'Check Your Email',
          'We\'ve sent you a password reset link. Please check your email.',
          [{ text: 'OK', onPress: onSuccess }]
        );
      } else {
        Alert.alert('Error', error || 'Failed to send reset email');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Forgot your password?</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you a link to reset your password.
        </Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <MaterialIcons
              name="email"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading && !sent}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (loading || sent) && styles.buttonDisabled,
            ]}
            onPress={handleSendResetEmail}
            disabled={loading || sent}
          >
            {loading ? (
              <ActivityIndicator color={colors.bgPrimary} />
            ) : (
              <Text style={styles.buttonText}>
                {sent ? 'Email Sent' : 'Send Reset Link'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: colors.textPrimary,
    fontSize: 16,
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