// The "API access is managed on the web" callout that appears at the bottom
// of the Paywall screen.
//
// App Store compliance note: this component MUST NOT advertise pricing or
// look like a purchase CTA. Apple rejects screens that direct users to
// external checkout for digital subscriptions. "Manage on Web" language is
// safe because it's about account management, not purchase.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function ApiTierCallout() {
  const openWeb = () => {
    Linking.openURL('https://dashboard.integramarkets.app/api-tier').catch(() => {
      // Silent — no toast needed; TouchableOpacity feedback is enough
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Feather name="terminal" size={16} color="#A0A0A0" />
        <Text style={styles.header}>Building on Integra?</Text>
      </View>
      <Text style={styles.body}>
        Programmatic API access is managed on the web dashboard — signup, key rotation, usage metrics.
      </Text>
      <TouchableOpacity onPress={openWeb} style={styles.link}>
        <Text style={styles.linkLabel}>Manage on Web</Text>
        <Feather name="external-link" size={13} color="#4ECCA3" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 16,
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  header: {
    color: '#ECECEC',
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    color: '#A0A0A0',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkLabel: {
    color: '#4ECCA3',
    fontSize: 13,
    fontWeight: '500',
  },
});
