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
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.text}>
            We collect information you provide directly to us, such as when you create an account, 
            set up alerts, or contact us for support.
          </Text>
          
          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          <Text style={styles.text}>
            We use the information we collect to provide, maintain, and improve our services, 
            send you relevant market alerts, and communicate with you about our services.
          </Text>
          
          <Text style={styles.sectionTitle}>Information Sharing</Text>
          <Text style={styles.text}>
            We do not sell, trade, or otherwise transfer your personal information to third parties 
            without your consent, except as described in this policy.
          </Text>
          
          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.text}>
            We implement appropriate security measures to protect your personal information against 
            unauthorized access, alteration, disclosure, or destruction.
          </Text>
          
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.text}>
            If you have any questions about this Privacy Policy, please contact us at privacy@integra.app
          </Text>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Last updated: December 2024</Text>
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