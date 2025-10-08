import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import MarkdownMessage from '../MarkdownMessage';
import { cleanAIResponse } from '../../utils/markdownUtils';

const MarkdownTestScreen = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Test content with various markdown formats
  const testCases = [
    {
      title: 'Headers and Text Formatting',
      content: `# Main Header
## Sub Header
### Small Header

This is **bold text** and this is *italic text*.
You can also use ***bold and italic*** together.

Here's some \`inline code\` within a sentence.`,
    },
    {
      title: 'Lists',
      content: `## Unordered List
- First item
- Second item
  - Nested item 1
  - Nested item 2
- Third item

## Ordered List
1. First step
2. Second step
3. Third step
   1. Sub-step A
   2. Sub-step B`,
    },
    {
      title: 'Code Blocks',
      content: `## JavaScript Code Example

\`\`\`javascript
function analyzeMarket(commodity) {
  const data = fetchMarketData(commodity);
  const analysis = {
    trend: calculateTrend(data),
    volatility: calculateVolatility(data),
    prediction: predictPrice(data)
  };
  return analysis;
}
\`\`\`

## Python Code Example

\`\`\`python
def analyze_sentiment(text):
    tokens = tokenize(text)
    sentiment = model.predict(tokens)
    return {
        'score': sentiment.score,
        'confidence': sentiment.confidence
    }
\`\`\``,
    },
    {
      title: 'Tables',
      content: `## Market Analysis Table

| Commodity | Price | Change | Volume |
|-----------|-------|--------|---------|
| Gold | $1,923 | +0.5% | 125K |
| Oil | $78.45 | -1.2% | 89K |
| Wheat | $6.23 | +2.1% | 45K |
| Silver | $23.10 | +0.8% | 67K |`,
    },
    {
      title: 'Blockquotes and Links',
      content: `## Important Analysis

> **Market Alert:** Significant volatility detected in commodity markets.
> Monitor positions closely and consider risk management strategies.

For more information, visit [Commodity Analysis](https://example.com).

---

## Key Takeaways

1. **Trend Analysis**: Markets showing bullish signals
2. **Risk Level**: Moderate to high
3. **Recommendation**: Diversify portfolio`,
    },
    {
      title: 'Complex AI Response',
      content: `## Reasoning Process

The market analysis indicates several key factors:

### 1. Technical Indicators
- **RSI**: Currently at 65, approaching overbought territory
- **MACD**: Bullish crossover detected
- **Volume**: Above average, confirming trend

### 2. Fundamental Analysis

\`\`\`json
{
  "supply": "decreasing",
  "demand": "increasing",
  "sentiment": "positive",
  "confidence": 0.78
}
\`\`\`

### 3. Price Predictions

Based on the analysis, here are the predictions:

| Timeframe | Price Target | Confidence |
|-----------|-------------|------------|
| 1 Day | $1,935 | 75% |
| 1 Week | $1,950 | 65% |
| 1 Month | $2,000 | 55% |

---

**Conclusion**: The analysis suggests a bullish outlook with moderate confidence. Consider implementing appropriate risk management strategies.`,
    },
    {
      title: 'Cleaned Formatting Test',
      content: cleanAIResponse(`**Reasoning Process:**

Here's the analysis with various formatting issues:

***Bold text*** should become **bold**
||Double pipes|| should become |single|
-------- Multiple dashes should become ---

* Bullet with asterisk
+ Bullet with plus
- Bullet with dash

\`\`\`javascript
// Code block remains intact
const test = "example";
\`\`\``),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
          Markdown Renderer Test
        </Text>
        <TouchableOpacity
          style={styles.themeToggle}
          onPress={() => setIsDarkMode(!isDarkMode)}
        >
          <Text style={styles.themeToggleText}>
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {testCases.map((testCase, index) => (
          <View key={index} style={styles.testCase}>
            <Text style={[styles.testTitle, isDarkMode && styles.darkText]}>
              {testCase.title}
            </Text>
            <View style={[styles.messageWrapper, isDarkMode && styles.darkMessage]}>
              <MarkdownMessage
                content={testCase.content}
                isUser={false}
                isDarkMode={isDarkMode}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  darkContainer: {
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  darkText: {
    color: '#e0e0e0',
  },
  themeToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 16,
  },
  themeToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  testCase: {
    margin: 16,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  messageWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  darkMessage: {
    backgroundColor: '#2d2d2d',
  },
});

export default MarkdownTestScreen;
