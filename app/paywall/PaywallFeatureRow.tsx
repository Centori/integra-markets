// One line item on a tier card: "✓ Real-time divergence alerts" or "— Basic
// only". Kept dumb — just presentation.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

type Props = {
  label: string;
  included: boolean;
};

export default function PaywallFeatureRow({ label, included }: Props) {
  return (
    <View style={styles.row}>
      <Feather
        name={included ? 'check' : 'minus'}
        size={16}
        color={included ? '#4ECCA3' : '#666666'}
      />
      <Text style={[styles.label, !included && styles.labelMuted]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  label: {
    color: '#ECECEC',
    fontSize: 14,
  },
  labelMuted: {
    color: '#666666',
  },
});
