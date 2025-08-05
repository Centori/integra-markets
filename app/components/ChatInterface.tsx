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

      // Call Groq API with Llama 3
      const response = await groqService.sendMessage(apiMessages, newsContext);

      if (response.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Show error message
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${response.error}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an unexpected error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockResponse = (query: string, context: any): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('impact') || lowerQuery.includes('market')) {
      return "Based on the natural gas storage report, the higher-than-expected inventory build suggests bearish pressure on prices. Traders should monitor storage injection rates closely and consider the seasonal demand patterns. The oversupply situation could persist if production remains strong.";
    } else if (lowerQuery.includes('strategy') || lowerQuery.includes('trade')) {
      return "Given the bearish sentiment, consider: 1) Short positions on natural gas futures with stops above recent highs, 2) Watch for support levels around $2.50-$2.60, 3) Monitor weather forecasts as unexpected cold snaps could reverse the trend, 4) Consider spread trades between different contract months.";
    } else if (lowerQuery.includes('risk') || lowerQuery.includes('concern')) {
      return "Key risks to watch: 1) Weather volatility could quickly shift demand, 2) LNG export levels may affect domestic supply, 3) Production cuts from major basins, 4) Geopolitical events affecting global gas markets. Set appropriate stop losses and consider hedging strategies.";
    } else {
      return "That's an interesting question about the natural gas market. The current oversupply situation reflected in the storage report suggests downward price pressure. Would you like me to elaborate on any specific aspect of this market development?";
    }
  };

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
                  name={message.role === 'user' ? 'person' : 'psychology'} 
                  size={20} 
                  color={message.role === 'user' ? colors.textPrimary : colors.accentPositive} 
                />
              </View>
              <Text style={styles.messageRole}>
                {message.role === 'user' ? 'You' : 'Integra AI'}
              </Text>
            </View>
            <View style={styles.messageContent}>
              <Text style={styles.messageText}>{message.content}</Text>
            </View>
          </View>
        ))}
        
        {isLoading && (
          <View style={[styles.messageWrapper, styles.assistantMessageWrapper]}>
            <View style={styles.messageHeader}>
              <View style={[styles.avatar, styles.assistantAvatar]}>
                <MaterialIcons name="psychology" size={20} color={colors.accentPositive} />
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
});

export default ChatInterface;
