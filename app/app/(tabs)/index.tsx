import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';

export default function App() {
  const [isAIOverlayVisible, setIsAIOverlayVisible] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);

  const handleAIClick = (newsItem: any) => {
    setSelectedNews(newsItem);
    setIsAIOverlayVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Integra Markets</Text>
        <TouchableOpacity>
          <MaterialIcons name="notifications-none" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.newsCard}>
          <Text style={styles.newsDate}>Today</Text>
          <Text style={styles.newsTitle}>Sample News Article</Text>
          <Text style={styles.newsContent}>This is a sample news article for testing the Integra Markets app.</Text>
          
          <TouchableOpacity 
            style={styles.aiButton}
            onPress={() => handleAIClick({ title: 'Sample News', content: 'Sample content' })}
          >
            <MaterialIcons name="auto-awesome" size={20} color={colors.tint} />
            <Text style={styles.aiButtonText}>AI Analysis</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  newsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  newsDate: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  newsTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  newsContent: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  aiButtonText: {
    marginLeft: 8,
    color: colors.tint,
    fontWeight: '600',
  },
});