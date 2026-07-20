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

const TermsOfServiceModal = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Terms of Service</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        
        {/* Mirrors www.integramarkets.app/settings/terms — keep the two in sync */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.text}>Last updated: April 2026</Text>

          <Text style={styles.sectionTitle}>1. Agreement to Terms</Text>
          <Text style={styles.text}>
            These Terms of Service constitute a legally binding agreement made between you,
            whether personally or on behalf of an entity ("you") and Integra Markets
            ("Company", "we", "us", or "our"), concerning your access to and use of the
            Integra Markets mobile application as well as any other form of media, media
            channel, mobile website, or mobile application related, linked, or otherwise
            connected thereto (collectively, the "Site").
          </Text>

          <Text style={styles.sectionTitle}>2. Financial Information Disclaimer</Text>
          <Text style={styles.text}>
            Integra Markets provides AI-powered financial analysis and market insights for
            informational purposes only. This information does not constitute financial
            advice, investment recommendations, or trading signals. You acknowledge that:{'\n\n'}
            • All market analysis is based on AI interpretation and may contain errors{'\n'}
            • Past performance does not guarantee future results{'\n'}
            • Trading and investment decisions carry inherent risks{'\n'}
            • You should consult with qualified financial advisors before making investment decisions{'\n'}
            • Integra Markets is not liable for any financial losses resulting from use of our services
          </Text>

          <Text style={styles.sectionTitle}>3. API Key Management (BYOK)</Text>
          <Text style={styles.text}>
            Our Bring Your Own Key (BYOK) model requires you to:{'\n\n'}
            • Maintain valid API keys with supported AI providers (OpenAI, Anthropic, Groq){'\n'}
            • Be responsible for all costs and usage associated with your API keys{'\n'}
            • Ensure your API keys comply with the respective provider's terms of service{'\n'}
            • Understand that we do not monitor or control your API usage{'\n'}
            • Accept that service interruptions may occur due to API key issues or provider downtime
          </Text>

          <Text style={styles.sectionTitle}>4. Prohibited Uses</Text>
          <Text style={styles.text}>
            You may not use our service:{'\n\n'}
            • For any unlawful purpose or to solicit others to unlawful acts{'\n'}
            • To violate any international, federal, provincial, or state regulations or laws{'\n'}
            • To impersonate or attempt to impersonate the Company, employees, or other users{'\n'}
            • To engage in any automated use of the system
          </Text>

          <Text style={styles.sectionTitle}>5. Privacy Policy</Text>
          <Text style={styles.text}>
            Your privacy is important to us. Please review our Privacy Policy, which also
            governs your use of the Site, to understand our practices.
          </Text>

          <Text style={styles.sectionTitle}>6. Contact Information</Text>
          <Text style={styles.text}>
            Questions about the Terms of Service should be sent to us at:{'\n\n'}
            Email: contact@integramarkets.app
          </Text>

          <Text style={styles.text}>
            By using Integra Markets, you acknowledge that you have read and agree to these
            Terms of Service.
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

export default TermsOfServiceModal;