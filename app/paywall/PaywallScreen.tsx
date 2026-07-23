// Tier picker screen — Integra paywall. Presented full-screen when a user
// hits the paywall (Settings → Subscribe, or an UpgradePrompt "See plans").
//
// Layout is adapted from a familiar trader-facing template (hero → billing
// toggle → tier cards with feature checks) but rebuilt entirely in Integra's
// palette and typography. Three tiers:
//   Free — the always-free reading experience ($0)
//   Pro  — full alerts + prediction-market features, purchased via RevenueCat
//   API  — programmatic access, "coming soon" and MANAGED ON THE WEB dashboard.
//          It is deliberately NOT an in-app purchase: App Store rules reject
//          screens that push users to an external checkout for digital goods,
//          so the API card uses "Manage on web" language only — never a price
//          or a buy CTA.
//
// Pro pricing is read from the live RevenueCat offering when available and
// falls back to the constants below for dev / OTA-only builds.

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
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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
  // Accepted for call-site compatibility; the Pro card is always highlighted.
  highlightTier?: Tier;
};

type Billing = 'monthly' | 'annual';

const COLORS = {
  bg: '#121212',
  card: '#1E1E1E',
  cardAlt: '#191919',
  cardPro: '#16211D',
  border: '#333333',
  accent: '#4ECCA3',
  text: '#ECECEC',
  textDim: '#A0A0A0',
  textFaint: '#666666',
};

const FREE_FEATURES = [
  { label: 'Full news feed', included: true },
  { label: 'Article summary + sentiment bars', included: true },
  { label: 'Bookmarks (up to 50)', included: true },
  { label: 'Key sentiment drivers', included: false },
  { label: 'Market impact analysis', included: false },
  { label: 'Community sentiment poll', included: false },
  { label: 'Real-time push alerts', included: false },
];

const PRO_FEATURES = [
  { label: 'Everything in Free', included: true },
  { label: 'Full analysis: key drivers + market impact', included: true },
  { label: 'Community sentiment poll', included: true },
  { label: 'Real-time push alerts (news + sentiment)', included: true },
  { label: 'Polymarket + Kalshi divergence', included: true },
  { label: 'Unlimited bookmarks · alerts · commodities', included: true },
  { label: 'Extended news feed', included: true },
];

const API_FEATURES = [
  { label: 'Programmatic REST API access', included: true },
  { label: 'API key management + rotation', included: true },
  { label: 'Usage metrics & webhooks', included: true },
];

// Fallback pricing used only when the RevenueCat offering can't be read.
// NOTE: confirm/adjust these + the annual package in RevenueCat before launch.
const PRO_FALLBACK: Record<Billing, { price: string; unit: string; note: string; rcId: string }> = {
  monthly: { price: '$35', unit: '/mo', note: 'billed monthly', rcId: 'basic_markets_monthly' },
  annual: { price: '$29', unit: '/mo', note: 'billed annually · save 17%', rcId: 'basic_markets_annual' },
};

const DASHBOARD_API_URL = 'https://dashboard.integramarkets.app/api-tier';

function FeatureRow({ label, included }: { label: string; included: boolean }) {
  return (
    <View style={styles.featureRow}>
      <Feather
        name={included ? 'check' : 'x'}
        size={16}
        color={included ? COLORS.accent : COLORS.textFaint}
      />
      <Text style={[styles.featureLabel, !included && styles.featureLabelOff]}>{label}</Text>
    </View>
  );
}

