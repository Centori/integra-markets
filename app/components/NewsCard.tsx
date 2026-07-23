import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Share, Platform, ActionSheetIOS, Image } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SingleStar } from './CustomStarIcon';
import PolymarketIcon from './PolymarketIcon';
import KalshiIcon from './KalshiIcon';
import { useBookmarks } from '../providers/BookmarkProvider';
import { getPreferredSourceUrl } from '../utils/polymarketLinks';
import { cleanSummaryText } from '../utils/cleanSummary';
import { useTierLimit } from '../hooks/useTierLimit';
import UpgradePrompt from '../paywall/UpgradePrompt';
import { usePaywall } from '../paywall/PaywallProvider';

interface NewsItem {
  id?: number;
  title: string;
  content?: string;
  summary?: string;
  date?: string;
  source?: string;
  sourceUrl?: string;
  eventUrl?: string;
  polymarketUrl?: string;
  sentiment?: string;
  sentimentScore?: string;
  sentiment_score?: number | string;
  image_url?: string;
  timeAgo?: string;
  commodities?: string[];
  marketImpact?: string;
  polymarketContext?: {
    slug?: string;
  };
  // Divergence enrichment (added by TodayDashboard from /v1/markets/divergence).
  // Optional — undefined for articles whose topic has no prediction-market match.
  divergenceProvider?: 'polymarket' | 'kalshi';
  divergenceStatus?: 'ALIGNED' | 'DIVERGENCE' | 'NO_DATA';
  divergenceDelta?: number; // signed, -1..+1; +ve = news more bullish than market
}

interface NewsCardProps {
  item: NewsItem;
  onAIClick: (newsItem: NewsItem) => void;
}

