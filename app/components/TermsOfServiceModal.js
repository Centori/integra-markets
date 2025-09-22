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
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Acceptance of Terms</Text>
          <Text style={styles.text}>
            By accessing and using Integra, you accept and agree to be bound by the terms 
            and provision of this agreement.
          </Text>
          
          <Text style={styles.sectionTitle}>Use License</Text>
          <Text style={styles.text}>
            Permission is granted to temporarily use Integra for personal, non-commercial 
            transitory viewing only. This is the grant of a license, not a transfer of title.
          </Text>
          
          <Text style={styles.sectionTitle}>Disclaimer</Text>
          <Text style={styles.text}>
            The materials on Integra are provided on an 'as is' basis. Integra makes no warranties, 
            expressed or implied, and hereby disclaims and negates all other warranties including 
            without limitation, implied warranties or conditions of merchantability, fitness for a 
            particular purpose, or non-infringement of intellectual property or other violation of rights.
          </Text>
          
          <Text style={styles.sectionTitle}>Limitations</Text>
          <Text style={styles.text}>
            In no event shall Integra or its suppliers be liable for any damages (including, without 
            limitation, damages for loss of data or profit, or due to business interruption) arising 
            out of the use or inability to use Integra, even if Integra or an authorized representative 
            has been notified orally or in writing of the possibility of such damage.
          </Text>
          
          <Text style={styles.sectionTitle}>Accuracy of Materials</Text>
          <Text style={styles.text}>
            The materials appearing on Integra could include technical, typographical, or photographic 
            errors. Integra does not warrant that any of the materials on its service are accurate, 
            complete, or current.
          </Text>
          
          <Text style={styles.sectionTitle}>Modifications</Text>
          <Text style={styles.text}>
            Integra may revise these terms of service at any time without notice. By using this 
            service, you are agreeing to be bound by the then current version of these terms of service.
          </Text>
          
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.text}>
            If you have any questions about these Terms of Service, please contact us at legal@integra.app
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

export default TermsOfServiceModal;