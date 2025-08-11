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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import groqService from '../services/groqService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  newsContext: {
    title: string;
    summary: string;
    source: string;
  };
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ newsContext }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [bookmarkedMessages, setBookmarkedMessages] = useState<Set<string>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);

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

      // Call Groq API with streaming typewriter effect
      const response = await groqService.sendMessage(
        apiMessages, 
        newsContext,
        (streamingText: string) => {
          // Update the assistant message with streaming text
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantId 
                ? { ...msg, content: streamingText }
                : msg
            )
          );
        }
      );

      if (!response.success) {
        // Update with error message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantId 
              ? { ...msg, content: `Sorry, I encountered an error: ${response.error}` }
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

  // Format AI response text with proper paragraph and numbering structure
  const formatMessageContent = (content: string) => {
    if (!content.trim()) return [];
    
    // Split by double newlines for paragraphs, then by single newlines for numbered lists
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    const formattedBlocks: JSX.Element[] = [];
    
    paragraphs.forEach((paragraph, pIndex) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return;
      
      // Check if this is a numbered list paragraph
      const lines = trimmed.split('\n');
      const isNumberedList = lines.some(line => /^\d+[.)]/.test(line.trim()));
      
      if (isNumberedList) {
        // Render as numbered list
        lines.forEach((line, lIndex) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;
          
          const numberMatch = trimmedLine.match(/^(\d+[.)])\s*(.*)/);
          if (numberMatch) {
            formattedBlocks.push(
              <View key={`${pIndex}-${lIndex}`} style={styles.numberedItem}>
                <Text style={styles.numberText}>{numberMatch[1]}</Text>
                <Text style={styles.numberedText}>{numberMatch[2]}</Text>
              </View>
            );
          } else {
            formattedBlocks.push(
              <Text key={`${pIndex}-${lIndex}`} style={styles.messageTextBlock}>
                {trimmedLine}
              </Text>
            );
          }
        });
      } else {
        // Regular paragraph
        formattedBlocks.push(
          <Text key={pIndex} style={styles.messageTextBlock}>
            {trimmed}
          </Text>
        );
      }
      
      // Add spacing between blocks
      if (pIndex < paragraphs.length - 1) {
        formattedBlocks.push(
          <View key={`spacer-${pIndex}`} style={styles.blockSpacer} />
        );
      }
    });
    
    return formattedBlocks;
  };

  // Bookmark functionality
  const toggleBookmark = async (messageId: string) => {
    try {
      const message = messages.find(msg => msg.id === messageId);
      if (!message || message.role !== 'assistant') return;

      const isCurrentlyBookmarked = bookmarkedMessages.has(messageId);
      const newBookmarkedSet = new Set(bookmarkedMessages);
      
      if (isCurrentlyBookmarked) {
        newBookmarkedSet.delete(messageId);
      } else {
        // Check storage limits before adding
        const existingBookmarks = await AsyncStorage.getItem('bookmarked_analyses');
        const bookmarks = existingBookmarks ? JSON.parse(existingBookmarks) : [];
        
        // Limit: 50 free bookmarks, suggest subscription beyond that
        if (bookmarks.length >= 50 && !isCurrentlyBookmarked) {
          Alert.alert(
            'Storage Limit Reached',
            'You\'ve reached the limit of 50 saved analyses. Upgrade to Pro for unlimited storage and advanced features.',
            [
              { text: 'Later', style: 'cancel' },
              { text: 'Upgrade', onPress: () => console.log('Navigate to subscription') }
            ]
          );
          return;
        }
        
        newBookmarkedSet.add(messageId);
        
        // Save bookmark to storage
        const bookmarkData = {
          id: messageId,
          content: message.content,
          newsTitle: newsContext.title,
          newsSource: newsContext.source,
          timestamp: message.timestamp,
          query: messages[messages.findIndex(m => m.id === messageId) - 1]?.content || 'General Analysis'
        };
        
        bookmarks.push(bookmarkData);
        await AsyncStorage.setItem('bookmarked_analyses', JSON.stringify(bookmarks));
      }
      
      setBookmarkedMessages(newBookmarkedSet);
      
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to save bookmark. Please try again.');
    }
  };

  // Load existing bookmarks on component mount
  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const existingBookmarks = await AsyncStorage.getItem('bookmarked_analyses');
        if (existingBookmarks) {
          const bookmarks = JSON.parse(existingBookmarks);
          const bookmarkedIds = new Set(bookmarks.map((b: any) => b.id));
          setBookmarkedMessages(bookmarkedIds);
        }
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      }
    };
    
    loadBookmarks();
  }, []);

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
        {/* Suggestion Chips */}
        {showSuggestions && (
          <View style={styles.suggestionsContainer}>
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
                  name={message.role === 'user' ? 'person' : 'chat-bubble'} 
                  size={20} 
                  color={message.role === 'user' ? colors.textPrimary : colors.accentPositive} 
                />
              </View>
              <Text style={styles.messageRole}>
                {message.role === 'user' ? 'You' : 'Integra AI'}
              </Text>
              {message.role === 'assistant' && message.content.trim() && (
                <TouchableOpacity
                  style={styles.bookmarkButton}
                  onPress={() => toggleBookmark(message.id)}
                >
                  <MaterialIcons
                    name={bookmarkedMessages.has(message.id) ? 'bookmark' : 'bookmark-border'}
                    size={18}
                    color={bookmarkedMessages.has(message.id) ? colors.accentPositive : colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.messageContent}>
              {message.role === 'assistant' ? (
                <View>
                  {formatMessageContent(message.content)}
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
                <MaterialIcons name="chat-bubble" size={20} color={colors.accentPositive} />
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
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask anything"
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage()}
            blurOnSubmit={false}
          />
          
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
              color={inputText.trim() ? colors.accentPositive : colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
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
    gap: 12,
  },
  suggestionChip: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  suggestionText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
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
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: colors.bgPrimary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    maxHeight: 100,
    padding: 0,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButton: {
    opacity: 0.5,
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
  bookmarkButton: {
    marginLeft: 'auto',
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});

export default ChatInterface;
