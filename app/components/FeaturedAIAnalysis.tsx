import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface FeaturedAIAnalysisProps {
  analysis: {
    question: string;
    answer: string;
    sources: Array<{ name: string; credibility: number }>;
    relatedQuestions: string[];
  };
  onRelatedQuestionClick: (question: string) => void;
}

interface SourceBadgeProps {
  source: { name: string; credibility: number };
  index: number;
}

const SourceBadge: React.FC<SourceBadgeProps> = ({ source, index }) => {
  const getCredibilityColor = (score: number) => {
    if (score >= 0.90) return '#4ade80';
    if (score >= 0.80) return '#fbbf24';
    return '#ef4444';
  };

  const getCredibilityStars = (score: number) => {
    if (score >= 0.95) return '⭐⭐⭐';
    if (score >= 0.85) return '⭐⭐';
    return '⭐';
  };

  return (
    <TouchableOpacity style={styles.sourceBadge}>
      <Text style={styles.sourceNumber}>[{index + 1}]</Text>
      <Text style={styles.sourceName}>{source.name}</Text>
      <Text style={styles.sourceStars}>{getCredibilityStars(source.credibility)}</Text>
    </TouchableOpacity>
  );
};

const FeaturedAIAnalysis: React.FC<FeaturedAIAnalysisProps> = ({
  analysis,
  onRelatedQuestionClick
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!analysis) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyContent}>
          <MaterialIcons name="auto-awesome" size={48} color="#4ECCA3" />
          <Text style={styles.emptyTitle}>Ask Integra AI</Text>
          <Text style={styles.emptySubtitle}>
            Get instant analysis on commodity markets, trading strategies, and market-moving news
          </Text>
          <View style={styles.sampleQuestions}>
            <Text style={styles.sampleQuestionsTitle}>Try asking:</Text>
            {[
              "What's driving oil prices today?",
              "How does inflation affect gold?",
              "Natural gas forecast for winter"
            ].map((question, index) => (
              <TouchableOpacity
                key={index}
                style={styles.sampleQuestion}
                onPress={() => onRelatedQuestionClick(question)}
              >
                <MaterialIcons name="help" size={14} color="#30A5FF" />
                <Text style={styles.sampleQuestionText}>"{question}"</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.analysisContainer}>
      {/* Header */}
      <View style={styles.analysisHeader}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="auto-awesome" size={20} color="#4ECCA3" />
          <Text style={styles.analysisTitle}>Integra AI Analysis</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.expandButton}
        >
          <MaterialIcons 
            name={isExpanded ? "expand-less" : "expand-more"} 
            size={20} 
            color="#888" 
          />
        </TouchableOpacity>
      </View>

      {isExpanded && (
        <>
          {/* Question */}
          <View style={styles.questionContainer}>
            <MaterialIcons name="help" size={16} color="#30A5FF" />
            <Text style={styles.questionText}>{analysis.question}</Text>
          </View>

          {/* AI Response */}
          <ScrollView style={styles.responseContainer} nestedScrollEnabled>
            <Text style={styles.responseText}>{analysis.answer}</Text>
          </ScrollView>

          {/* Sources */}
          <View style={styles.sourcesContainer}>
            <Text style={styles.sourcesTitle}>Sources:</Text>
            <View style={styles.sourcesGrid}>
              {analysis.sources.map((source, index) => (
                <SourceBadge key={index} source={source} index={index} />
              ))}
            </View>
          </View>

          {/* Related Questions */}
          <View style={styles.relatedQuestionsContainer}>
            <Text style={styles.relatedQuestionsTitle}>Related Questions:</Text>
            <View style={styles.relatedQuestions}>
              {analysis.relatedQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.relatedQuestion}
                  onPress={() => onRelatedQuestionClick(question)}
                >
                  <MaterialIcons name="help" size={14} color="#4ECCA3" />
                  <Text style={styles.relatedQuestionText}>{question}</Text>
                  <MaterialIcons name="north-east" size={14} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Footer Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="share" size={16} color="#888" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="bookmark-border" size={16} color="#888" />
              <Text style={styles.actionText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="refresh" size={16} color="#4ECCA3" />
              <Text style={[styles.actionText, { color: '#4ECCA3' }]}>Regenerate</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Empty state styles
  emptyContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  sampleQuestions: {
    width: '100%',
    gap: 8,
  },
  sampleQuestionsTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  sampleQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#252525',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    gap: 8,
  },
  sampleQuestionText: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
  },

  // Analysis content styles
  analysisContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    padding: 20,
    marginBottom: 24,
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analysisTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  expandButton: {
    padding: 4,
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#252525',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#30A5FF',
  },
  questionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    lineHeight: 24,
  },
  responseContainer: {
    marginBottom: 20,
    maxHeight: 200,
  },
  responseText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
  },
  sourcesContainer: {
    marginBottom: 20,
  },
  sourcesTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  sourcesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    borderRadius: 6,
    padding: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  sourceNumber: {
    color: '#4ECCA3',
    fontSize: 12,
    fontWeight: '600',
  },
  sourceName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  sourceStars: {
    fontSize: 10,
  },
  relatedQuestionsContainer: {
    marginBottom: 20,
  },
  relatedQuestionsTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  relatedQuestions: {
    gap: 8,
  },
  relatedQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#252525',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    gap: 8,
  },
  relatedQuestionText: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  actionText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default FeaturedAIAnalysis;