export default function NewsCard({ item, onAIClick }: NewsCardProps) {
  const { addNewsBookmark, removeBookmark, isBookmarked, newsBookmarks } = useBookmarks();
  const isCurrentlyBookmarked = isBookmarked(item.title, 'news');
  const isPolymarket = item.source?.toLowerCase() === 'polymarket';
  const preferredSourceUrl = getPreferredSourceUrl(item);

  // Tier-based bookmark quota. `canAdd` is false when the user hits their limit.
  const bookmarkLimit = useTierLimit('bookmarks', newsBookmarks.length);
  const [showBookmarkUpgrade, setShowBookmarkUpgrade] = useState(false);
  const paywall = usePaywall();
  // Ref on the card root so we can capture it as an image to share (X/Twitter
  // Web Intent can't attach media — the only way to share the card visual is to
  // snapshot the view and hand the file to the native share sheet).
  const cardRef = useRef<View>(null);

  // Tap anywhere on the card opens Integra Analysis (build-64 behavior).
  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Haptics not available (simulator) — non-fatal
    }
    onAIClick(item);
  };

  // Long press: heavier haptic, same destination.
  const handleLongPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      // Haptics not available (simulator) — non-fatal
    }
    onAIClick(item);
  };

  const handleBookmarkToggle = async () => {
    try {
      if (isCurrentlyBookmarked) {
        // Find the bookmark by title and remove it
        const bookmark = newsBookmarks.find(b => b.title === item.title);
        if (bookmark) {
          await removeBookmark(bookmark.id);
        }
        return;
      }
      // Adding — check tier limit first
      if (!bookmarkLimit.canAdd) {
        setShowBookmarkUpgrade(true);
        return;
      }
      await addNewsBookmark({
        title: item.title,
        summary: item.summary || item.content || '',
        source: item.source || 'Unknown',
        sourceUrl: preferredSourceUrl || undefined,
        sentiment: (item.sentiment?.toUpperCase() as "BULLISH" | "BEARISH" | "NEUTRAL") || 'NEUTRAL',
        sentimentScore: parseFloat(item.sentimentScore || '0.5'),
        commodities: Array.isArray(item.commodities) ? item.commodities : undefined,
        marketImpact: item.marketImpact,
        tags: [item.source || 'news', ...(item.commodities || [])]
      });
    } catch (error) {
      console.error('Bookmark error:', error);
      // Error alert is handled by the provider
    }
  };
  const handleSourcePress = async () => {
    // First check if we have a valid URL
    if (preferredSourceUrl) {
      try {
        // Ensure the URL has a protocol
        let url = preferredSourceUrl;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          // Try to open anyway as canOpenURL might return false for valid URLs on some platforms
          await Linking.openURL(url);
        }
      } catch (error) {
        console.error('Error opening URL:', error);
        // Provide a more informative message
        Alert.alert(
          'Unable to Open Link',
          `Could not open the source website. You can search for "${item.title}" on ${item.source || 'the web'} to find the article or event.`,
          [{ text: 'OK' }]
        );
      }
    } else {
      // No URL available, just show source info
      Alert.alert(
        'Source Information',
        `This article is from ${item.source || 'an unknown source'}. No direct link is available.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleShare = async () => {
    const shareMessage = `${item.title}\n\n${item.summary || item.content || ''}\n\nSource: ${item.source || 'Unknown'}`;
    const shareUrl = preferredSourceUrl || '';
    const fullShareText = shareUrl ? `${shareMessage}\n\nRead more: ${shareUrl}` : shareMessage;
    
    if (Platform.OS === 'ios') {
      // iOS: Show ActionSheet with specific options. "Share Card Image" snapshots
      // the card and shares the PNG (the only way to get the visual onto X).
      const options = [
        'Cancel',
        'Share Card Image',
        'Share on X (link)',
        'Share via Email',
        'Copy Link',
        'More Options'
      ];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          title: 'Share Article',
          message: item.title
        },
        async (buttonIndex) => {
          try {
            switch (buttonIndex) {
              case 1: // Card image (native sheet → pick X/any app)
                await handleImageShare();
                break;
              case 2: // X / Twitter (text + link, renders the source OG card)
                await handleTwitterShare(item.title, shareUrl);
                break;
              case 3: // Email
                await handleEmailShare(shareMessage, shareUrl);
                break;
              case 4: // Copy Link
                await handleCopyLink(shareUrl || fullShareText);
                break;
              case 5: // More Options (native text share sheet)
                await handleNativeShare(fullShareText, shareUrl);
                break;
            }
          } catch (error) {
            console.error('Share action error:', error);
            Alert.alert('Share Error', 'Unable to complete sharing action.');
          }
        }
      );
    } else {
      // Android: no ActionSheet — offer the same image-vs-link choice.
      Alert.alert('Share Article', item.title, [
        { text: 'Share Card Image', onPress: () => handleImageShare() },
        { text: 'Share Link', onPress: () => handleNativeShare(fullShareText, shareUrl) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };
  
  const handleEmailShare = async (message: string, url: string) => {
    const subject = encodeURIComponent(`Market News: ${item.title}`);
    const body = encodeURIComponent(`${message}${url ? `\n\nRead more: ${url}` : ''}`);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert('Email Not Available', 'No email app is configured on this device.');
      }
    } catch (error) {
      console.error('Email share error:', error);
      Alert.alert('Error', 'Unable to open email app.');
    }
  };
  
  const handleTwitterShare = async (title: string, url: string) => {
    // Twitter renders an inline preview card when the URL is on its own line
    // and points at a page with OpenGraph tags (which all news sources have).
    // Keep the title short — Twitter truncates around 280 chars including URL.
    const trimmedTitle = title.length > 200 ? `${title.slice(0, 197)}…` : title;
    const tweetBody = url ? `${trimmedTitle}\n\n${url}` : trimmedTitle;
    const intentUrl = `https://x.com/intent/post?text=${encodeURIComponent(tweetBody)}`;

    try {
      await Linking.openURL(intentUrl);
    } catch (error) {
      console.error('Twitter share error:', error);
      Alert.alert('Error', 'Unable to open X to share this article.');
    }
  };
  
  const handleCopyLink = async (content: string) => {
    try {
      if (preferredSourceUrl) {
        // Copy just the URL if available
        await Clipboard.setStringAsync(preferredSourceUrl);
        Alert.alert('Link Copied', `${isPolymarket ? 'Event' : 'Article'} link copied to clipboard.`);
      } else {
        // Copy the full text if no URL
        await Clipboard.setStringAsync(content);
        Alert.alert('Text Copied', 'Article content copied to clipboard.');
      }
    } catch (error) {
      console.error('Copy error:', error);
      Alert.alert('Error', 'Unable to copy to clipboard.');
    }
  };
  
  const handleNativeShare = async (message: string, url: string) => {
    try {
      const shareOptions: any = {
        message,
        title: item.title,
      };
      
      // On iOS, provide URL separately for better app integration
      if (Platform.OS === 'ios' && url) {
        shareOptions.url = url;
      }
      
      const result = await Share.share(shareOptions);

      if (result.action === Share.sharedAction) {
        console.log('Content shared successfully');
      }
    } catch (error) {
      console.error('Native share error:', error);
      Alert.alert('Share Error', 'Unable to share this article.');
    }
  };

  // Snapshot the card view and share the PNG through the native share sheet.
  // The user can then pick X (or any app) and post with the card image attached
  // — the piece the x.com/intent text-only flow can't do. expo-sharing handles
  // the file/content URI correctly on both iOS and Android.
  const handleImageShare = async () => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'Image sharing is not available on this device.');
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 0.95 });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: item.title,
        UTI: 'public.png',
      });
    } catch (error) {
      console.error('Image share error:', error);
      Alert.alert('Share Error', 'Unable to capture the card image. Please try again.');
    }
  };

  const renderSentimentIcon = (sentiment: string) => {
    const color = getSentimentColor(sentiment);
    switch (sentiment?.toUpperCase()) {
      case 'BULLISH':
        return <Feather name="trending-up" size={14} color={color} />;
      case 'BEARISH':
        return <Feather name="trending-down" size={14} color={color} />;
      case 'NEUTRAL':
        return <Feather name="arrow-right" size={14} color={color} />;
      default:
        return <Feather name="minus" size={14} color={color} />;
    }
  };

  return (
    <TouchableOpacity
      ref={cardRef}
      collapsable={false}
      style={styles.card}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      activeOpacity={0.85}
    >
      {/* Image section — always renders; falls back to the brand mark when the
          article has no image (build-64 behavior). Sentiment pill overlays the
          bottom-left, showing label + score, exactly as build 64. */}
      <View style={[styles.imageContainer, !item.image_url && styles.imageContainerFallback]}>
        {/* Brand-gradient backdrop for the logo fallback — softens the hard
            square edge of the icon against the flat background (matches the
            preview's dark-green → charcoal wash). Only when no article image. */}
        {!item.image_url && (
          <LinearGradient
            colors={['#21403A', '#16241F', '#101815']}
            start={{ x: 0.15, y: 0.05 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Image
          source={item.image_url ? { uri: item.image_url } : require('../../assets/NewLogoInt.png.png')}
          style={[styles.cardImage, !item.image_url && styles.cardImageFallback]}
          resizeMode={item.image_url ? 'cover' : 'contain'}
        />
        {item.sentiment && (
          <View style={styles.imageSentimentBadge}>
            {renderSentimentIcon(item.sentiment)}
            <Text style={[styles.imageSentimentText, { color: getSentimentColor(item.sentiment) }]}>
              {item.sentiment.toUpperCase()} {formatScore(item.sentiment_score ?? item.sentimentScore)}
            </Text>
          </View>
        )}
        {isPolymarket && (
          <View style={styles.polymarketBadge}>
            <PolymarketIcon size={16} rounded={false} style={undefined} />
            <Text style={styles.polymarketText}>Polymarket</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.contentSection}>
        {/* Title row with the AI (analysis) button on the right */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <TouchableOpacity onPress={() => onAIClick(item)} style={styles.starButton}>
            <SingleStar size={28} color="#4a9eff" />
          </TouchableOpacity>
        </View>

        {/* Description */}
        {(() => {
          const desc = cleanSummaryText(item.summary) || cleanSummaryText(item.content);
          if (!desc) return null;
          return (
            <Text style={styles.description} numberOfLines={item.image_url ? 3 : 4}>
              {desc}
            </Text>
          );
        })()}

        {/* Divergence footer — only when upstream enriched this article with a
            divergence reading (sentiment vs. prediction-market gap). */}
        {item.divergenceStatus === 'DIVERGENCE' && item.divergenceProvider && typeof item.divergenceDelta === 'number' && (
          <View style={styles.divergenceFooter}>
            {item.divergenceProvider === 'polymarket' ? (
              <PolymarketIcon size={16} rounded={false} style={undefined} />
            ) : (
              <KalshiIcon size={16} rounded={false} style={undefined} />
            )}
            <Text style={styles.divergenceText}>
              {item.divergenceProvider === 'polymarket' ? 'Polymarket' : 'Kalshi'}
              {' '}
              {item.divergenceDelta > 0 ? 'underpricing' : 'overpricing'}
              {' '}
              by {Math.round(Math.abs(item.divergenceDelta) * 100)}pt
            </Text>
          </View>
        )}

        {/* Footer: source + time on the left, bookmark + share on the right */}
        <View style={styles.footer}>
          <View style={styles.sourceContainer}>
            {item.source && (
              <TouchableOpacity onPress={handleSourcePress} style={styles.sourceButton}>
                <Text style={[styles.sourceText, preferredSourceUrl ? styles.sourceTextLink : null]}>
                  {item.source}
                </Text>
                {preferredSourceUrl && (
                  <Feather name="external-link" size={14} color="#4a9eff" style={styles.linkIcon} />
                )}
              </TouchableOpacity>
            )}
            <Text style={styles.timeAgo}>{item.timeAgo || item.date || '4 hours ago'}</Text>
          </View>
          <View style={styles.footerActions}>
            <TouchableOpacity onPress={handleBookmarkToggle} style={styles.bookmarkButton}>
              <Feather
                name="bookmark"
                size={18}
                color={isCurrentlyBookmarked ? '#FFD700' : '#666666'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
              <Feather name="share-2" size={16} color="#666666" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <UpgradePrompt
        visible={showBookmarkUpgrade}
        onClose={() => setShowBookmarkUpgrade(false)}
        reason="bookmarks"
        onSeePlans={(highlightTier) => paywall.open({ highlightTier })}
      />
    </TouchableOpacity>
  );
}

const formatScore = (score: string | number | undefined): string => {
  if (score === undefined || score === null) return '0.50';
  const num = typeof score === 'string' ? parseFloat(score) : score;
  return isNaN(num) ? '0.50' : num.toFixed(2);
};

const getSentimentColor = (sentiment: string): string => {
  switch (sentiment?.toUpperCase()) {
    case 'BULLISH': return '#4ade80';
    case 'BEARISH': return '#ff6b6b';
    case 'NEUTRAL': return '#fbbf24';
    default: return '#888888';
  }
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    // Border removed - background contrast is sufficient
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  imageContainerFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageFallback: {
    opacity: 0.85,
    width: '52%',
    height: '52%',
    borderRadius: 16, // soften the icon's square edge against the gradient
  },
  imageSentimentBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  imageSentimentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  contentSection: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  polymarketBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  polymarketText: {
    color: '#8FA7FF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  divergenceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  divergenceText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  sentimentIconContainer: {
    marginRight: 6,
  },
  sentimentLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  sentimentScore: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookmarkButton: {
    padding: 8,
    marginRight: 8,
  },
  starButton: {
    padding: 2,
  },
  starIcon: {
    fontSize: 20,
    color: '#4a9eff',
  },
  iconWithStarsButton: {
    padding: 2,
    marginLeft: 8,
  },
  moreIcon: {
    fontSize: 20,
    color: '#888888',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9CA3AF',
    marginBottom: 20,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  sourceText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  sourceTextLink: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  linkIcon: {
    marginLeft: 4,
  },
  linkIconFeather: {
    marginLeft: 4,
  },
  timeAgo: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '400',
  },
  shareButton: {
    padding: 2,
  },
  shareIcon: {
    fontSize: 16,
    color: '#666666',
  },
});
