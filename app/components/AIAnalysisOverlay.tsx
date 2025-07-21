import React, { useState } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  Platform 
} from "react-native";
import { X, Sparkles, Bookmark, MessageCircle, Settings } from "lucide-react-native";
import Colors from "@/constants/colors";
import { aiAnalysis } from "@/constants/mockData";
import { useAPIKeys } from "@/providers/APIKeyProvider";
import { useBookmarks } from "@/providers/BookmarkProvider";
import APIKeySetupModal from "./APIKeySetupModal";
import ChatInterface from "./ChatInterface";

interface NewsData {
  title: string;
  summary: string;
  source: string;
  timeAgo: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  sentimentScore: number;
}

interface AIAnalysisOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  newsData: NewsData;
}

const AIAnalysisOverlay: React.FC<AIAnalysisOverlayProps> = ({ isVisible, onClose, newsData }) => {
  const { hasAnyKeys } = useAPIKeys();
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const [showAPIKeySetup, setShowAPIKeySetup] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  const bookmarked = isBookmarked(newsData.title);

  const handleBookmarkToggle = async () => {
    if (bookmarked) {
      const bookmark = useBookmarks().bookmarks.find(b => b.title === newsData.title);
      if (bookmark) {
        await removeBookmark(bookmark.id);
      }
    } else {
      await addBookmark({
        title: newsData.title,
        summary: newsData.summary,
        source: newsData.source,
        sentiment: newsData.sentiment,
        sentimentScore: newsData.sentimentScore
      });
    }
  };

  const handleChatClick = () => {
    if (!hasAnyKeys) {
      setShowAPIKeySetup(true);
    } else {
      setShowChat(true);
    }
  };

  const handleAPIKeySetupComplete = () => {
    setShowChat(true);
  };

  if (showChat) {
    return (
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowChat(false);
          onClose();
        }}
      >
        <View style={styles.chatOverlay}>
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <TouchableOpacity 
                onPress={() => setShowChat(false)}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>← Analysis</Text>
              </TouchableOpacity>
              <Text style={styles.chatTitle}>AI Chat</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X color={Colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>
            <ChatInterface 
              newsContext={{
                title: newsData.title,
                summary: newsData.summary,
                source: newsData.source
              }}
            />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Integra Analysis</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleBookmarkToggle} style={styles.actionButton}>
                  <Bookmark 
                    color={bookmarked ? Colors.tint : Colors.textSecondary} 
                    size={20}
                    fill={bookmarked ? Colors.tint : 'none'}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X color={Colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Article Title */}
              <View style={styles.articleSection}>
                <Text style={styles.articleTitle}>{newsData.title}</Text>
                <Text style={styles.articleSource}>{newsData.source}</Text>
              </View>

              {/* Summary Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionMarker} />
                  <Text style={styles.sectionTitle}>Summary</Text>
                </View>
                <Text style={styles.sectionText}>{aiAnalysis.summary}</Text>
              </View>

              {/* FinBERT Sentiment */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionMarker} />
                  <Text style={styles.sectionTitle}>FinBERT Sentiment</Text>
                </View>

                <View style={styles.sentimentMetrics}>
                  {/* Bullish */}
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Bullish</Text>
                    <Text style={[styles.metricValue, { color: Colors.bullish }]}>
                      {aiAnalysis.finbertSentiment.bullish}%
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { 
                          backgroundColor: Colors.bullish,
                          width: `${aiAnalysis.finbertSentiment.bullish}%` 
                        }
                      ]} 
                    />
                  </View>

                  {/* Bearish */}
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Bearish</Text>
                    <Text style={[styles.metricValue, { color: Colors.bearish }]}>
                      {aiAnalysis.finbertSentiment.bearish}%
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { 
                          backgroundColor: Colors.bearish,
                          width: `${aiAnalysis.finbertSentiment.bearish}%` 
                        }
                      ]} 
                    />
                  </View>

                  {/* Neutral */}
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Neutral</Text>
                    <Text style={[styles.metricValue, { color: Colors.neutral }]}>
                      {aiAnalysis.finbertSentiment.neutral}%
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { 
                          backgroundColor: Colors.neutral,
                          width: `${aiAnalysis.finbertSentiment.neutral}%` 
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>

              {/* Key Sentiment Drivers */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionMarker} />
                  <Text style={styles.sectionTitle}>Key Sentiment Drivers</Text>
                </View>
                <View style={styles.tagsContainer}>
                  {aiAnalysis.keyDrivers.map((driver, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>
                        {driver.term} ({driver.score})
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Market Impact */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionMarker} />
                  <Text style={styles.sectionTitle}>Market Impact</Text>
                </View>
                <View style={styles.impactContainer}>
                  <View style={styles.impactBadge}>
                    <Text style={styles.impactBadgeText}>{aiAnalysis.marketImpact.level}</Text>
                  </View>
                  <Text style={styles.impactConfidence}>
                    Confidence: {aiAnalysis.marketImpact.confidence}
                  </Text>
                </View>
              </View>

              {/* What this means for Traders */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionMarker} />
                  <Text style={styles.sectionTitle}>What this means for Traders</Text>
                </View>
                <View style={styles.tradeIdeasContainer}>
                  {aiAnalysis.whatThisMeansForTraders.map((insight, index) => (
                    <View key={index} style={styles.tradeIdeaRow}>
                      <Text style={styles.bulletPoint}>•</Text>
                      <Text style={styles.tradeIdeaText}>{insight}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Trade Ideas */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionMarker} />
                  <Text style={styles.sectionTitle}>Trade Ideas</Text>
                </View>
                <View style={styles.tradeIdeasContainer}>
                  {aiAnalysis.tradeIdeas.map((idea, index) => (
                    <View key={index} style={styles.tradeIdeaRow}>
                      <Text style={styles.bulletPoint}>•</Text>
                      <Text style={styles.tradeIdeaText}>{idea}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Chat Section */}
              <View style={styles.chatSection}>
                <TouchableOpacity 
                  style={styles.chatInput}
                  onPress={handleChatClick}
                >
                  <MessageCircle color={Colors.textSecondary} size={20} />
                  <Text style={styles.chatInputText}>Ask anything...</Text>
                  {!hasAnyKeys && (
                    <View style={styles.setupBadge}>
                      <Settings color={Colors.tint} size={16} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* AI Attribution */}
              <View style={styles.attribution}>
                <Sparkles color={Colors.textSecondary} size={16} />
                <Text style={styles.attributionText}>AI-powered market analysis</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <APIKeySetupModal
        isVisible={showAPIKeySetup}
        onClose={() => setShowAPIKeySetup(false)}
        onComplete={handleAPIKeySetupComplete}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    width: "90%",
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  articleSection: {
    marginBottom: 24,
  },
  articleTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 8,
  },
  articleSource: {
    color: Colors.tint,
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionMarker: {
    width: 4,
    height: 20,
    backgroundColor: Colors.tint,
    borderRadius: 2,
    marginRight: 12,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  sectionText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  sentimentMetrics: {
    gap: 12,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#333",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: Colors.neutral,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "500",
  },
  impactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  impactBadge: {
    backgroundColor: Colors.neutral,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  impactBadgeText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "500",
  },
  impactConfidence: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  tradeIdeasContainer: {
    gap: 8,
  },
  tradeIdeaRow: {
    flexDirection: "row",
    gap: 8,
  },
  bulletPoint: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  tradeIdeaText: {
    color: Colors.textSecondary,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  chatSection: {
    marginBottom: 24,
  },
  chatInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  chatInputText: {
    color: Colors.textSecondary,
    fontSize: 16,
    flex: 1,
  },
  setupBadge: {
    backgroundColor: Colors.tintLight,
    borderRadius: 12,
    padding: 4,
  },
  attribution: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
  },
  attributionText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontStyle: "italic",
  },
  chatOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: Colors.card,
    marginTop: 50,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    color: Colors.tint,
    fontSize: 16,
  },
  chatTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
});

export default AIAnalysisOverlay;