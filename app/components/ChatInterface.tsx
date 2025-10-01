import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
// import groqService from '../services/groqService';
import { sentimentApi } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBookmarks } from '../providers/BookmarkProvider';
// @ts-ignore - JavaScript component
import StructuredAnalysis from './StructuredAnalysis';
// @ts-ignore - JavaScript component
import MarkdownMessage from './MarkdownMessage';
import AIResponseFormatter from './AIResponseFormatter';

// Color palette
const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  bgTertiary: '#252525',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3',
  accentData: '#30A5FF',
  divider: '#333333',
  userMessage: '#2B2B2B',
  assistantMessage: '#1E1E1E',
  inputBg: '#1A1A1A',
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  newsContext?: {
    title: string;
    summary: string;
    source: string;
    sentiment?: any;
    keyDrivers?: any[];
    marketImpact?: any;
    traderInsights?: string[];
    fullAnalysis?: string;
  } | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ newsContext }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const shouldStopTypingRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Use the enhanced bookmark provider
  const { chatBookmarks, addChatBookmark, removeBookmark, isBookmarked } = useBookmarks();

  // Suggestion chips for quick actions
  const suggestions = [
    "What's the market impact of this news?",
    "Suggest trading strategies based on this",
    "Analyze the sentiment and key drivers",
    "What are the risks to consider?"
  ];

  useEffect(() => {
    // Don't show initial message, just suggestions
    setShowSuggestions(messages.length === 0);
  }, [messages]);



  const handleSuggestionTap = (suggestion: string) => {
    setInputText(suggestion);
    sendMessage(suggestion);
  };

  const stopTyping = () => {
    console.log('Stop button pressed!');
    shouldStopTypingRef.current = true;
    setIsTyping(false);
  };

  // Helper function to safely parse JSON
  const tryParseJSON = (text: string): any => {
    try {
      return JSON.parse(text);
    } catch {
      // If it's not JSON, check if it contains analysis keywords
      if (text.includes('bullish') || text.includes('bearish') || 
          text.includes('market') || text.includes('price')) {
        // Return a structured format for analysis display
        return {
          summary: text,
          confidence: 0.7,
          sources: ['Market Analysis']
        };
      }
      return null;
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || inputText.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setShowSuggestions(false);

    // Create placeholder assistant message for streaming
    const assistantId = (Date.now() + 1).toString();
    const placeholderMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, placeholderMessage]);

    try {
      // Prepare messages for the API
      const apiMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add the new user message
      apiMessages.push({
        role: 'user',
        content: text
      });

      // Prepare context for the AI
      let contextMessage = '';
      if (newsContext) {
        contextMessage = `Context: Analyzing "${newsContext.title}" from ${newsContext.source}. `;
        if (newsContext.sentiment) {
          contextMessage += `Sentiment: Bullish ${newsContext.sentiment.bullish}%, Bearish ${newsContext.sentiment.bearish}%, Neutral ${newsContext.sentiment.neutral}%. `;
        }
        if (newsContext.keyDrivers && newsContext.keyDrivers.length > 0) {
          contextMessage += `Key drivers: ${newsContext.keyDrivers.map(d => d.text).join(', ')}. `;
        }
        if (newsContext.marketImpact) {
          contextMessage += `Market impact: ${newsContext.marketImpact.level} with ${newsContext.marketImpact.confidence} confidence. `;
        }
      }
      
      // Call backend API with enhanced context
      const response = await fetch('https://integra-markets-backend.fly.dev/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          commodity: newsContext?.title || 'general',
          context: contextMessage
        })
      });

      const data = await response.json();
      
      // Clean and format the response text
      let cleanedResponse = (data.response || 'Analysis complete')
        .replace(/\*\*/g, '') // Remove bold markers
        .replace(/\s{2,}/g, ' ') // Clean extra spaces
        .trim();
      
      // Extract and clean source citations
      const sourcePattern = /([a-zA-Z]+economics|tradingeconomics|[a-zA-Z]+)\s*\+\d+\s*\./g;
      const sources = [];
      cleanedResponse = cleanedResponse.replace(sourcePattern, (match, source) => {
        sources.push(source.trim());
        return ''; // Remove inline citations from text
      }).trim();
      
      // Typewriter effect - ChatGPT-like speed (15-20 chars per frame for smooth 600+ chars/sec)
      const chars = cleanedResponse.split('');
      const charsPerFrame = 15; // Show 15 characters at once for ChatGPT-like speed
      const frameDelay = 16; // 60fps (16ms per frame)
      
      setIsTyping(true);
      shouldStopTypingRef.current = false; // Reset the ref
      
      console.log('Starting typewriter effect for', chars.length, 'characters');
      
      let currentText = '';
      for (let i = 0; i < chars.length; i += charsPerFrame) {
        // Check if user wants to stop typing using ref for immediate response
        if (shouldStopTypingRef.current) {
          console.log('Stopping typewriter at character', i, 'of', chars.length);
          // Show complete message immediately
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantId 
                ? { ...msg, content: cleanedResponse }
                : msg
            )
          );
          break;
        }
        
        // Add multiple characters at once for faster typing
        const nextChars = chars.slice(i, i + charsPerFrame).join('');
        currentText += nextChars;
        
        // Update message progressively
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantId 
              ? { ...msg, content: currentText }
              : msg
          )
        );
        
        // Very short delay for smooth animation at 60fps
        await new Promise(resolve => setTimeout(resolve, frameDelay));
      }
      
      console.log('Typewriter effect completed or stopped');
      setIsTyping(false);
      shouldStopTypingRef.current = false; // Reset after completion
      
      const responseData = { success: response.ok, data: data.response, error: data.error };

      if (!responseData.success) {
        // Update with error message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantId 
              ? { ...msg, content: `Sorry, I encountered an error: ${responseData.error || 'Backend connection failed'}` }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Update with error message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantId 
            ? { ...msg, content: 'Sorry, I encountered an unexpected error. Please try again.' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Format AI response with Perplexity-like formatting
  const formatMessageContent = (content: string, messageId?: string) => {
    if (!content.trim()) return null;
    
    // Extract sources from the content if they exist
    const sourcePattern = /([a-zA-Z]+economics|tradingeconomics|Reuters|Bloomberg|[a-zA-Z]+)\s*\+\d+/g;
    const extractedSources: string[] = [];
    let cleanContent = content;
    
    // Extract sources and clean content
    const matches = content.match(sourcePattern);
    if (matches) {
      matches.forEach(match => {
        const sourceName = match.replace(/\s*\+\d+/, '').trim();
        if (!extractedSources.includes(sourceName)) {
          extractedSources.push(sourceName);
        }
      });
      // Remove inline citations
      cleanContent = content.replace(sourcePattern, '').replace(/\s+\./g, '.');
    }
    
    // Use AIResponseFormatter for clean Perplexity-like display
    return (
      <AIResponseFormatter 
        content={cleanContent}
        sources={extractedSources}
        isDarkMode={true}
      />
    );
  };

  // Helper function to check if a message is bookmarked
  const isMessageBookmarked = (message: Message) => {
    if (message.role !== 'assistant') return false;
    
    // Find the user query that preceded this response
    const messageIndex = messages.findIndex(m => m.id === message.id);
    const userQuery = messageIndex > 0 ? messages[messageIndex - 1]?.content : '';
    
    // Check if this combination of query and response is bookmarked
    return chatBookmarks.some(b => 
      b.query === userQuery && b.response === message.content
    );
  };

  // Bookmark functionality using enhanced BookmarkProvider
  const toggleBookmark = async (messageId: string) => {
    try {
      const message = messages.find(msg => msg.id === messageId);
      if (!message || message.role !== 'assistant') return;

      // Find the user query that preceded this response
      const messageIndex = messages.findIndex(m => m.id === messageId);
      const userQuery = messageIndex > 0 ? messages[messageIndex - 1]?.content : 'General Analysis';
      
      // Check if this specific message is already bookmarked
      const existingBookmark = chatBookmarks.find(b => 
        b.query === userQuery && b.response === message.content
      );
      
      if (existingBookmark) {
        // Remove bookmark
        await removeBookmark(existingBookmark.id);
      } else {
        // Extract sources from the response if they exist
        const sourcePattern = /([a-zA-Z]+economics|tradingeconomics|Reuters|Bloomberg|[a-zA-Z]+)\s*\+\d+/g;
        const matches = message.content.match(sourcePattern);
        const sources: Array<{ name: string; url?: string }> = [];
        
        if (matches) {
          matches.forEach(match => {
            const sourceName = match.replace(/\s*\+\d+/, '').trim();
            if (!sources.find(s => s.name === sourceName)) {
              sources.push({ name: sourceName });
            }
          });
        }
        
        // Add new chat bookmark
        await addChatBookmark({
          title: userQuery.length > 50 ? userQuery.substring(0, 47) + '...' : userQuery,
          query: userQuery,
          response: message.content,
          sources: sources.length > 0 ? sources : undefined,
          tags: newsContext ? [newsContext.source, 'news-analysis'] : ['general-analysis']
        });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to save bookmark. Please try again.');
    }
  };

  // Copy message content to clipboard
  const copyToClipboard = async (messageContent: string) => {
    try {
      Clipboard.setString(messageContent);
      Alert.alert('Copied!', 'Analysis copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  // No need to load bookmarks separately as they're provided by BookmarkProvider

  useEffect(() => {
    // Scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={[
          styles.messagesContent,
          messages.length === 0 && styles.emptyMessagesContent
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Suggestion chips */}
        {showSuggestions && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Quick Actions</Text>
            <View style={styles.suggestionsGrid}>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionChip}
                  onPress={() => handleSuggestionTap(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageWrapper,
              message.role === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper
            ]}
          >
            <View style={styles.messageHeader}>
              <View style={[
                styles.avatar,
                message.role === 'user' ? styles.userAvatar : styles.assistantAvatar
              ]}>
                <MaterialIcons 
                  name={message.role === 'user' ? 'person' : 'auto-awesome'} 
                  size={20} 
                  color={message.role === 'user' ? colors.textPrimary : colors.accentPositive} 
                />
              </View>
              <Text style={styles.messageRole}>
                {message.role === 'user' ? 'You' : 'Integra AI'}
              </Text>
              {message.role === 'assistant' && message.content.trim() && (
                <View style={styles.messageActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => copyToClipboard(message.content)}
                  >
                    <MaterialIcons
                      name="content-copy"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => toggleBookmark(message.id)}
                  >
                    <MaterialIcons
                      name={isMessageBookmarked(message) ? 'bookmark' : 'bookmark-border'}
                      size={18}
                      color={isMessageBookmarked(message) ? colors.accentPositive : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={styles.messageContent}>
              {message.role === 'assistant' ? (
                <View>
                  {/* Check if message looks like structured analysis data */}
                  {message.content.includes('price_trends') || 
                   message.content.includes('supply_demand') ||
                   message.content.includes('technical_indicators') ? (
                    <StructuredAnalysis 
                      analysis={tryParseJSON(message.content) || { summary: message.content }}
                      isDarkMode={true}
                      showActions={false}
                    />
                  ) : (
                    formatMessageContent(message.content)
                  )}
                </View>
              ) : (
                <Text style={styles.messageText}>{message.content}</Text>
              )}
            </View>
          </View>
        ))}
        
        {isLoading && (
          <View style={[styles.messageWrapper, styles.assistantMessageWrapper]}>
            <View style={styles.messageHeader}>
              <View style={[styles.avatar, styles.assistantAvatar]}>
                <MaterialIcons name="auto-awesome" size={20} color={colors.accentPositive} />
              </View>
              <Text style={styles.messageRole}>Integra AI</Text>
            </View>
            <View style={styles.messageContent}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.accentPositive} />
                <Text style={styles.loadingText}>Analyzing...</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about market trends, analysis, or any financial topic..."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={1000}
          onSubmitEditing={() => sendMessage()}
          blurOnSubmit={false}
        />
        {isTyping && (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopTyping}
          >
            <MaterialIcons 
              name="stop-circle" 
              size={14} 
              color={colors.textSecondary} 
            />
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Stop</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isLoading) && styles.disabledSendButton
          ]}
          onPress={() => sendMessage()}
          disabled={!inputText.trim() || isLoading}
        >
          <MaterialIcons 
            name="send" 
            size={20} 
            color={colors.bgPrimary} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingBottom: 20,
  },
  emptyMessagesContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  suggestionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  suggestionText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  messageWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
  },
  userMessageWrapper: {
    backgroundColor: 'transparent',
  },
  assistantMessageWrapper: {
    backgroundColor: 'transparent',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatar: {
    backgroundColor: colors.bgTertiary,
  },
  assistantAvatar: {
    backgroundColor: 'rgba(78, 204, 163, 0.1)',
  },
  messageRole: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  messageContent: {
    marginLeft: 44,
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    maxWidth: '85%',
  },
  messageText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: colors.bgPrimary,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 10,
    backgroundColor: colors.bgSecondary,
    color: colors.textPrimary,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.accentPositive,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accentPositive,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  disabledSendButton: {
    backgroundColor: colors.bgTertiary,
    shadowOpacity: 0,
    elevation: 0,
  },
  stopButton: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    flexDirection: 'row',
    gap: 4,
  },
  // New styles for formatted content
  messageTextBlock: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  numberedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  numberText: {
    color: colors.accentPositive,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    minWidth: 24,
    marginRight: 8,
  },
  numberedText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  blockSpacer: {
    height: 12,
  },
  messageActions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  bookmarkButton: {
    marginLeft: 'auto',
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});

export default ChatInterface;