export default function PaywallScreen({ onClose }: Props) {
  const { tier, refresh } = useEntitlement();
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState<any | null>(null);
  const [billing, setBilling] = useState<Billing>('annual');

  useEffect(() => {
    (async () => {
      try {
        const off = await fetchCurrentOffering();
        setOffering(off);
      } catch {
        // offering stays null → fall back to constant pricing
      }
    })();
  }, []);

  const isPaid = tier === 'basic' || tier === 'basic_markets';
  const currentLabel = isPaid ? 'Pro' : tier === 'expired' ? 'Expired' : 'Free';

  // Resolve the Pro price for the selected billing period, preferring live RC.
  const proFallback = PRO_FALLBACK[billing];
  const proPackage = offering?.availablePackages?.find(
    (p: any) =>
      p.identifier === proFallback.rcId || p.product?.identifier?.includes(proFallback.rcId),
  );
  const proPrice = proPackage?.product?.priceString ?? proFallback.price;
  const proUnit = proPackage ? (billing === 'annual' ? '/yr' : '/mo') : proFallback.unit;

  const handleSubscribe = async () => {
    if (!offering || !proPackage) {
      Alert.alert(
        'Subscriptions unavailable',
        'This build wasn’t compiled with the subscriptions SDK, or this plan isn’t available yet. Update to the latest TestFlight build.',
      );
      return;
    }
    setLoading(true);
    try {
      await purchasePackage(proPackage);
      await refresh();
      Alert.alert('Welcome to Pro!', 'Your upgrade is active.', [{ text: 'OK', onPress: onClose }]);
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
      const restored = await restorePurchases();
      await refresh();
      if (restored === 'basic' || restored === 'basic_markets') {
        Alert.alert('Restored', 'Your Pro subscription is active again.');
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

  const openDashboard = () => {
    Linking.openURL(DASHBOARD_API_URL).catch(() => {});
  };

  // Apple handles all auto-renewable cancellations — the app can't cancel on
  // the user's behalf, but it can deep-link them straight to the native
  // subscription-management screen where they cancel or change plan.
  const openManageSubscriptions = () => {
    Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
          <Feather name="x" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.h1}>Free, until you’re ready</Text>
          <Text style={styles.heroSub}>
            Start with the full market picture. Upgrade when you want the edge — real-time
            alerts, unlimited watchlists, and prediction-market divergence.
          </Text>
          <Text style={styles.currentPill}>
            You’re on <Text style={styles.currentPillValue}>{currentLabel}</Text>
          </Text>
        </View>

        {/* Monthly / Annually toggle */}
        <View style={styles.toggle}>
          {(['monthly', 'annual'] as Billing[]).map((b) => (
            <TouchableOpacity
              key={b}
              style={[styles.toggleBtn, billing === b && styles.toggleBtnActive]}
              onPress={() => setBilling(b)}
            >
              <Text style={[styles.toggleLabel, billing === b && styles.toggleLabelActive]}>
                {b === 'monthly' ? 'Monthly' : 'Annually'}
              </Text>
              {b === 'annual' && (
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>Save 17%</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* FREE */}
        <View style={styles.card}>
          <Text style={styles.cardName}>Free</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>$0</Text>
            <Text style={styles.priceUnit}>forever</Text>
          </View>
          <TouchableOpacity style={[styles.cta, styles.ctaGhost]} disabled>
            <Text style={styles.ctaGhostLabel}>{isPaid ? 'Included' : 'Your current plan'}</Text>
          </TouchableOpacity>
          <View style={styles.features}>
            {FREE_FEATURES.map((f) => (
              <FeatureRow key={f.label} {...f} />
            ))}
          </View>
        </View>

        {/* PRO — highlighted */}
        <View style={[styles.card, styles.cardProWrap]}>
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
          <Text style={styles.cardName}>Pro</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{proPrice}</Text>
            <Text style={styles.priceUnit}>{proUnit}</Text>
          </View>
          <Text style={styles.priceNote}>{proFallback.note}</Text>
          <TouchableOpacity
            style={[styles.cta, isPaid && styles.ctaDisabled]}
            onPress={handleSubscribe}
            disabled={loading || isPaid}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.bg} />
            ) : (
              <Text style={styles.ctaLabel}>{isPaid ? 'Current plan' : 'Upgrade to Pro'}</Text>
            )}
          </TouchableOpacity>
          <View style={styles.features}>
            {PRO_FEATURES.map((f) => (
              <FeatureRow key={f.label} {...f} />
            ))}
          </View>
        </View>

        {/* API — coming soon, web-managed (deliberately NOT an in-app purchase) */}
        <View style={[styles.card, styles.cardApi]}>
          <View style={styles.apiHeaderRow}>
            <Text style={styles.cardName}>API</Text>
            <View style={styles.soonBadge}>
              <Text style={styles.soonBadgeText}>COMING SOON</Text>
            </View>
          </View>
          <Text style={styles.priceNote}>
            Programmatic access, managed on the web dashboard.
          </Text>
          <TouchableOpacity style={[styles.cta, styles.ctaOutline]} onPress={openDashboard}>
            <Feather name="external-link" size={15} color={COLORS.accent} />
            <Text style={styles.ctaOutlineLabel}>Manage on web</Text>
          </TouchableOpacity>
          <View style={styles.features}>
            {API_FEATURES.map((f) => (
              <FeatureRow key={f.label} {...f} />
            ))}
          </View>
        </View>

        <TouchableOpacity onPress={handleRestore} disabled={loading} style={styles.restoreBtn}>
          <Text style={styles.restoreLabel}>Restore purchases</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={openManageSubscriptions} style={styles.restoreBtn}>
          <Text style={styles.restoreLabel}>Manage or cancel subscription</Text>
        </TouchableOpacity>

        <Text style={styles.legalese}>
          Subscriptions auto-renew unless canceled 24h before the period ends. Manage or cancel
          in Settings → Apple ID → Subscriptions. See Terms &amp; Privacy in Settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  body: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },

  hero: { alignItems: 'center', paddingTop: 4, paddingBottom: 4, gap: 12 },
  h1: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  heroSub: {
    color: COLORS.textDim,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  currentPill: { color: COLORS.textDim, fontSize: 13, marginTop: 2 },
  currentPillValue: { color: COLORS.accent, fontWeight: '700' },

  toggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  toggleBtnActive: { backgroundColor: COLORS.bg },
  toggleLabel: { color: COLORS.textDim, fontSize: 14, fontWeight: '600' },
  toggleLabelActive: { color: COLORS.text },
  saveBadge: {
    backgroundColor: 'rgba(78,204,163,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saveBadgeText: { color: COLORS.accent, fontSize: 10, fontWeight: '700' },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  cardProWrap: { borderColor: COLORS.accent, backgroundColor: COLORS.cardPro },
  cardApi: { backgroundColor: COLORS.cardAlt },
  cardName: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8, gap: 4 },
  price: { color: COLORS.text, fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  priceUnit: { color: COLORS.textDim, fontSize: 15, fontWeight: '600', marginBottom: 8 },
  priceNote: { color: COLORS.textDim, fontSize: 13, marginTop: 4 },

  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  popularBadgeText: { color: COLORS.bg, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  apiHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  soonBadge: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  soonBadgeText: { color: COLORS.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  cta: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  ctaLabel: { color: COLORS.bg, fontWeight: '700', fontSize: 16 },
  ctaDisabled: { backgroundColor: COLORS.border },
  ctaGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border },
  ctaGhostLabel: { color: COLORS.textDim, fontWeight: '600', fontSize: 15 },
  ctaOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.accent },
  ctaOutlineLabel: { color: COLORS.accent, fontWeight: '700', fontSize: 15 },

  features: { marginTop: 18, gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureLabel: { color: COLORS.text, fontSize: 14, flex: 1 },
  featureLabelOff: { color: COLORS.textFaint },

  restoreBtn: { alignItems: 'center', paddingVertical: 14 },
  restoreLabel: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  legalese: {
    color: COLORS.textFaint,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
