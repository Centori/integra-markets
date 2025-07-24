import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { analyzeNewsWithAI, sendChatMessage, CHAT_CONTEXTS, checkAIServiceAvailability } from '../services/aiChatService';
import { getActiveApiConfig } from '../services/apiKeyService';

interface AIAnalysisOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  news: any;
}

export default function AIAnalysisOverlay({ isVisible, onClose, news }: AIAnalysisOverlayProps) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'chat'>('analysis');
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: string, content: string}>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Use news data from props or fallback to mock data
  const newsData = news || {
    title: "US Natural Gas Storage Exceeds Expectations",
    summary: "Weekly natural gas storage report shows higher than expected inventory build, indicating potential oversupply conditions in key markets.",
    source: "Bloomberg",
    timeAgo: "2 hours ago",
    sentiment: "BEARISH",
    sentimentScore: 0.77,
  };

  // Check API availability and load analysis
  useEffect(() => {
    if (isVisible) {
      checkApiAvailability();
      loadAIAnalysis();
    }
  }, [isVisible, news]);

  const checkApiAvailability = async () => {
    try {
      const available = await checkAIServiceAvailability();
      setHasApiKey(available);
    } catch (error) {
      console.error('Error checking API availability:', error);
      setHasApiKey(false);
    }
  };

  const loadAIAnalysis = async () => {
    if (!hasApiKey) {
      // Use fallback mock data
      setAiAnalysis(getMockAnalysis());
      return;
    }

    setLoading(true);
    try {
      const analysis = await analyzeNewsWithAI(
        newsData.summary,
        newsData.title,
        newsData.source
      );
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('Error loading AI analysis:', error);
      // Fallback to mock data
      setAiAnalysis(getMockAnalysis());
    } finally {
      setLoading(false);
    }
  };

  const getMockAnalysis = () => ({
    summary: "Weekly natural gas storage report shows higher than expected inventory build, indicating potential oversupply conditions in key markets. This could signal bearish pressure on natural gas prices in the near term.",
    sentiment: "BEARISH",
    confidence: 0.77,
    finbertSentiment: {
      bullish: 20.0,
      bearish: 70.0,
      neutral: 10.0,
    },
    keyDrivers: [
      { term: "market", score: 0.5 },
      { term: "supply", score: 0.7 },
      { term: "inventory", score: 0.6 },
      { term: "storage", score: 0.8 },
      { term: "oversupply", score: 0.9 },
    ],
    marketImpact: {
      level: "MEDIUM",
      confidence: 0.5,
    },
    tradeIdeas: [
      "Consider shorting natural gas futures if prices fall below $2.50",
      "Monitor inventory levels for continued oversupply signals",
      "Watch for seasonal demand patterns in upcoming weeks",
    ],
  });

  const sendChatMessageHandler = async () => {
    if (!inputMessage.trim() || chatLoading || !hasApiKey) return;

    const userMessage = { role: 'user', content: inputMessage };
    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setChatLoading(true);

    try {
      const response = await sendChatMessage(
        inputMessage,
        CHAT_CONTEXTS.ANALYSIS,
        chatMessages
      );
      
      const aiMessage = { role: 'assistant', content: response.content };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request. Please check your API key configuration.' 
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };
  
  const getSentimentColor = (sentiment: any) => {
    if (!sentiment) return '#A0A0A0';
    
    const sentimentStr = String(sentiment).toLowerCase();
    
    if (sentimentStr.includes('bearish') || sentimentStr.includes('negative') || (typeof sentiment === 'number' && sentiment < 0)) {
      return '#F05454';
    }
    if (sentimentStr.includes('bullish') || sentimentStr.includes('positive') || (typeof sentiment === 'number' && sentiment > 0)) {
      return '#4ECCA3';
    }
    if (sentimentStr.includes('loading')) {
      return '#A0A0A0';
    }
    return '#A0A0A0'; // neutral/default
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>integra Analysis</Text>
              {!hasApiKey && (
                <View style={styles.apiStatus}>
                  <Text style={styles.apiStatusText}>No API Key</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#ECECEC" />
            </TouchableOpacity>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'analysis' && styles.activeTab]}
              onPress={() => setActiveTab('analysis')}
            >
              <MaterialIcons name="analytics" size={20} color={activeTab === 'analysis' ? '#30A5FF' : '#A0A0A0'} />
              <Text style={[styles.tabText, activeTab === 'analysis' && styles.activeTabText]}>Analysis</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
              onPress={() => setActiveTab('chat')}
              disabled={!hasApiKey}
            >
              <MaterialIcons name="chat" size={20} color={!hasApiKey ? '#666' : activeTab === 'chat' ? '#30A5FF' : '#A0A0A0'} />
              <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText, !hasApiKey && styles.disabledTabText]}>Chat</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollView}>
            {activeTab === 'chat' ? (
              <View style={styles.chatSection}>
                <View style={[styles.section, styles.chatContainer]}>
                  <View style={styles.sectionHeaderWithAccent}>
                    <View style={styles.accentLine} />
                    <Text style={styles.sectionTitleWhite}>Chat with AI</Text>
                  </View>
                  <View style={styles.messagesContainer}>
                    {chatMessages.map((message, index) => (
                      <View key={index} style={styles.chatBubble(message.role)}>
                        <Text style={styles.chatText}>{message.content}</Text>
                      </View>
                    ))}
                    {chatLoading && (
                      <ActivityIndicator size="small" color="#ECECEC" />
                    )}
                  </View>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Type your message..."
                      placeholderTextColor="#A0A0A0"
                      value={inputMessage}
                      onChangeText={setInputMessage}
                      onSubmitEditing={sendChatMessageHandler}
                      editable={!chatLoading}
                    />
                    <TouchableOpacity onPress={sendChatMessageHandler} disabled={chatLoading} style={styles.sendButton}>
                      <Ionicons name="send" size={20} color="#30A5FF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.articleSection}>
                  <Text style={styles.articleTitle}>{newsData.title}</Text>
                  <Text style={styles.articleSource}>{newsData.source}</Text>
                </View>

                {/* Summary Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderWithAccent}>
                <View style={styles.accentLine} />
                <Text style={styles.sectionTitleWhite}>Summary</Text>
              </View>
              <Text style={styles.summaryText}>{aiAnalysis.summary}</Text>
            </View>

            {/* Sentiment */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderWithAccent}>
                <View style={styles.accentLine} />
                <Text style={styles.sectionTitleWhite}>Sentiment</Text>
              </View>
              
              <View style={styles.sentimentBars}>
                {/* Bullish */}
                <View style={styles.sentimentRow}>
                  <View style={styles.sentimentLabelRow}>
                    <Text style={styles.sentimentLabel}>Bullish</Text>
                    <Text style={styles.sentimentPercentage}>{aiAnalysis.finbertSentiment.bullish}%</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[styles.progressBar, styles.bullishBar, { width: `${aiAnalysis.finbertSentiment.bullish}%` }]}
                    />
                  </View>
                </View>

                {/* Bearish */}
                <View style={styles.sentimentRow}>
                  <View style={styles.sentimentLabelRow}>
                    <Text style={styles.sentimentLabel}>Bearish</Text>
                    <Text style={styles.sentimentPercentageBearish}>{aiAnalysis.finbertSentiment.bearish}%</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[styles.progressBar, styles.bearishBar, { width: `${aiAnalysis.finbertSentiment.bearish}%` }]}
                    />
                  </View>
                </View>

                {/* Neutral */}
                <View style={styles.sentimentRow}>
                  <View style={styles.sentimentLabelRow}>
                    <Text style={styles.sentimentLabel}>Neutral</Text>
                    <Text style={styles.sentimentPercentageNeutral}>{aiAnalysis.finbertSentiment.neutral}%</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[styles.progressBar, styles.neutralBar, { width: `${aiAnalysis.finbertSentiment.neutral}%` }]}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Key Sentiment Drivers */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderWithAccent}>
                <View style={styles.accentLine} />
                <Text style={styles.sectionTitleWhite}>Key Sentiment Drivers</Text>
              </View>
              <View style={styles.driversContainer}>
                {aiAnalysis.keyDrivers.map((driver, index) => (
                  <View key={index} style={styles.driverTag}>
                    <Text style={styles.driverText}>
                      {driver.term} ({driver.score})
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Market Impact */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderWithAccent}>
                <View style={styles.accentLine} />
                <Text style={styles.sectionTitleWhite}>Market Impact</Text>
              </View>
              <View style={styles.marketImpactRow}>
                <View style={styles.impactTag}>
                  <Text style={styles.impactText}>{aiAnalysis.marketImpact.level}</Text>
                </View>
                <Text style={styles.confidenceText}>Confidence: {aiAnalysis.marketImpact.confidence}</Text>
              </View>
            </View>

            {/* What this means for traders */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderWithAccent}>
                <View style={styles.accentLine} />
                <Text style={styles.sectionTitleWhite}>What this means for traders</Text>
              </View>
              <Text style={styles.traderMeaningText}>
                The bearish sentiment combined with oversupply indicators suggests potential downward pressure on natural gas prices. Traders should monitor inventory levels closely and consider risk management strategies for existing long positions.
              </Text>
            </View>

            {/* Trade Ideas */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderWithAccent}>
                <View style={styles.accentLine} />
                <Text style={styles.sectionTitleWhite}>Trade Ideas</Text>
              </View>
              <View style={styles.tradeIdeasContainer}>
                {aiAnalysis.tradeIdeas.map((idea, index) => (
                  <Text key={index} style={styles.tradeIdeaText}>
                    • {idea}
                  </Text>
                ))}
              </View>
            </View>

            {/* AI Attribution */}
            <View style={styles.attributionSection}>
              <View style={styles.attributionRow}>
                <Ionicons name="sparkles" size={16} color="#A0A0A0" />
                <Text style={styles.attributionText}>AI-powered market analysis</Text>
              </View>
            </View>
          </>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-start',
  },
  content: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ECECEC',
    marginRight: 10,
  },
  apiStatus: {
    backgroundColor: '#F05454',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  apiStatusText: {
    color: '#121212',
    fontSize: 10,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ECECEC',
    marginTop: 12,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A0A0A0',
  },
  selectedNewsCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4ECCA3',
  },
  selectedNewsHeadline: {
    fontSize: 16,
    color: '#ECECEC',
    lineHeight: 22,
    marginVertical: 8,
    fontWeight: '500',
  },
  selectedNewsSource: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
  },
  sentimentText: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  confidenceContainer: {
    marginBottom: 16,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#F05454',
    borderRadius: 4,
    marginBottom: 8,
  },
  confidenceText: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  commoditiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  commodityItem: {
    width: '25%',
    marginBottom: 8,
  },
  commodityName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ECECEC',
  },
  commodityChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  moverCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginLeft: 16,
    marginRight: 4,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moverSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ECECEC',
  },
  moverSentiment: {
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 8,
  },
  trendIndicator: {
    marginTop: 4,
  },
  newsCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  newsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsSentiment: {
    fontSize: 14,
    fontWeight: '600',
  },
  premiumBadge: {
    backgroundColor: '#30A5FF',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  premiumText: {
    color: '#121212',
    fontSize: 10,
    fontWeight: '600',
  },
  newsHeadline: {
    fontSize: 16,
    color: '#ECECEC',
    lineHeight: 22,
    marginBottom: 12,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsSource: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  commodityTag: {
    backgroundColor: '#333333',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  commodityTagText: {
    color: '#ECECEC',
    fontSize: 10,
    fontWeight: '500',
  },
  weatherAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  weatherAlertTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F05454',
    marginLeft: 8,
  },
  weatherAlertCard: {
    backgroundColor: '#2A1A1A',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#F05454',
  },
  weatherAlertText: {
    fontSize: 16,
    color: '#ECECEC',
    lineHeight: 22,
  },
  chatContainer: {
    padding: 16,
  },
  chatBubble: (role: string) => ({
    backgroundColor: role === 'user' ? '#30A5FF' : '#333333',
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
    maxWidth: '70%',
  }),
  chatText: {
    color: '#ECECEC',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    padding: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 10,
    color: '#ECECEC',
    fontSize: 14,
    marginRight: 8,
  },
  sendButton: {
    padding: 8,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#ECECEC',
    lineHeight: 24,
    marginBottom: 8,
  },
  articleSource: {
    fontSize: 14,
    color: '#30A5FF',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeaderWithAccent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  accentLine: {
    width: 4,
    height: 20,
    backgroundColor: '#30A5FF',
    borderRadius: 2,
    marginRight: 12,
  },
  sectionTitleWhite: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ECECEC',
  },
  summaryText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  sentimentBars: {
    gap: 12,
  },
  sentimentRow: {
    marginBottom: 12,
  },
  sentimentLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sentimentLabel: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  sentimentPercentage: {
    fontSize: 14,
    color: '#4ECCA3',
    fontWeight: '500',
  },
  sentimentPercentageBearish: {
    fontSize: 14,
    color: '#F05454',
    fontWeight: '500',
  },
  sentimentPercentageNeutral: {
    fontSize: 14,
    color: '#EAB308',
    fontWeight: '500',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  bullishBar: {
    backgroundColor: '#4ECCA3',
  },
  bearishBar: {
    backgroundColor: '#F05454',
  },
  neutralBar: {
    backgroundColor: '#EAB308',
  },
  driversContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  driverTag: {
    backgroundColor: '#EAB308',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  driverText: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '500',
  },
  marketImpactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  impactTag: {
    backgroundColor: '#EAB308',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  impactText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  tradeIdeasContainer: {
    gap: 8,
  },
  traderMeaningText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  tradeIdeaText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  attributionSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    alignItems: 'center',
  },
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attributionText: {
    fontSize: 12,
    color: '#A0A0A0',
    fontStyle: 'italic',
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    gap: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#1E1E1E',
  },
  tabText: {
    fontSize: 14,
    color: '#A0A0A0',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#30A5FF',
  },
  disabledTabText: {
    color: '#666666',
  },
  // Add articleSection style
  articleSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  // Chat section container
  chatSection: {
    flex: 1,
    padding: 24,
  },
  // Messages container
  messagesContainer: {
    flex: 1,
    marginBottom: 16,
  },
});
