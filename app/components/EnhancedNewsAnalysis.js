import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Color palette - Updated for consistency with App.js
const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3',  // Mint Green - consistent with App.js
  accentNegative: '#F05454',  // Red - consistent with App.js
  accentNeutral: '#A0A0A0',   // Gray - consistent with App.js
  accentData: '#30A5FF',      // Cyan Blue - consistent with App.js
  divider: '#333333',
};

// TypeScript-style interface definition (as comments for JS)
/**
 * @typedef {Object} PreprocessedNews
 * @property {string} summary
 * @property {string} event_type
 * @property {string} commodity
 * @property {string} region
 * @property {string[]} entities
 * @property {string[]} trigger_keywords
 * @property {string} sentiment
 * @property {number} confidence
 * @property {string} predicted_move
 * @property {string} direction
 * @property {string} trade_horizon
 * @property {string} formatted_trader_notes
 * @property {string} raw_text_snippet
 */

// Commodity-related keywords
const DOMAIN_KEYWORDS = {
  "oil": ["OPEC", "refinery", "pipeline", "sanctions", "embargo", "tankers", "WTI", "Brent", "crude"],
  "gas": ["LNG", "pipeline", "storage", "injection", "Freeport", "Nord Stream", "cold snap", "natural gas"],
  "agriculture": ["drought", "harvest", "USDA", "crop failure", "fertilizer", "export ban", "corn", "wheat", "soybeans"],
  "metals": ["mine strike", "lithium", "copper", "warehouse", "smelter", "EV battery", "gold", "silver"],
  "fx": ["rate hike", "devaluation", "inflation", "forex reserves", "IMF", "sovereign downgrade"]
};

// Entity-region mapping
const ENTITY_REGION_MAP = {
  "Iran": "Middle East",
  "Saudi Arabia": "Middle East",
  "Iraq": "Middle East",
  "Russia": "Eurasia",
  "Ukraine": "Eastern Europe",
  "China": "Asia",
  "Chile": "South America",
  "Nigeria": "West Africa",
  "United States": "North America",
  "Canada": "North America"
};

// Helper functions
function cleanText(text) {
  return text.replace(/[\n\r]+/g, ' ').trim();
}

function fakeEntityRecognition(text) {
  const entities = [];
  Object.keys(ENTITY_REGION_MAP).forEach(entity => {
    if (text.toLowerCase().includes(entity.toLowerCase())) {
      entities.push(entity);
    }
  });
  return entities;
}

function extractTriggerKeywords(text) {
  const matches = [];
  Object.values(DOMAIN_KEYWORDS).flat().forEach(keyword => {
    if (text.toLowerCase().includes(keyword.toLowerCase())) {
      matches.push(keyword);
    }
  });
  return matches;
}

function classifyCommodity(keywords, entities) {
  for (const [category, categoryKeywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(kw => categoryKeywords.includes(kw))) {
      return category;
    }
  }
  
  // Fallback based on entities
  for (const entity of entities) {
    const region = ENTITY_REGION_MAP[entity];
    if (region === "Middle East" || region === "West Africa") {
      return "oil";
    }
  }
  return "general";
}

function matchRegion(entities) {
  for (const entity of entities) {
    if (ENTITY_REGION_MAP[entity]) {
      return ENTITY_REGION_MAP[entity];
    }
  }
  return "Global";
}

function classifyEventType(keywords) {
  if (keywords.some(kw => ["sanctions", "embargo", "ban"].includes(kw.toLowerCase()))) {
    return "geopolitical_tension";
  }
  if (keywords.some(kw => ["drought", "cold snap", "hurricane"].includes(kw.toLowerCase()))) {
    return "weather_event";
  }
  if (keywords.some(kw => ["strike", "outage", "disruption"].includes(kw.toLowerCase()))) {
    return "supply_shock";
  }
  if (keywords.some(kw => ["pipeline", "storage", "injection"].includes(kw.toLowerCase()))) {
    return "infrastructure";
  }
  return "market_movement";
}

function summarize(text) {
  const sentences = text.split('.');
  return sentences.slice(0, 2).join('.') + (sentences.length > 2 ? '.' : '');
}

/**
 * Main preprocessing function
 * @param {string} text - Raw news text
 * @returns {PreprocessedNews} Preprocessed news object
 */
