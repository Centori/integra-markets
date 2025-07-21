import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3',
  accentData: '#30A5FF',
  divider: '#333333',
  cardBorder: '#333333',
};

const TermsOfService = ({ onBack }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last updated: {new Date().toDateString()}</Text>
        <Text style={styles.sectionTitle}>1. Agreement to Terms</Text>
        <Text style={styles.sectionContent}>
          These Terms of Service constitute a legally binding agreement made between you,
          whether personally or on behalf of an entity ("you") and Integra Markets ("Company",
          "we", "us", or "our"), concerning your access to and use of the Integra Markets mobile
          application as well as any other form of media, media channel, mobile website, or
          mobile application related, linked, or otherwise connected thereto (collectively, the
          "Site"). You agree that by accessing the Site, you have read, understood, and agreed
          to be bound by all of these Terms of Service.
        </Text>
        <Text style={styles.sectionTitle}>2. Intellectual Property Rights</Text>
        <Text style={styles.sectionContent}>
          Unless otherwise indicated, the Site is our proprietary property and all source code,
          databases, functionality, software, website designs, audio, video, text, photographs,
          and graphics on the Site (collectively, the "Content") and the trademarks, service
          marks, and logos contained therein (the "Marks") are owned or controlled by us or
          licensed to us, and are protected by copyright and trademark laws and various other
          intellectual property rights and unfair competition laws of the United States,
          international copyright laws, and international conventions.
        </Text>
        <Text style={styles.sectionTitle}>3. User Representations</Text>
        <Text style={styles.sectionContent}>
          By using the Site, you represent and warrant that: (1) you have the legal capacity
          and you agree to comply with these Terms of Service; (2) you are not a minor in the
          jurisdiction in which you reside, or if a minor, you have received parental permission
          to use the Site; (3) you will not access the Site through automated or non-human means,
          whether through a bot, script, or otherwise; (4) you will not use the Site for any
          illegal or unauthorized purpose; and (5) your use of the Site will not violate any
          applicable law or regulation.
        </Text>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionContent: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
});

export default TermsOfService;

