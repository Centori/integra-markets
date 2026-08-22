import React from 'react';
import { Text, StyleSheet } from 'react-native';

/**
 * Integra "integra" wordmark — the brand mark used as the news-card image
 * fallback (replacing the old square "i" icon) and reusable anywhere a lockup
 * is needed. Kept visually in sync with the vector source `assets/integra-wordmark.svg`.
 *
 * Rendered with RN core <Text> ON PURPOSE: the wordmark is typographic and this
 * needs ZERO native modules. (react-native-svg is a dep but is not yet exercised
 * anywhere in the app; adding a first-time native render path here would be an
 * avoidable crash risk on a project with a history of native-module SIGABRTs.)
 * Uses the system font — same as the splash. Bundle a rounded brand face later
 * for the exact mockup look, or swap to the SVG once svg is proven in a build.
 */
export interface IntegraWordmarkProps {
  /** Font size in px (defaults to a card-fallback-appropriate size). */
  size?: number;
  /** Fill color — defaults to the brand green (#4ECCA3 accentPositive). */
  color?: string;
}

export default function IntegraWordmark({ size = 46, color = '#4ECCA3' }: IntegraWordmarkProps) {
  return (
    <Text allowFontScaling={false} style={[styles.wordmark, { fontSize: size, color }]}>
      integra
    </Text>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    fontWeight: '700',
    letterSpacing: -1.5,
    includeFontPadding: false,
  },
});
