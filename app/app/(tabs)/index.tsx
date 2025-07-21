import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import NewsCard from '../../components/NewsCard';
import AIAnalysisOverlay from '../../components/AIAnalysisOverlay';
import Colors from '@/constants/colors';

export default function FeedScreen() {
  const [isAIOverlayVisible, setIsAIOverlayVisible] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);

  const handleAIClick = (newsItem) => {
    setSelectedNews(newsItem);
    setIsAIOverlayVisible(true);
  };

  return (
    <View style={styles.container}>
      <NewsCard onAIClick={handleAIClick} />
      
      <AIAnalysisOverlay 
        isVisible={isAIOverlayVisible}
        onClose={() => setIsAIOverlayVisible(false)}
        news={selectedNews}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
});