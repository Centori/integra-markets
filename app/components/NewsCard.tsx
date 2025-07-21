import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface NewsCardProps {
  onAIClick: (newsItem: any) => void;
}

export default function NewsCard({ onAIClick }: NewsCardProps) {
  const mockNewsItem = {
    title: 'Sample News Title',
    content: 'Sample news content goes here...',
    date: new Date().toLocaleDateString(),
  };

  return (
    <View style={styles.card}>
      <Text style={styles.date}>{mockNewsItem.date}</Text>
      <Text style={styles.title}>{mockNewsItem.title}</Text>
      <Text style={styles.content}>{mockNewsItem.content}</Text>
      
      <TouchableOpacity 
        style={styles.aiButton}
        onPress={() => onAIClick(mockNewsItem)}
      >
        <MaterialIcons name="psychology" size={24} color={Colors.tint} />
        <Text style={styles.aiButtonText}>AI Analysis</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  date: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.text,
  },
  content: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 16,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  aiButtonText: {
    marginLeft: 8,
    color: Colors.tint,
    fontWeight: '600',
  },
});