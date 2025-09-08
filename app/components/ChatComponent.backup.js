import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { makeApiRequest } from '../services/apiKeyService';

const ChatComponent = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (loading || inputText.trim() === '') return;

    const userMessage = { role: 'user', content: inputText };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const response = await makeApiRequest('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMessage.content }),
      });

      const { content } = await response.json();
      const aiMessage = { role: 'ai', content };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.chatArea}>
        {messages.map((msg, index) => (
          <Text key={index} style={msg.role === 'user' ? styles.userText : styles.aiText}>
            {msg.content}
          </Text>
        ))}
      </ScrollView>
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message"
          placeholderTextColor="#adb5bd"
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={loading}>
          <Text style={styles.sendButtonText}>{loading ? '...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#263238',
  },
  chatArea: {
    flex: 1,
    marginBottom: 10,
  },
  userText: {
    color: '#4caf50',
    marginVertical: 5,
    textAlign: 'right',
  },
  aiText: {
    color: '#ffffff',
    marginVertical: 5,
    textAlign: 'left',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#cccccc',
  },
  input: {
    flex: 1,
    color: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sendButton: {
    backgroundColor: '#00acc1',
    padding: 10,
    borderRadius: 5,
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default ChatComponent;
