import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { api } from '../services/apiClient';

// Tool selection modal
const ToolSelectionModal = ({ visible, onClose, tools, selectedTools, onToggleTool }) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <BlurView intensity={100} style={styles.modalBackground}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>AI Tools & Features</Text>
          
          {tools.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={styles.toolItem}
              onPress={() => onToggleTool(tool.id)}
            >
              <View style={styles.toolInfo}>
                <Ionicons 
                  name={tool.icon} 
                  size={24} 
                  color={selectedTools.includes(tool.id) ? '#4CAF50' : '#666'}
                />
                <View style={styles.toolText}>
                  <Text style={styles.toolName}>{tool.name}</Text>
                  <Text style={styles.toolDescription}>{tool.description}</Text>
                </View>
              </View>
              <Ionicons 
                name={selectedTools.includes(tool.id) ? 'checkbox' : 'square-outline'} 
                size={24} 
                color={selectedTools.includes(tool.id) ? '#4CAF50' : '#666'}
              />
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
};

// Message component with enhanced features
const MessageBubble = ({ message, isUser }) => {
  const [expanded, setExpanded] = useState(false);
  
  const renderContent = () => {
    if (message.type === 'text') {
      return <Text style={styles.messageText}>{message.content}</Text>;
    }
    
    if (message.type === 'analysis') {
      return (
        <View>
          <Text style={styles.messageText}>{message.content}</Text>
          {message.data && (
            <View style={styles.analysisData}>
              <Text style={styles.analysisTitle}>Analysis Results:</Text>
              <Text style={styles.analysisSentiment}>
                Sentiment: {message.data.sentiment} ({(message.data.confidence * 100).toFixed(1)}%)
              </Text>
              {message.data.predictions && (
                <View style={styles.predictions}>
                  <Text style={styles.predictionTitle}>Price Predictions:</Text>
                  {Object.entries(message.data.predictions).map(([timeframe, value]) => (
                    <Text key={timeframe} style={styles.predictionItem}>
                      {timeframe}: ${value.toFixed(2)}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      );
    }
    
    if (message.type === 'tool_result') {
      return (
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <View style={styles.toolResult}>
            <Ionicons name="construct" size={16} color="#666" />
            <Text style={styles.toolResultTitle}>{message.tool} Result</Text>
            <Ionicons 
              name={expanded ? 'chevron-up' : 'chevron-down'} 
              size={16} 
              color="#666"
            />
          </View>
          {expanded && (
            <View style={styles.toolResultContent}>
              <Text style={styles.toolResultData}>
                {JSON.stringify(message.data, null, 2)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }
    
    return <Text style={styles.messageText}>{message.content}</Text>;
  };
  
  return (
    <View style={[
      styles.messageBubble,
      isUser ? styles.userMessage : styles.aiMessage
    ]}>
      {renderContent()}
      <Text style={styles.messageTime}>
        {new Date(message.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );
};

export default function AIChatInterface({ commodity = null, onInsightGenerated }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [selectedTools, setSelectedTools] = useState(['search_commodity_news', 'analyze_price_data']);
  const [responseMode, setResponseMode] = useState('reasoning'); // reasoning, json, tools
  const scrollViewRef = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const availableTools = [
    {
      id: 'search_commodity_news',
      name: 'News Search',
      description: 'Search latest commodity news',
      icon: 'newspaper-outline'
    },
    {
      id: 'analyze_price_data',
      name: 'Price Analysis',
      description: 'Analyze price trends and predictions',
      icon: 'trending-up'
    },
    {
      id: 'execute_analysis_code',
      name: 'Code Execution',
      description: 'Run custom analysis code',
      icon: 'code-slash'
    },
    {
      id: 'get_weather_impact',
      name: 'Weather Impact',
      description: 'Analyze weather effects on commodities',
      icon: 'cloudy-outline'
    },
    {
      id: 'web_search',
      name: 'Web Search',
      description: 'Search the web for information',
      icon: 'globe-outline'
    }
  ];
  
  useEffect(() => {
    // Welcome message
    setMessages([{
      id: '1',
      type: 'text',
      content: `Welcome! I'm your AI commodity analyst powered by Groq. I can help you analyze ${commodity || 'commodity'} markets with advanced reasoning and real-time data. What would you like to know?`,
      isUser: false,
      timestamp: new Date()
    }]);
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [commodity]);
  
  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      type: 'text',
      content: inputText,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    
    try {
      let response;
      
      if (responseMode === 'reasoning') {
        // Use reasoning mode
        response = await api.post('/ai/analyze', {
          query: inputText,
          commodity: commodity,
          use_tools: selectedTools.length > 0,
          search_web: selectedTools.includes('web_search')
        });
        
        // Add reasoning message
        if (response.reasoning) {
          setMessages(prev => [...prev, {
            id: Date.now().toString() + '-reasoning',
            type: 'text',
            content: `**Reasoning Process:**\n${response.reasoning}`,
            isUser: false,
            timestamp: new Date()
          }]);
        }
        
        // Add analysis result
        const analysisMessage = {
          id: Date.now().toString() + '-analysis',
          type: 'analysis',
          content: response.analysis.summary || 'Analysis complete',
          data: response.analysis,
          isUser: false,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, analysisMessage]);
        
        // Notify parent component
        if (onInsightGenerated && response.analysis) {
          onInsightGenerated({
            type: 'ai_analysis',
            data: response.analysis,
            timestamp: new Date()
          });
        }
        
      } else if (responseMode === 'tools') {
        // Use chat with tools
        const chatMessages = messages
          .filter(m => m.type === 'text')
          .map(m => ({
            role: m.isUser ? 'user' : 'assistant',
            content: m.content
          }));
        
        chatMessages.push({ role: 'user', content: inputText });
        
        response = await api.post('/ai/chat', {
          messages: chatMessages,
          available_tools: selectedTools
        });
        
        // Add tool results if any
        if (response.tool_results && response.tool_results.length > 0) {
          response.tool_results.forEach(result => {
            setMessages(prev => [...prev, {
              id: Date.now().toString() + '-tool-' + result.tool_name,
              type: 'tool_result',
              tool: result.tool_name,
              data: result.data,
              isUser: false,
              timestamp: new Date()
            }]);
          });
        }
        
        // Add AI response
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '-response',
          type: 'text',
          content: response.response,
          isUser: false,
          timestamp: new Date()
        }]);
        
      } else {
        // Simple chat mode
        response = await api.post('/ai/chat', {
          messages: [{ role: 'user', content: inputText }],
          commodity: commodity,
          mode: responseMode
        });
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'text',
          content: response.response || response.content,
          isUser: false,
          timestamp: new Date()
        }]);
      }
      
    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'text',
        content: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };
  
  const toggleTool = (toolId) => {
    setSelectedTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };
  
  const suggestedQueries = [
    `What's the outlook for ${commodity || 'oil'} prices?`,
    `Analyze recent ${commodity || 'gold'} market trends`,
    `How will weather affect ${commodity || 'wheat'} supply?`,
    `Generate a technical analysis for ${commodity || 'commodities'}`
  ];
  
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Analysis Assistant</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.modeButton}
            onPress={() => setShowTools(true)}
          >
            <Ionicons name="construct" size={20} color="#666" />
            <Text style={styles.modeButtonText}>
              Tools ({selectedTools.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modeButton}
            onPress={() => {
              const modes = ['reasoning', 'tools', 'json'];
              const currentIndex = modes.indexOf(responseMode);
              setResponseMode(modes[(currentIndex + 1) % modes.length]);
            }}
          >
            <Ionicons 
              name={responseMode === 'reasoning' ? 'bulb' : responseMode === 'tools' ? 'construct' : 'code-slash'} 
              size={20} 
              color="#666" 
            />
            <Text style={styles.modeButtonText}>{responseMode}</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message} 
            isUser={message.isUser}
          />
        ))}
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        )}
      </ScrollView>
      
      {messages.length === 1 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsContainer}
        >
          {suggestedQueries.map((query, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionChip}
              onPress={() => setInputText(query)}
            >
              <Text style={styles.suggestionText}>{query}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about market trends, analysis, predictions..."
          placeholderTextColor="#999"
          multiline
          maxHeight={100}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={loading}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
      
      <ToolSelectionModal
        visible={showTools}
        onClose={() => setShowTools(false)}
        tools={availableTools}
        selectedTools={selectedTools}
        onToggleTool={toggleTool}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    gap: 4,
  },
  modeButtonText: {
    fontSize: 12,
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 100,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
    marginLeft: '20%',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    marginRight: '20%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  analysisData: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  analysisSentiment: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  predictions: {
    marginTop: 8,
  },
  predictionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  predictionItem: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  toolResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  toolResultTitle: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  toolResultContent: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  toolResultData: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#666',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  suggestionsContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  toolText: {
    flex: 1,
  },
  toolName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  toolDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
});
