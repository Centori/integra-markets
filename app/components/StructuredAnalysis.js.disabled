import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import SourceTag from './SourceTag';
import MarkdownMessage from './MarkdownMessage';

/**
 * StructuredAnalysis Component
 * Renders AI analysis in a structured format with sections, bullet points, and source citations
 */
const StructuredAnalysis = ({ 
  analysis, 
  isDarkMode = false,
  onBookmark,
  showActions = true 
}) => {
  // Extract different sections from analysis data
  const {
    summary,
    introduction,
    price_trends = [],
    supply_demand = [],
    geopolitical = [],
    technical_indicators = [],
    market_outlook = [],
    predictions = {},
    sources = [],
    confidence,
    timestamp
  } = analysis || {};

  // Helper function to render bullet points with sources
  const renderBulletPoint = (item, index) => {
    const content = typeof item === 'string' ? item : item.text;
    const itemSources = typeof item === 'object' ? item.sources : [];
    
    return (
      <View key={index} style={styles.bulletContainer}>
        <Text style={[styles.bulletPoint, isDarkMode && styles.darkText]}>•</Text>
        <View style={styles.bulletContent}>
          <Text style={[styles.bulletText, isDarkMode && styles.darkText]}>
            {content}
          </Text>
          {itemSources && itemSources.length > 0 && (
            <View style={styles.sourceTags}>
              {itemSources.map((source, idx) => (
                <SourceTag key={idx} source={source} isDarkMode={isDarkMode} />
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Helper function to render a section
  const renderSection = (title, items) => {
    if (!items || items.length === 0) return null;
    
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
          {title}
        </Text>
        {items.map((item, index) => renderBulletPoint(item, index))}
      </View>
    );
  };

  // Share functionality
  const handleShare = async () => {
    try {
      const message = `Market Analysis${summary ? ': ' + summary : ''}`;
      await Share.share({
        message,
        title: 'Integra Markets Analysis',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    let textToCopy = '';
    if (summary) textToCopy += summary + '\n\n';
    if (introduction) textToCopy += introduction + '\n\n';
    
    // Add all sections
    if (price_trends.length) {
      textToCopy += 'Price Trends:\n';
      price_trends.forEach(item => {
        const text = typeof item === 'string' ? item : item.text;
        textToCopy += `• ${text}\n`;
      });
      textToCopy += '\n';
    }
    
    await Clipboard.setStringAsync(textToCopy);
  };

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Introduction/Summary */}
      {(summary || introduction) && (
        <View style={styles.introSection}>
          {summary && (
            <Text style={[styles.summaryText, isDarkMode && styles.darkText]}>
              {summary}
            </Text>
          )}
          {introduction && introduction !== summary && (
            <MarkdownMessage 
              content={introduction} 
              isUser={false} 
              isDarkMode={isDarkMode} 
            />
          )}
        </View>
      )}

      {/* Confidence Score */}
      {confidence && (
        <View style={styles.confidenceContainer}>
          <Text style={[styles.confidenceLabel, isDarkMode && styles.darkText]}>
            Confidence Level: 
          </Text>
          <View style={styles.confidenceBar}>
            <View 
              style={[
                styles.confidenceFill,
                { width: `${confidence * 100}%` },
                confidence > 0.7 ? styles.highConfidence : 
                confidence > 0.4 ? styles.mediumConfidence : styles.lowConfidence
              ]} 
            />
          </View>
          <Text style={[styles.confidenceValue, isDarkMode && styles.darkText]}>
            {(confidence * 100).toFixed(0)}%
          </Text>
        </View>
      )}

      {/* Price and Market Trends */}
      {renderSection('Price and Market Trends', price_trends)}

      {/* Supply and Demand */}
      {renderSection('Supply and Demand Factors', supply_demand)}

      {/* Technical Indicators */}
      {technical_indicators.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
            Technical Indicators
          </Text>
          <View style={styles.indicatorsGrid}>
            {technical_indicators.map((indicator, index) => (
              <View key={index} style={[styles.indicatorCard, isDarkMode && styles.darkIndicatorCard]}>
                <Text style={[styles.indicatorName, isDarkMode && styles.darkText]}>
                  {indicator.name}
                </Text>
                <Text style={[styles.indicatorValue, isDarkMode && styles.darkAccent]}>
                  {indicator.value}
                </Text>
                {indicator.signal && (
                  <Text style={[
                    styles.indicatorSignal,
                    indicator.signal === 'bullish' ? styles.bullishSignal : 
                    indicator.signal === 'bearish' ? styles.bearishSignal : styles.neutralSignal
                  ]}>
                    {indicator.signal.toUpperCase()}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Geopolitical Factors */}
      {renderSection('Geopolitical and External Influences', geopolitical)}

      {/* Market Outlook */}
      {renderSection('Market Outlook', market_outlook)}

      {/* Price Predictions */}
      {predictions && Object.keys(predictions).length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
            Price Predictions
          </Text>
          <View style={styles.predictionsContainer}>
            {Object.entries(predictions).map(([timeframe, data], index) => (
              <View key={index} style={[styles.predictionCard, isDarkMode && styles.darkPredictionCard]}>
                <Text style={[styles.predictionTimeframe, isDarkMode && styles.darkText]}>
                  {timeframe}
                </Text>
                <Text style={[styles.predictionPrice, isDarkMode && styles.darkAccent]}>
                  ${typeof data === 'number' ? data.toFixed(2) : data.price || data}
                </Text>
                {data.confidence && (
                  <Text style={[styles.predictionConfidence, isDarkMode && styles.darkSubtext]}>
                    {(data.confidence * 100).toFixed(0)}% confidence
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {showActions && (
        <View style={[styles.actionBar, isDarkMode && styles.darkActionBar]}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={isDarkMode ? '#8E8E93' : '#666'} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
            <Ionicons name="copy-outline" size={20} color={isDarkMode ? '#8E8E93' : '#666'} />
          </TouchableOpacity>
          
          {onBookmark && (
            <TouchableOpacity style={styles.actionButton} onPress={onBookmark}>
              <Ionicons name="bookmark-outline" size={20} color={isDarkMode ? '#8E8E93' : '#666'} />
            </TouchableOpacity>
          )}
          
          <View style={styles.spacer} />
          
          {timestamp && (
            <Text style={[styles.timestamp, isDarkMode && styles.darkSubtext]}>
              {new Date(timestamp).toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}

      {/* Sources Footer */}
      {sources && sources.length > 0 && (
        <View style={styles.sourcesFooter}>
          <Text style={[styles.sourcesTitle, isDarkMode && styles.darkSubtext]}>
            Sources:
          </Text>
          <View style={styles.sourcesList}>
            {sources.map((source, index) => (
              <SourceTag key={index} source={source} isDarkMode={isDarkMode} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  darkContainer: {
    backgroundColor: '#2C2C2E',
  },
  introSection: {
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 12,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  bulletContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
    marginTop: 2,
    minWidth: 16,
  },
  bulletContent: {
    flex: 1,
  },
  bulletText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  sourceTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  confidenceBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  highConfidence: {
    backgroundColor: '#4CAF50',
  },
  mediumConfidence: {
    backgroundColor: '#FFC107',
  },
  lowConfidence: {
    backgroundColor: '#FF5252',
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    minWidth: 40,
    textAlign: 'right',
  },
  indicatorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  indicatorCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    margin: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  darkIndicatorCard: {
    backgroundColor: '#1C1C1E',
  },
  indicatorName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  indicatorValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  indicatorSignal: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bullishSignal: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  bearishSignal: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
  },
  neutralSignal: {
    backgroundColor: '#FFF3E0',
    color: '#E65100',
  },
  predictionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  predictionCard: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    margin: 6,
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#4A9EFF',
  },
  darkPredictionCard: {
    backgroundColor: '#1E3A5F',
    borderColor: '#4A9EFF',
  },
  predictionTimeframe: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  predictionPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A9EFF',
    marginBottom: 2,
  },
  predictionConfidence: {
    fontSize: 11,
    color: '#999',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  darkActionBar: {
    borderTopColor: '#3A3A3C',
  },
  actionButton: {
    padding: 8,
    marginRight: 16,
  },
  spacer: {
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  sourcesFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sourcesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  sourcesTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  darkText: {
    color: '#ffffff',
  },
  darkSubtext: {
    color: '#8E8E93',
  },
  darkAccent: {
    color: '#4A9EFF',
  },
});

export default StructuredAnalysis;
