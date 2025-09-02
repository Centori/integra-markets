import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Image,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { api } from '../services/apiClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Array<{
    type: 'image' | 'document';
    uri: string;
    name: string;
  }>;
  feedback?: 'like' | 'dislike';
  toolResults?: any[];
}

interface AIChatInterfaceProps {
  newsContext?: {
    title: string;
    summary: string;
    source: string;
  };
  commodity?: string;
  onClose?: () => void;
}

// Share Modal Component
const ShareModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  messages: Message[];
}> = ({ visible, onClose, messages }) => {
  const shareConversation = async () => {
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'You' : 'Integra AI'}: ${m.content}`)
      .join('\n\n');
    
    try {
      await Share.share({
        message: conversationText,
        title: 'Integra AI Conversation',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share conversation');
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.shareModalOverlay}>
        <View style={styles.shareModalContent}>
          <View style={styles.shareModalHeader}>
            <Text style={styles.shareModalTitle}>Share Conversation</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#ECECEC" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.shareOption} onPress={shareConversation}>
            <Ionicons name="share-outline" size={24} color="#4ECCA3" />
            <Text style={styles.shareOptionText}>Share as Text</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareOption}>
            <MaterialIcons name="link" size={24} color="#4ECCA3" />
            <Text style={styles.shareOptionText}>Copy Link</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareOption}>
            <MaterialIcons name="email" size={24} color="#4ECCA3" />
            <Text style={styles.shareOptionText}>Email Conversation</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Message Bubble Component
const MessageBubble: React.FC<{
  message: Message;
  onFeedback: (messageId: string, feedback: 'like' | 'dislike') => void;
  onSpeak: (text: string) => void;
}> = ({ message, onFeedback, onSpeak }) => {
  const isUser = message.role === 'user';
  const [showActions, setShowActions] = useState(false);

  const copyToClipboard = () => {
    Clipboard.setString(message.content);
    Alert.alert('Copied', 'Message copied to clipboard');
  };

  const formatContent = (content: string) => {
    // Simple formatting for bullet points and numbered lists
    const lines = content.split('\n');
    return lines.map((line, index) => {
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      const isNumbered = /^\d+\./.test(line.trim());
      
      return (
        <Text key={index} style={[
          styles.messageText,
          (isBullet || isNumbered) && styles.listItem
        ]}>
          {line}
        </Text>
      );
    });
  };

  return (
    <Animated.View style={[styles.messageBubbleContainer, isUser && styles.userMessageContainer]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <View style={styles.aiAvatarInner}>
            <MaterialIcons name="auto-awesome" size={16} color="#4ECCA3" />
          </View>
        </View>
      )}
      
      <TouchableOpacity 
        style={[styles.messageBubble, isUser ? styles.userMessage : styles.aiMessage]}
        onLongPress={() => setShowActions(!showActions)}
        activeOpacity={0.8}
      >
        <View style={styles.messageContent}>
          {formatContent(message.content)}
          
          {message.attachments && message.attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {message.attachments.map((attachment, index) => (
                <View key={index} style={styles.attachmentItem}>
                  {attachment.type === 'image' ? (
                    <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />
                  ) : (
                    <View style={styles.documentAttachment}>
                      <MaterialIcons name="description" size={24} color="#4ECCA3" />
                      <Text style={styles.documentName}>{attachment.name}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
        
        <Text style={styles.messageTime}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>
      
      {!isUser && showActions && (
        <View style={styles.messageActions}>
          <TouchableOpacity style={styles.actionButton} onPress={copyToClipboard}>
            <MaterialIcons name="content-copy" size={18} color="#A0A0A0" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => onSpeak(message.content)}>
            <MaterialIcons name="volume-up" size={18} color="#A0A0A0" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, message.feedback === 'like' && styles.activeAction]}
            onPress={() => onFeedback(message.id, 'like')}
          >
            <MaterialIcons name="thumb-up" size={18} color={message.feedback === 'like' ? '#4ECCA3' : '#A0A0A0'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, message.feedback === 'dislike' && styles.activeAction]}
            onPress={() => onFeedback(message.id, 'dislike')}
          >
            <MaterialIcons name="thumb-down" size={18} color={message.feedback === 'dislike' ? '#F05454' : '#A0A0A0'} />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

// Main Chat Interface Component
const AIChatInterface: React.FC<AIChatInterfaceProps> = ({ newsContext, commodity, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    // Initialize with welcome message
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: newsContext 
        ? `I'm analyzing the article: "${newsContext.title}". What would you like to know about this news and its potential market impact?`
        : `Hello! I'm your AI commodity analyst powered by advanced reasoning. I can help you analyze ${commodity || 'commodity'} markets, provide insights, and answer your questions. What would you like to explore today?`,
      timestamp: new Date(),
    };
    
    setMessages([welcomeMessage]);
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [newsContext, commodity]);

  const sendMessage = async (additionalContext?: string) => {
    const messageText = additionalContext || inputText.trim();
    if (!messageText && attachments.length === 0) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputText('');
    setAttachments([]);
    setLoading(true);

    try {
      // Call the AI analysis endpoint
      const response = await api.post('/ai/chat', {
        messages: [...messages, newUserMessage].map(m => ({
          role: m.role,
          content: m.content,
        })),
        commodity,
        available_tools: ['search_commodity_news', 'analyze_price_data', 'get_weather_impact'],
      });

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response || response.data.content || 'I apologize, but I encountered an error processing your request.',
        timestamp: new Date(),
        toolResults: response.data.tool_results,
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or check your connection.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  const handleQuickAction = (action: string) => {
    let prompt = '';
    switch (action) {
      case 'strategy':
        prompt = `Advise me a strategy based on this ${commodity || 'commodity'} news and current market conditions.`;
        break;
      case 'hedging':
        prompt = `Suggest hedging and risk management models for ${commodity || 'commodity'} exposure.`;
        break;
      case 'technicals':
        prompt = `What are the key technical levels to watch for ${commodity || 'commodity'}?`;
        break;
      case 'correlation':
        prompt = `Analyze correlations between ${commodity || 'commodity'} and related markets.`;
        break;
    }
    sendMessage(prompt);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setAttachments(prev => [...prev, {
        type: 'image',
        uri: result.assets[0].uri,
        name: 'image.jpg',
      }]);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/*'],
    });

    if (result.type === 'success') {
      setAttachments(prev => [...prev, {
        type: 'document',
        uri: result.uri,
        name: result.name,
      }]);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    
    // Here you would typically transcribe the audio
    // For now, we'll just show a placeholder
    setInputText('(Voice message transcription would appear here)');
  };

  const handleFeedback = (messageId: string, feedback: 'like' | 'dislike') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback } : msg
    ));
  };

  const speakMessage = (text: string) => {
    Speech.speak(text, {
      language: 'en',
      pitch: 1,
      rate: 0.9,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton}>
          <MaterialIcons name="menu" size={24} color="#ECECEC" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Integra AI</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={() => setShowShareModal(true)}>
            <Ionicons name="share-outline" size={24} color="#ECECEC" />
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="close" size={24} color="#ECECEC" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Chat Messages */}
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onFeedback={handleFeedback}
                onSpeak={speakMessage}
              />
            ))}
            {loading && (
              <View style={styles.loadingContainer}>
                <View style={styles.aiAvatar}>
                  <ActivityIndicator size="small" color="#4ECCA3" />
                </View>
                <View style={styles.typingIndicator}>
                  <Text style={styles.typingText}>Integra AI is thinking...</Text>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Quick Actions */}
        <ScrollView 
          horizontal 
          style={styles.quickActionsContainer}
          showsHorizontalScrollIndicator={false}
        >
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('strategy')}
          >
            <MaterialIcons name="trending-up" size={14} color="#4ECCA3" />
            <Text style={styles.quickActionText}>Trading strategy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('hedging')}
          >
            <MaterialIcons name="shield" size={14} color="#4ECCA3" />
            <Text style={styles.quickActionText}>Risk & hedging</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('technicals')}
          >
            <MaterialIcons name="show-chart" size={14} color="#4ECCA3" />
            <Text style={styles.quickActionText}>Key levels</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('correlation')}
          >
            <MaterialIcons name="sync-alt" size={14} color="#4ECCA3" />
            <Text style={styles.quickActionText}>Correlations</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <ScrollView horizontal style={styles.attachmentsPreview}>
            {attachments.map((attachment, index) => (
              <View key={index} style={styles.attachmentPreviewItem}>
                {attachment.type === 'image' ? (
                  <Image source={{ uri: attachment.uri }} style={styles.attachmentThumbnail} />
                ) : (
                  <View style={styles.documentPreview}>
                    <MaterialIcons name="description" size={20} color="#4ECCA3" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeAttachment}
                  onPress={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                >
                  <MaterialIcons name="close" size={16} color="#ECECEC" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.plusButton} onPress={() => {
            Alert.alert(
              'Add Attachment',
              'Choose what to attach',
              [
                { text: 'Photo', onPress: pickImage },
                { text: 'Document', onPress: pickDocument },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }}>
            <MaterialIcons name="add" size={24} color="#ECECEC" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message Integra AI..."
            placeholderTextColor="#666666"
            multiline
            maxHeight={100}
            onSubmitEditing={() => sendMessage()}
          />
          
          {inputText.trim() || attachments.length > 0 ? (
            <TouchableOpacity 
              style={[styles.sendButton, loading && styles.disabledButton]}
              onPress={() => sendMessage()}
              disabled={loading}
            >
              <Feather name="send" size={20} color="#000000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.voiceButton}
              onPressIn={startRecording}
              onPressOut={stopRecording}
            >
              <MaterialIcons 
                name={isRecording ? "mic" : "mic-none"} 
                size={24} 
                color={isRecording ? "#F05454" : "#ECECEC"} 
              />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Share Modal */}
      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        messages={messages}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ECECEC',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  aiAvatarInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 12,
    padding: 12,
  },
  userMessage: {
    backgroundColor: '#2a2a2a',
    marginLeft: 40,
  },
  aiMessage: {
    backgroundColor: 'rgba(78, 204, 163, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(78, 204, 163, 0.3)',
    flex: 1,
  },
  messageContent: {
    gap: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#ECECEC',
    lineHeight: 20,
  },
  listItem: {
    marginLeft: 16,
    marginVertical: 2,
  },
  messageTime: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  messageActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
    marginTop: 4,
  },
  actionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
  },
  activeAction: {
    backgroundColor: '#2a2a2a',
  },
  attachmentsContainer: {
    marginTop: 8,
    gap: 8,
  },
  attachmentItem: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  documentAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  documentName: {
    color: '#ECECEC',
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  typingIndicator: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 12,
    flex: 1,
  },
  typingText: {
    color: '#666666',
    fontSize: 14,
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(78, 204, 163, 0.2)',
  },
  quickActionText: {
    color: '#A0A0A0',
    fontSize: 12,
    fontWeight: '400',
  },
  attachmentsPreview: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 80,
  },
  attachmentPreviewItem: {
    position: 'relative',
    marginRight: 8,
  },
  attachmentThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  documentPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAttachment: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#F05454',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    gap: 12,
  },
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#ECECEC',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4ECCA3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  shareModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  shareModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ECECEC',
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
  },
  shareOptionText: {
    fontSize: 16,
    color: '#ECECEC',
  },
});

export default AIChatInterface;
