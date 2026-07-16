import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3',
  divider: '#333333',
};

const PrivacyPolicyModal = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Privacy Policy</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        
        {/* Mirrors www.integramarkets.app/settings/privacy — keep the two in sync */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.text}>Last updated: April 2026</Text>

          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.text}>
            Integra Markets ("we", "our", or "us") is committed to protecting your privacy while
            providing advanced AI-powered financial market analysis. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your information when you use our mobile
            application and related services, including our Bring Your Own Key (BYOK) AI
            integration features.
          </Text>

          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          <Text style={styles.text}>
            We collect different types of information to provide and improve our services:{'\n\n'}
            • Account Information: Email address, preferences, and settings{'\n'}
            • Usage Data: App interactions, feature usage patterns, and session data{'\n'}
            • Device Information: Device type, operating system, app version, and unique identifiers{'\n'}
            • Financial Data Queries: Market analysis requests and trading-related questions (anonymized){'\n'}
            • Third-Party API Keys: Encrypted storage of your AI service API keys (OpenAI, Anthropic, Groq)
          </Text>

          <Text style={styles.sectionTitle}>3. Bring Your Own Key (BYOK) Model</Text>
          <Text style={styles.text}>
            Our BYOK approach ensures:{'\n\n'}
            • Your API keys are encrypted and stored locally on your device{'\n'}
            • Direct communication between your device and your chosen AI provider{'\n'}
            • We never access, store, or transmit your API keys to our servers{'\n'}
            • You maintain full control over your AI service costs and usage{'\n'}
            • Your API provider's privacy policy governs the handling of your queries
          </Text>

          <Text style={styles.sectionTitle}>4. Data Security & Protection</Text>
          <Text style={styles.text}>
            We implement robust security measures:{'\n\n'}
            • End-to-end encryption for sensitive data transmission{'\n'}
            • Secure local storage for API keys using device keychain services{'\n'}
            • Regular security audits and updates{'\n'}
            • No storage of personal financial decisions or trading strategies{'\n'}
            • Compliance with financial data protection standards
          </Text>

          <Text style={styles.sectionTitle}>5. Your Privacy Rights</Text>
          <Text style={styles.text}>
            You have comprehensive control over your data:{'\n\n'}
            • Access and review your stored information{'\n'}
            • Correct or update your account details{'\n'}
            • Delete your account and associated data{'\n'}
            • Revoke API key permissions at any time{'\n'}
            • Opt-out of anonymized usage analytics{'\n'}
            • Request data portability in standard formats
          </Text>

          <Text style={styles.sectionTitle}>6. Contact Information</Text>
          <Text style={styles.text}>
            For privacy-related questions or concerns:{'\n\n'}
            Email: contact@integramarkets.app{'\n'}
            Response time: We aim to respond within 72 hours
          </Text>

          <Text style={styles.text}>
            By using Integra Markets, you acknowledge that you have read and understand this
            Privacy Policy.
          </Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Last updated: April 2026</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  footer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default PrivacyPolicyModal;