// Tier picker screen. Presented full-screen when a user hits the paywall
// (either explicitly via Settings → Subscribe, or implicitly from an
// UpgradePrompt "See plans" tap).
//
// Reads the current offering from RevenueCat + falls back to hardcoded
// pricing if the SDK isn't available (dev/OTA-only builds).

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import PaywallFeatureRow from './PaywallFeatureRow';
import ApiTierCallout from './ApiTierCallout';
import { useEntitlement } from '../hooks/useEntitlement';
import {
  fetchCurrentOffering,
  purchasePackage,
  restorePurchases,
} from '../services/subscriptionService';
import type { Tier } from '../services/entitlementGate';

type Props = {
  visible?: boolean;
  onClose: () => void;
  // Optional — when the paywall is shown because a specific feature was
  // gated, we highlight the tier that unlocks it.
  highlightTier?: Tier;
};

type TierSpec = {
  key: Tier;
  displayName: string;
  price: string;
  tagline: string;
  features: { label: string; included: boolean }[];
  rcIdentifier: string; // package identifier from RevenueCat offering
};

const TIERS: TierSpec[] = [
  {
    key: 'basic',
    displayName: 'Basic',
    price: '$19/mo',
    tagline: 'Full news + sentiment + AI analysis',
    rcIdentifier: 'basic_monthly',
    features: [
      { label: 'Full news feed (30-day archive)', included: true },
      { label: 'Sentiment analysis + AI Overlay', included: true },
      { label: 'Push alerts (news + sentiment)', included: true },
      { label: '50 bookmarks · 10 alerts · 5 commodities', included: true },
      { label: 'Sentiment poll voting', included: true },
      { label: 'Polymarket + Kalshi divergence', included: false },
      { label: 'Prediction market cards', included: false },
    ],
  },
  {
    key: 'basic_markets',
    displayName: 'Basic + Markets',
    price: '$35/mo',
    tagline: 'Everything in Basic, plus prediction-market divergence',
    rcIdentifier: 'basic_markets_monthly',
    features: [
      { label: 'Everything in Basic', included: true },
      { label: 'Unlimited bookmarks · alerts · commodities', included: true },
      { label: 'Full historical archive', included: true },
      { label: 'Real-time push (vs 10-min batched)', included: true },
      { label: 'Polymarket + Kalshi divergence alerts', included: true },
      { label: '"Divergence" filter on news feed', included: true },
      { label: 'Prediction market cards', included: true },
    ],
  },
];

export default function PaywallScreen({ onClose, highlightTier }: Props) {
  const { tier, refresh } = useEntitlement();
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const off = await fetchCurrentOffering();
      setOffering(off);
    })();
  }, []);

  const handleSubscribe = async (spec: TierSpec) => {
    if (!offering) {
      Alert.alert(
        'Subscriptions unavailable',
        'This build was not compiled with the subscriptions SDK. Update to the latest TestFlight build.',
      );
      return;
    }
    const pkg = offering.availablePackages?.find(
      (p: any) => p.identifier === spec.rcIdentifier || p.product.identifier.includes(spec.rcIdentifier),
    );
    if (!pkg) {
      Alert.alert('Plan not available', `The ${spec.displayName} plan isn't available in this region yet.`);
      return;
    }
    setLoading(true);
    try {
      await purchasePackage(pkg);
      await refresh();
      Alert.alert('Welcome!', `You're now on ${spec.displayName}.`, [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (err: any) {
      if (err?.userCancelled) return; // Silent — user tapped cancel on the sheet
      Alert.alert('Purchase failed', err?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const restoredTier = await restorePurchases();
      await refresh();
      if (restoredTier === 'basic' || restoredTier === 'basic_markets') {
        Alert.alert('Restored', `Your ${restoredTier === 'basic' ? 'Basic' : 'Basic + Markets'} subscription is active again.`);
        onClose();
      } else {
        Alert.alert('Nothing to restore', 'No active subscriptions found on this Apple ID.');
      }
    } catch (err: any) {
      Alert.alert('Restore failed', err?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Feather name="x" size={22} color="#ECECEC" />
        </TouchableOpacity>
        <Text style={styles.title}>Choose your plan</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        <Text style={styles.currentTier}>
          Currently on: <Text style={styles.currentTierValue}>{tier === 'free_trial' ? 'Free Trial' : tier === 'expired' ? 'Expired' : tier === 'basic' ? 'Basic' : 'Basic + Markets'}</Text>
        </Text>

        {TIERS.map((spec) => {
          const isCurrent = spec.key === tier;
          const isHighlighted = spec.key === highlightTier;
          return (
            <View
              key={spec.key}
              style={[
                styles.card,
                isHighlighted && styles.cardHighlighted,
                isCurrent && styles.cardCurrent,
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{spec.displayName}</Text>
                <Text style={styles.cardPrice}>{spec.price}</Text>
              </View>
              <Text style={styles.cardTagline}>{spec.tagline}</Text>
              <View style={styles.cardFeatures}>
                {spec.features.map((f) => (
                  <PaywallFeatureRow key={f.label} label={f.label} included={f.included} />
                ))}
              </View>
              <TouchableOpacity
                style={[styles.cta, isCurrent && styles.ctaDisabled]}
                onPress={() => !isCurrent && handleSubscribe(spec)}
                disabled={loading || isCurrent}
              >
                {loading ? (
                  <ActivityIndicator color="#121212" />
                ) : (
                  <Text style={styles.ctaLabel}>
                    {isCurrent ? 'Current plan' : `Subscribe — ${spec.price}`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        <ApiTierCallout />

        <TouchableOpacity onPress={handleRestore} disabled={loading} style={styles.restoreBtn}>
          <Text style={styles.restoreLabel}>Restore purchases</Text>
        </TouchableOpacity>

        <Text style={styles.legalese}>
          Subscriptions auto-renew unless canceled 24h before period end. Manage or cancel in Settings → Apple ID → Subscriptions. See Terms + Privacy in Settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333333',
  },
  closeBtn: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#ECECEC', fontSize: 17, fontWeight: '600' },
  body: { padding: 16, gap: 16 },
  currentTier: { color: '#A0A0A0', fontSize: 13, marginBottom: 4 },
  currentTierValue: { color: '#ECECEC', fontWeight: '600' },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 20,
  },
  cardHighlighted: { borderColor: '#4ECCA3' },
  cardCurrent: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardName: { color: '#ECECEC', fontSize: 18, fontWeight: '600' },
  cardPrice: { color: '#4ECCA3', fontSize: 16, fontWeight: '600' },
  cardTagline: { color: '#A0A0A0', fontSize: 13, marginTop: 4, marginBottom: 14 },
  cardFeatures: { gap: 2, marginBottom: 14 },
  cta: {
    backgroundColor: '#4ECCA3',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaDisabled: { backgroundColor: '#333333' },
  ctaLabel: { color: '#121212', fontWeight: '600', fontSize: 15 },
  restoreBtn: { alignItems: 'center', paddingVertical: 12 },
  restoreLabel: { color: '#4ECCA3', fontSize: 14 },
  legalese: { color: '#666666', fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: 16, paddingTop: 8 },
});
