import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Send } from 'lucide-react-native';
import Colors from '../constants/colors';
import { useAPIKeys } from '@/providers/APIKeyProvider';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
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
  const { selectedKey, hasAnyKeys } = useAPIKeys();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `I can help you analyze this news article: "${newsContext.title}". What would you like to know?`,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputText.trim() || !hasAnyKeys) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "This is a simulated AI response. In a real implementation, this would connect to your selected AI provider to analyze the news and answer your question.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  if (!hasAnyKeys) {
    return (
      <View style={styles.noKeysContainer}>
        <Text style={styles.noKeysText}>
          Please add an API key to start chatting with AI
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.messagesContainer}>
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.isUser ? styles.userMessage : styles.aiMessage,
            ]}
          >
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        ))}
        {isLoading && (
          <View style={[styles.messageContainer, styles.aiMessage]}>
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about this news..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.disabledButton]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Send color={inputText.trim() ? '#000' : Colors.textSecondary} size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  noKeysContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noKeysText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: Colors.tint,
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: Colors.background,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.tint,
    borderRadius: 20,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});

export default ChatInterface;