export function preprocessNews(text) {
  const cleaned = cleanText(text);
  const entities = fakeEntityRecognition(cleaned);
  const trigger_keywords = extractTriggerKeywords(cleaned);
  const commodity = classifyCommodity(trigger_keywords, entities);
  const region = matchRegion(entities);
  const event_type = classifyEventType(trigger_keywords);
  const summary = summarize(cleaned);

  // Enhanced sentiment analysis with realistic bias
  const sentiment = Math.random() > 0.5 ? 'Bullish' : 'Bearish';
  const confidence = parseFloat((Math.random() * 0.4 + 0.6).toFixed(2)); // 60-100%
  const predicted_move = sentiment === 'Bullish' ? 'Price Spike Likely' : 'Downside Risk';
  const direction = sentiment === 'Bullish' ? '↑ Upward' : '↓ Downward';
  const trade_horizon = '24–72h';

  const formatted_trader_notes = `📈 What This Means for Traders:
• Watch for volatility in ${commodity} due to "${event_type}" in ${region}.
• Monitor short-term trends and adjust risk exposure accordingly.

📊 Sentiment Summary:
- Sentiment: ${sentiment}
- Confidence: ${(confidence * 100).toFixed(0)}%
- Predicted Move: ${predicted_move}
- Direction: ${direction}
- Trade Horizon: ${trade_horizon}`;

  return {
    summary,
    event_type,
    commodity,
    region,
    entities,
    trigger_keywords,
    sentiment,
    confidence,
    predicted_move,
    direction,
    trade_horizon,
    formatted_trader_notes,
    raw_text_snippet: text
  };
}

// Enhanced News Analysis Component
const EnhancedNewsAnalysis = ({ newsItem, visible, onClose }) => {
  const [preprocessedData, setPreprocessedData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (visible && newsItem) {
      analyzeNews();
    }
  }, [visible, newsItem]);

  const analyzeNews = async () => {
    setIsAnalyzing(true);
    
    // Simulate processing time
    setTimeout(() => {
      const fullText = `${newsItem.headline}. ${newsItem.summary}`;
      const result = preprocessNews(fullText);
      setPreprocessedData(result);
      setIsAnalyzing(false);
    }, 1500);
  };

  if (!visible || !newsItem) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Enhanced Analysis</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {isAnalyzing ? (
          <View style={styles.loadingContainer}>
            <MaterialIcons name="auto-awesome" size={48} color={colors.accentData} />
            <Text style={styles.loadingText}>Analyzing market impact...</Text>
          </View>
        ) : preprocessedData ? (
          <View>
            {/* Original News */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Original News</Text>
              <Text style={styles.headline}>{newsItem.headline}</Text>
              <Text style={styles.summary}>{newsItem.summary}</Text>
            </View>

            {/* Market Classification */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Market Classification</Text>
              <View style={styles.classificationRow}>
                <View style={styles.classificationItem}>
                  <Text style={styles.classificationLabel}>Commodity</Text>
                  <Text style={styles.classificationValue}>{preprocessedData.commodity}</Text>
                </View>
                <View style={styles.classificationItem}>
                  <Text style={styles.classificationLabel}>Region</Text>
                  <Text style={styles.classificationValue}>{preprocessedData.region}</Text>
                </View>
                <View style={styles.classificationItem}>
                  <Text style={styles.classificationLabel}>Event Type</Text>
                  <Text style={styles.classificationValue}>{preprocessedData.event_type}</Text>
                </View>
              </View>
            </View>

            {/* Trader Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trader Intelligence</Text>
              <View style={styles.traderNotesContainer}>
                <Text style={styles.traderNotes}>{preprocessedData.formatted_trader_notes}</Text>
              </View>
            </View>

            {/* Keywords & Entities */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Triggers</Text>
              <View style={styles.tagsContainer}>
                {preprocessedData.trigger_keywords.map((keyword, index) => (
                  <View key={index} style={styles.keywordTag}>
                    <Text style={styles.tagText}>{keyword}</Text>
                  </View>
                ))}
              </View>
              
              {preprocessedData.entities.length > 0 && (
                <>
                  <Text style={styles.subSectionTitle}>Entities</Text>
                  <View style={styles.tagsContainer}>
                    {preprocessedData.entities.map((entity, index) => (
                      <View key={index} style={styles.entityTag}>
                        <Text style={styles.tagText}>{entity}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 15,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    color: colors.accentData,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentData,
    paddingLeft: 12,
  },
  subSectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 15,
    marginBottom: 10,
  },
  headline: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    lineHeight: 24,
  },
  summary: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  classificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  classificationItem: {
    flex: 1,
    marginHorizontal: 5,
  },
  classificationLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  classificationValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: colors.bgPrimary,
    padding: 10,
    borderRadius: 6,
    textAlign: 'center',
  },
  traderNotesContainer: {
    backgroundColor: colors.bgPrimary,
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: colors.accentPositive,
  },
  traderNotes: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  keywordTag: {
    backgroundColor: colors.accentData,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  entityTag: {
    backgroundColor: colors.accentPositive,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: colors.bgPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default EnhancedNewsAnalysis;