import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface AIResponseFormatterProps {
  content: string;
  sources?: string[];
  isDarkMode?: boolean;
}

const AIResponseFormatter: React.FC<AIResponseFormatterProps> = ({ 
  content, 
  sources = [], 
  isDarkMode = true 
}) => {
  // Check if content is layered analysis format
  const isLayeredFormat = typeof content === 'object' && 
    (content.sentiment_overview || content.primary_analysis);
  
  if (isLayeredFormat) {
    return renderLayeredAnalysis(content, sources, isDarkMode);
  }
  
  // Check if content is already processed by NLTK (legacy)
  const isProcessed = typeof content === 'object' && content.bullet_points;
  
  if (isProcessed) {
    // Use NLTK-processed format
    return renderProcessedContent(content, sources, isDarkMode);
  }
  // Parse the content into sections
  const parseContent = (text: string) => {
    const sections = [];
    let currentSection = { title: '', content: [] as string[] };
    
    // Pre-clean only table-related markdown without affecting bullets/paragraphs
    const cleanedText = text
      .replace(/\|\s*-+\s*\|/g, '') // Remove table dividers like |---|---|
      .replace(/^\|+\s*/gm, '') // Remove leading pipes
      .replace(/\s*\|+$/gm, '') // Remove trailing pipes
      .replace(/\s*\|\s*/g, ' - '); // Replace remaining pipes with dashes
    
    const lines = cleanedText.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip lines that are just table formatting (multiple dashes)
      if (trimmedLine.match(/^[-]{4,}$/) || trimmedLine.match(/^[=-]{4,}$/)) {
        continue;
      }
      
      // Check if it's a section header (has "##" or ends with "Trends", "Factors", etc.)
      if (trimmedLine.match(/^#+\s+/) || 
          trimmedLine.match(/(Price and Market Trends|Supply and Demand|Technical|Geopolitical|Market Outlook|Predictions)/i)) {
        // Save previous section if it has content
        if (currentSection.title || currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        // Start new section
        currentSection = {
          title: trimmedLine.replace(/^#+\s+/, '').trim(),
          content: []
        };
      }
      // Check if it's a bullet point
      else if (trimmedLine.match(/^[•\-\*]\s+/) || trimmedLine.match(/^\d+\.\s+/)) {
        const cleanedPoint = trimmedLine
          .replace(/^[•\-\*]\s+/, '')
          .replace(/^\d+\.\s+/, '')
          .replace(/tradingeconomics.*$/i, '') // Remove inline citations
          .replace(/\+\d+\s*\.?$/, '') // Remove +1 style citations
          .trim();
        if (cleanedPoint) {
          currentSection.content.push(cleanedPoint);
        }
      }
      // Regular paragraph text
      else if (trimmedLine && !trimmedLine.match(/^---+$/)) {
        // If we don't have a section yet, this is the intro
        if (!currentSection.title && sections.length === 0) {
          currentSection.title = 'Overview';
        }
        currentSection.content.push(trimmedLine);
      }
    }
    
    // Add the last section
    if (currentSection.title || currentSection.content.length > 0) {
      sections.push(currentSection);
    }
    
    return sections;
  };
  
  const sections = parseContent(content);
  const colors = {
    text: isDarkMode ? '#E0E0E0' : '#333333',
    sectionTitle: isDarkMode ? '#FFFFFF' : '#000000',
    bullet: isDarkMode ? '#4ECCA3' : '#4CAF50',
    source: isDarkMode ? '#8E8E93' : '#666666',
    sourceBg: isDarkMode ? '#2C2C2E' : '#F0F0F0',
  };
  
  return (
    <View style={styles.container}>
      {sections.map((section, sIndex) => (
        <View key={sIndex} style={styles.section}>
          {section.title !== 'Overview' && (
            <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>
              {section.title}
            </Text>
          )}
          {section.content.map((item, iIndex) => (
            <View key={iIndex} style={styles.bulletPoint}>
              <Text style={[styles.bullet, { color: colors.bullet }]}>•</Text>
              <Text style={[styles.bulletText, { color: colors.text }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      ))}
      
      {/* Source citations */}
      {sources.length > 0 && (
        <View style={styles.sourcesContainer}>
          {sources.map((source, index) => (
            <View 
              key={index} 
              style={[styles.sourceTag, { backgroundColor: colors.sourceBg }]}
            >
              <MaterialIcons 
                name="link" 
                size={12} 
                color={colors.source} 
              />
              <Text style={[styles.sourceText, { color: colors.source }]}>
                {source}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 10,
  },
  bullet: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  sourcesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  driverSection: {
    marginVertical: 6,
  },
  driverLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  driverText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    marginBottom: 4,
  },
  statText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
    fontWeight: '500',
  },
});

// Renderer for NLTK-processed content
const renderProcessedContent = (processedData: any, sources: string[], isDarkMode: boolean) => {
  const colors = {
    text: isDarkMode ? '#E0E0E0' : '#333333',
    sectionTitle: isDarkMode ? '#FFFFFF' : '#000000',
    bullet: isDarkMode ? '#4ECCA3' : '#4CAF50',
    source: isDarkMode ? '#8E8E93' : '#666666',
    sourceBg: isDarkMode ? '#2C2C2E' : '#F0F0F0',
    bullish: '#4ECCA3',
    bearish: '#F05454',
    neutral: '#EAB308',
  };
  
  return (
    <View style={styles.container}>
      {/* Summary Section */}
      {processedData.summary && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>
            Summary
          </Text>
          <Text style={[styles.bulletText, { color: colors.text }]}>
            {processedData.summary}
          </Text>
        </View>
      )}
      
      {/* Key Points */}
      {processedData.bullet_points && processedData.bullet_points.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>
            Key Points
          </Text>
          {processedData.bullet_points.map((point: string, index: number) => (
            <View key={index} style={styles.bulletPoint}>
              <Text style={[styles.bullet, { color: colors.bullet }]}>•</Text>
              <Text style={[styles.bulletText, { color: colors.text }]}>
                {point.replace(/^• /, '')}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Sentiment Drivers */}
      {processedData.drivers && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>
            Market Drivers
          </Text>
          {processedData.drivers.bullish?.length > 0 && (
            <View style={styles.driverSection}>
              <Text style={[styles.driverLabel, { color: colors.bullish }]}>Bullish:</Text>
              {processedData.drivers.bullish.map((driver: string, idx: number) => (
                <Text key={idx} style={[styles.driverText, { color: colors.text }]}>
                  • {driver}
                </Text>
              ))}
            </View>
          )}
          {processedData.drivers.bearish?.length > 0 && (
            <View style={styles.driverSection}>
              <Text style={[styles.driverLabel, { color: colors.bearish }]}>Bearish:</Text>
              {processedData.drivers.bearish.map((driver: string, idx: number) => (
                <Text key={idx} style={[styles.driverText, { color: colors.text }]}>
                  • {driver}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
      
      {/* Key Statistics */}
      {processedData.key_stats && processedData.key_stats.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>
            Key Statistics
          </Text>
          {processedData.key_stats.map((stat: string, index: number) => (
            <Text key={index} style={[styles.statText, { color: colors.text }]}>
              • {stat}
            </Text>
          ))}
        </View>
      )}
      
      {/* Source citations */}
      {sources.length > 0 && (
        <View style={styles.sourcesContainer}>
          {sources.map((source, index) => (
            <View 
              key={index} 
              style={[styles.sourceTag, { backgroundColor: colors.sourceBg }]}
            >
              <MaterialIcons 
                name="link" 
                size={12} 
                color={colors.source} 
              />
              <Text style={[styles.sourceText, { color: colors.source }]}>
                {source}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// Renderer for new layered analysis format
const renderLayeredAnalysis = (data: any, sources: string[], isDarkMode: boolean) => {
  const colors = {
    text: isDarkMode ? '#E0E0E0' : '#333333',
    sectionTitle: isDarkMode ? '#FFFFFF' : '#000000',
    primaryBullet: isDarkMode ? '#4ECCA3' : '#4CAF50',
    supportingBullet: isDarkMode ? '#64B5F6' : '#2196F3',
    sentimentOverview: isDarkMode ? '#FFB74D' : '#FF9800',
    source: isDarkMode ? '#8E8E93' : '#666666',
    sourceBg: isDarkMode ? '#2C2C2E' : '#F0F0F0',
    bullish: '#4ECCA3',
    bearish: '#F05454',
    neutral: '#EAB308',
    metric: isDarkMode ? '#B39DDB' : '#7E57C2',
  };
  
  return (
    <View style={styles.container}>
      {/* Sentiment Overview */}
      {data.sentiment_overview && (
        <View style={[styles.section, { marginBottom: 16 }]}>
          <Text style={[
            styles.sectionTitle, 
            { color: colors.sentimentOverview, fontSize: 16 }
          ]}>
            {data.sentiment_overview}
          </Text>
        </View>
      )}
      
      {/* Primary Analysis Points */}
      {data.primary_analysis && data.primary_analysis.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>
            Core Analysis
          </Text>
          {data.primary_analysis.map((point: string, index: number) => (
            <View key={index} style={styles.bulletPoint}>
              <Text style={[styles.bullet, { color: colors.primaryBullet }]}>•</Text>
              <Text style={[styles.bulletText, { color: colors.text }]}>
                {point.replace(/^[•\-\*]\s*/, '').replace(/<br>/g, '')}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Supporting Insights */}
      {data.supporting_insights && data.supporting_insights.length > 0 && (
        <View style={styles.section}>
          {data.supporting_insights.map((point: string, index: number) => (
            <View key={index} style={[styles.bulletPoint, { marginLeft: 20 }]}>
              <Text style={[styles.bullet, { color: colors.supportingBullet, fontSize: 14 }]}>◦</Text>
              <Text style={[styles.bulletText, { color: colors.text, fontSize: 14 }]}>
                {point.replace(/^[•◦\-\*]\s*/, '').replace(/<br>/g, '').trim()}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Market Drivers with Context */}
      {data.market_drivers && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>
            Market Drivers
          </Text>
          
          {data.market_drivers.bullish_factors?.length > 0 && (
            <View style={styles.driverSection}>
              <Text style={[styles.driverLabel, { color: colors.bullish }]}>Bullish Factors:</Text>
              {data.market_drivers.bullish_factors.map((driver: string, idx: number) => (
                <Text key={idx} style={[styles.driverText, { color: colors.text }]}>
                  • {driver.replace(/<br>/g, '')}
                </Text>
              ))}
            </View>
          )}
          
          {data.market_drivers.bearish_factors?.length > 0 && (
            <View style={styles.driverSection}>
              <Text style={[styles.driverLabel, { color: colors.bearish }]}>Bearish Factors:</Text>
              {data.market_drivers.bearish_factors.map((driver: string, idx: number) => (
                <Text key={idx} style={[styles.driverText, { color: colors.text }]}>
                  • {driver.replace(/<br>/g, '')}
                </Text>
              ))}
            </View>
          )}
          
          {data.market_drivers.key_considerations?.length > 0 && (
            <View style={styles.driverSection}>
              <Text style={[styles.driverLabel, { color: colors.neutral }]}>Key Considerations:</Text>
              {data.market_drivers.key_considerations.map((item: string, idx: number) => (
                <Text key={idx} style={[styles.driverText, { color: colors.text }]}>
                  • {item.replace(/<br>/g, '')}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
      
      {/* Sentiment Analysis with Trend */}
      {data.sentiment && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>
            Sentiment Analysis
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[
              styles.statText, 
              { 
                color: data.sentiment.primary === 'BULLISH' ? colors.bullish : 
                       data.sentiment.primary === 'BEARISH' ? colors.bearish : colors.neutral,
                marginRight: 10
              }
            ]}>
              {data.sentiment.primary} ({data.sentiment.confidence}%)
            </Text>
            {data.sentiment.trend && (
              <Text style={[styles.statText, { color: colors.text, fontSize: 13 }]}>
                Trend: {data.sentiment.trend}
              </Text>
            )}
          </View>
        </View>
      )}
      
      {/* Key Metrics */}
      {data.key_metrics && data.key_metrics.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>
            Key Metrics
          </Text>
          {data.key_metrics.map((metric: string, index: number) => (
            <Text key={index} style={[styles.statText, { color: colors.metric }]}>
              • {metric.replace(/<br>/g, '')}
            </Text>
          ))}
        </View>
      )}
      
      {/* Metadata */}
      {data.metadata && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.sourceBg }}>
          <Text style={[styles.sourceText, { color: colors.source }]}>
            Analysis clarity: {data.metadata.clarity_score}% | 
            Word count: {data.metadata.word_count} | 
            Processing: {data.metadata.processing}
          </Text>
        </View>
      )}
      
      {/* Source citations */}
      {sources.length > 0 && (
        <View style={styles.sourcesContainer}>
          {sources.map((source, index) => (
            <View 
              key={index} 
              style={[styles.sourceTag, { backgroundColor: colors.sourceBg }]}
            >
              <MaterialIcons 
                name="link" 
                size={12} 
                color={colors.source} 
              />
              <Text style={[styles.sourceText, { color: colors.source }]}>
                {source}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default AIResponseFormatter;
