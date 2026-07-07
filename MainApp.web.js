// Web entry — Metro auto-prefers .web.js over .js on web.
// The native MainApp.js has a heavy import graph (expo-notifications, gesture
// handlers, Reanimated, native-only Supabase paths, AIAnalysisOverlay) that
// crashes at bundle init on web with "Cannot read properties of null
// (reading 'useState')". Instead of bisecting that jungle we ship a clean web
// landing that routes users to /login (which is proxied to the Next.js
// dashboard where Supabase auth + Google + Apple sign-in already work).

import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

const COLORS = {
  bg: '#000',
  surface: '#0e0e0e',
  border: '#1f2937',
  text: '#fff',
  muted: '#9ca3af',
  accent: '#10b981',
};

function Anchor({ href, children, style }) {
  // react-native-web renders <a> for role="link" with an href prop.
  return (
    <Text
      accessibilityRole="link"
      href={href}
      style={[styles.linkBase, style]}
    >
      {children}
    </Text>
  );
}

function BrandMark() {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}>
        <View style={styles.brandDot} />
        <View style={styles.brandLine} />
      </View>
      <Text style={styles.brandText}>Integra Markets</Text>
    </View>
  );
}

function Feature({ title, body }) {
  return (
    <View style={styles.feature}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureBody}>{body}</Text>
    </View>
  );
}

export default function MainAppWeb() {
  const { width } = useWindowDimensions();
  const isWide = width >= 720;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={[styles.header, isWide && styles.headerRow]}>
        <BrandMark />
        <View style={styles.nav}>
          <Anchor href="/mcp" style={styles.navLink}>MCP</Anchor>
          <Anchor href="/api-tier" style={styles.navLink}>API</Anchor>
          <Anchor href="/login" style={styles.navLink}>Log in</Anchor>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.h1}>
          Commodity sentiment,{' '}
          <Text style={styles.h1Accent}>real-time.</Text>
        </Text>
        <Text style={styles.lede}>
          Integra ingests news, prediction markets, and positioning data across oil, gas, metals, and grains — then surfaces where the AI disagrees with the crowd. Available on iOS, dashboard, and REST API.
        </Text>
        <View style={[styles.ctaRow, isWide && styles.ctaRowWide]}>
          <Anchor href="/login" style={styles.ctaPrimary}>Log in</Anchor>
          <Anchor href="/api-tier" style={styles.ctaSecondary}>Get API access</Anchor>
          <Anchor href="/mcp" style={styles.ctaSecondary}>Connect via Claude</Anchor>
        </View>
      </View>

      <View style={[styles.features, isWide && styles.featuresGrid]}>
        <Feature
          title="SENTIMENT"
          body="Aggregated news sentiment scored across 17 curated commodity feeds. Rolling windows, top drivers, delta vs prior week."
        />
        <Feature
          title="DIVERGENCE"
          body="Where AI-implied probability disagrees with Kalshi + Polymarket pricing. Screen for high-conviction trade candidates."
        />
        <Feature
          title="HISTORICAL ARCHIVE"
          body="GDELT events, CFTC positioning, and World Bank price series back to 2020 — queryable via API + History tier."
        />
        <Feature
          title="MCP CONNECTOR"
          body="Access Integra directly from Claude Desktop or Claude Code. Ask questions in plain English, get structured answers."
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © Integra Markets — contact@integramarkets.app
        </Text>
        <View style={styles.footerLinks}>
          <Anchor href="/mcp" style={styles.footerLink}>Docs</Anchor>
          <Text style={styles.footerSeparator}> · </Text>
          <Anchor href="/api-tier" style={styles.footerLink}>Pricing</Anchor>
          <Text style={styles.footerSeparator}> · </Text>
          <Anchor href="/login" style={styles.footerLink}>Log in</Anchor>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 24, paddingBottom: 64, maxWidth: 1080, alignSelf: 'center', width: '100%' },

  header: { paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 64 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandDot: { width: 4, height: 4, backgroundColor: COLORS.accent, borderRadius: 1, marginBottom: 2 },
  brandLine: { width: 4, height: 14, backgroundColor: COLORS.accent, borderRadius: 1 },
  brandText: { color: COLORS.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },

  nav: { flexDirection: 'row', gap: 24, marginTop: 12 },
  navLink: { color: COLORS.muted, fontSize: 14, textDecorationLine: 'none' },

  hero: { paddingVertical: 24 },
  h1: { color: COLORS.text, fontSize: 48, fontWeight: '700', letterSpacing: -1, lineHeight: 52, maxWidth: 800 },
  h1Accent: { color: COLORS.accent },
  lede: { color: COLORS.muted, fontSize: 18, lineHeight: 28, maxWidth: 640, marginTop: 24 },

  ctaRow: { marginTop: 40, gap: 12 },
  ctaRowWide: { flexDirection: 'row', flexWrap: 'wrap' },
  ctaPrimary: {
    backgroundColor: COLORS.accent,
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    textDecorationLine: 'none',
  },
  ctaSecondary: {
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    textDecorationLine: 'none',
  },

  features: { marginTop: 96, gap: 20 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  feature: {
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    flexGrow: 1,
    flexBasis: 240,
  },
  featureTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  featureBody: { color: COLORS.muted, fontSize: 14, lineHeight: 22 },

  footer: {
    marginTop: 96,
    paddingTop: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  footerText: { color: COLORS.muted, fontSize: 13 },
  footerLinks: { flexDirection: 'row', alignItems: 'center' },
  footerLink: { color: COLORS.muted, fontSize: 13, textDecorationLine: 'none' },
  footerSeparator: { color: COLORS.muted, fontSize: 13 },

  linkBase: { color: COLORS.text },
});
