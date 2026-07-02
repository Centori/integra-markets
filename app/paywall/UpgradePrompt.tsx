// Inline modal that appears when a user taps a gated feature. Small, dismissible,
// with one CTA that opens the full PaywallScreen.
//
// Usage from a component:
//
//   const [showUpgrade, setShowUpgrade] = useState(false);
//   ...
//   if (!canAccess('divergence_alerts', tier)) {
//     setShowUpgrade(true); return;
//   }
//   ...
//   <UpgradePrompt
//     visible={showUpgrade}
//     onClose={() => setShowUpgrade(false)}
//     reason="divergence_alerts"
//   />

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Feature, Tier } from '../services/entitlementGate';

type Props = {
  visible: boolean;
  onClose: () => void;
  reason: Feature | 'bookmarks' | 'alerts' | 'commodities' | 'history';
  onSeePlans: (highlightTier?: Tier) => void;
};

// Feature-specific copy — keeps the prompt honest about what the user is
// missing, rather than a generic "upgrade to unlock more" message.
function copyFor(reason: Props['reason']): { title: string; body: string; highlight: Tier } {
  switch (reason) {
    case 'divergence_alerts':
    case 'divergence_filter':
    case 'polymarket_kalshi_view':
      return {
        title: 'Prediction-market divergence',
        body: 'Basic + Markets unlocks Polymarket/Kalshi divergence alerts, the divergence filter on your news feed, and prediction market cards.',
        highlight: 'basic_markets',
      };
    case 'push_alerts':
      return {
        title: 'Real-time push alerts',
        body: 'Basic includes news + sentiment alerts. Basic + Markets adds divergence alerts and real-time (vs. batched) delivery.',
        highlight: 'basic',
      };
    case 'ai_analysis_overlay':
      return {
        title: 'AI Analysis Overlay',
        body: 'Free trial includes 5 AI analyses per day. Basic makes it unlimited.',
        highlight: 'basic',
      };
    case 'export_csv':
      return {
        title: 'Data export',
        body: 'Export your bookmarks and sentiment history as CSV — available on Basic + Markets.',
        highlight: 'basic_markets',
      };
    case 'bookmarks':
      return {
        title: 'More bookmarks',
        body: 'Basic gets you 50 bookmarks. Basic + Markets is unlimited.',
        highlight: 'basic',
      };
    case 'alerts':
      return {
        title: 'More alerts',
        body: 'Basic gets you 10 alerts (news + sentiment). Basic + Markets is unlimited and adds divergence alerts.',
        highlight: 'basic',
      };
    case 'commodities':
      return {
        title: 'Track more commodities',
        body: 'Free tracks 2, Basic tracks 5, Basic + Markets is unlimited.',
        highlight: 'basic',
      };
    case 'history':
      return {
        title: 'More history',
        body: 'Basic gives you 30-day archive. Basic + Markets includes the full history back to launch.',
        highlight: 'basic',
      };
    case 'sentiment_poll_vote':
      return {
        title: 'Cast your vote',
        body: 'Basic and above lets you vote in the sentiment poll and see how your take compares.',
        highlight: 'basic',
      };
    default:
      return {
        title: 'Upgrade needed',
        body: 'This feature is included on a paid plan.',
        highlight: 'basic',
      };
  }
}

export default function UpgradePrompt({ visible, onClose, reason, onSeePlans }: Props) {
  const copy = copyFor(reason);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color="#A0A0A0" />
          </TouchableOpacity>
          <View style={styles.iconWrap}>
            <Feather name="lock" size={28} color="#4ECCA3" />
          </View>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => {
              onClose();
              onSeePlans(copy.highlight);
            }}
          >
            <Text style={styles.ctaLabel}>See plans</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.secondary}>
            <Text style={styles.secondaryLabel}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(78,204,163,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 12,
  },
  title: {
    color: '#ECECEC',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  body: {
    color: '#A0A0A0',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  cta: {
    backgroundColor: '#4ECCA3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  ctaLabel: {
    color: '#0B0B0B',
    fontWeight: '600',
    fontSize: 15,
  },
  secondary: {
    paddingVertical: 12,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  secondaryLabel: {
    color: '#A0A0A0',
    fontSize: 14,
  },
});
