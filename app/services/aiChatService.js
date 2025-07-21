import { makeApiRequest, getActiveApiConfig, AI_PROVIDERS } from './apiKeyService';
import { showToast } from '../utils/toast';

// Chat contexts for different use cases
export const CHAT_CONTEXTS = {
  ANALYSIS: 'analysis',
  GENERAL: 'general',
  MARKET_INSIGHTS: 'market_insights',
  NEWS_SUMMARY: 'news_summary',
};

// System prompts for different contexts
const SYSTEM_PROMPTS = {
  [CHAT_CONTEXTS.ANALYSIS]: `You are a senior financial analyst and commodity markets expert. You specialize in:
- Market sentiment analysis
- Commodity price movements and trends
- Geopolitical impacts on markets
- Weather and supply chain effects
- Trading strategies and risk management

Provide clear, actionable insights with specific reasoning. Use market data when available and always consider multiple factors affecting commodity prices.`,

  [CHAT_CONTEXTS.GENERAL]: `You are an AI assistant specializing in financial markets and commodities. Help users understand market dynamics, interpret news, and analyze trends. Be concise but thorough.`,

  [CHAT_CONTEXTS.MARKET_INSIGHTS]: `You are a market research analyst focused on commodity markets. Provide detailed analysis of market trends, price movements, and factors affecting commodity prices. Include quantitative insights when possible.`,

  [CHAT_CONTEXTS.NEWS_SUMMARY]: `You are a financial news analyst. Summarize market news clearly and explain its potential impact on commodity markets. Focus on actionable information for traders and investors.`,
};

/**
 * Send a chat message and get AI response
 */
export async function sendChatMessage(message, context = CHAT_CONTEXTS.GENERAL, conversationHistory = []) {
  try {
    const activeConfig = await getActiveApiConfig();
    if (!activeConfig) {
      throw new Error('No API key configured. Please add an API key in Settings.');
    }

    const { provider, config } = activeConfig;
    const systemPrompt = SYSTEM_PROMPTS[context];

    let requestBody;
    let endpoint;

    if (provider === AI_PROVIDERS.OPENAI || provider === AI_PROVIDERS.GROQ) {
      endpoint = '/chat/completions';
      requestBody = {
        model: config.models[0], // Use first available model
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      };
    } else if (provider === AI_PROVIDERS.ANTHROPIC) {
      endpoint = '/messages';
      requestBody = {
        model: config.models[0],
        max_tokens: 1000,
        messages: [
          ...conversationHistory,
          { role: 'user', content: message },
        ],
        system: systemPrompt,
      };
    }

    const response = await makeApiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    // Extract response based on provider
    let content;
    if (provider === AI_PROVIDERS.OPENAI || provider === AI_PROVIDERS.GROQ) {
      content = data.choices?.[0]?.message?.content;
    } else if (provider === AI_PROVIDERS.ANTHROPIC) {
      content = data.content?.[0]?.text;
    }

    if (!content) {
      throw new Error('No response content received from AI service');
    }

    return {
      content,
      provider,
      model: config.models[0],
      usage: data.usage,
    };
  } catch (error) {
    console.error('Chat message error:', error);
    showToast('error', 'Chat Error', error.message);
    throw error;
  }
}

/**
 * Analyze news article with AI
 */
export async function analyzeNewsWithAI(newsText, headline = '', source = '') {
  const message = `
Please analyze this news article:

Headline: ${headline}
Source: ${source}

Content:
${newsText}

Provide:
1. Key sentiment (Bullish/Bearish/Neutral) with confidence score
2. Main market drivers and themes
3. Potential impact on commodity prices
4. Trading implications
5. Key risk factors to watch

Format your response with clear sections.
`;

  try {
    const response = await sendChatMessage(message, CHAT_CONTEXTS.ANALYSIS);
    return parseAnalysisResponse(response.content);
  } catch (error) {
    console.error('News analysis error:', error);
    throw error;
  }
}

/**
 * Get market insights based on current data
 */
export async function getMarketInsights(marketData) {
  const message = `
Analyze the current market conditions based on this data:

${JSON.stringify(marketData, null, 2)}

Please provide:
1. Overall market sentiment assessment
2. Key trends and patterns
3. Notable price movements
4. Risk factors and opportunities
5. Short-term outlook

Focus on actionable insights for commodity traders.
`;

  try {
    return await sendChatMessage(message, CHAT_CONTEXTS.MARKET_INSIGHTS);
  } catch (error) {
    console.error('Market insights error:', error);
    throw error;
  }
}

/**
 * Chat about specific commodity
 */
export async function chatAboutCommodity(commodity, question, priceData = null) {
  let message = `I have a question about ${commodity}:\n\n${question}`;

  if (priceData) {
    message += `\n\nCurrent market data for ${commodity}:\n${JSON.stringify(priceData, null, 2)}`;
  }

  message += `\n\nPlease provide detailed analysis considering current market conditions, supply/demand factors, and any relevant geopolitical or weather impacts.`;

  try {
    return await sendChatMessage(message, CHAT_CONTEXTS.ANALYSIS);
  } catch (error) {
    console.error('Commodity chat error:', error);
    throw error;
  }
}

/**
 * Parse AI analysis response into structured data
 */
function parseAnalysisResponse(content) {
  try {
    // Try to extract structured information from the response
    const lines = content.split('\n').filter(line => line.trim());
    
    let sentiment = 'NEUTRAL';
    let confidence = 0.5;
    let keyDrivers = [];
    let marketImpact = 'MEDIUM';
    let tradeIdeas = [];

    // Look for sentiment indicators
    const sentimentLine = lines.find(line => 
      line.toLowerCase().includes('sentiment') || 
      line.toLowerCase().includes('bullish') || 
      line.toLowerCase().includes('bearish')
    );
    
    if (sentimentLine) {
      if (sentimentLine.toLowerCase().includes('bullish')) {
        sentiment = 'BULLISH';
        confidence = 0.7;
      } else if (sentimentLine.toLowerCase().includes('bearish')) {
        sentiment = 'BEARISH';
        confidence = 0.7;
      }
    }

    // Extract key drivers (look for numbered lists or bullet points)
    lines.forEach(line => {
      if (line.match(/^\d+\./) || line.startsWith('•') || line.startsWith('-')) {
        const driver = line.replace(/^\d+\./, '').replace(/^[•-]/, '').trim();
        if (driver && driver.length > 10) {
          keyDrivers.push({
            term: driver.split(' ').slice(0, 3).join(' '),
            score: Math.random() * 0.5 + 0.5, // Random score for demo
          });
        }
      }
    });

    // Look for trading ideas
    const tradingSection = content.toLowerCase().includes('trading') || 
                          content.toLowerCase().includes('implications');
    if (tradingSection) {
      lines.forEach(line => {
        if (line.toLowerCase().includes('consider') || 
            line.toLowerCase().includes('watch') ||
            line.toLowerCase().includes('monitor')) {
          tradeIdeas.push(line.trim());
        }
      });
    }

    return {
      summary: content.substring(0, 200) + '...',
      sentiment,
      confidence,
      keyDrivers: keyDrivers.slice(0, 5),
      marketImpact: {
        level: marketImpact,
        confidence,
      },
      tradeIdeas: tradeIdeas.slice(0, 3),
      fullAnalysis: content,
    };
  } catch (error) {
    console.error('Error parsing analysis response:', error);
    return {
      summary: content.substring(0, 200) + '...',
      sentiment: 'NEUTRAL',
      confidence: 0.5,
      keyDrivers: [],
      marketImpact: { level: 'MEDIUM', confidence: 0.5 },
      tradeIdeas: [],
      fullAnalysis: content,
    };
  }
}

/**
 * Generate follow-up questions based on analysis
 */
export function generateFollowUpQuestions(analysisResult) {
  const questions = [
    "What are the key risk factors to monitor?",
    "How might this affect related commodities?",
    "What's the expected timeline for these impacts?",
    "Are there any hedging strategies to consider?",
    "What additional data points should I track?",
  ];

  return questions.slice(0, 3); // Return 3 suggested questions
}

/**
 * Save conversation history
 */
export function formatConversationHistory(messages) {
  return messages.map(msg => ({
    role: msg.role === 'ai' ? 'assistant' : msg.role,
    content: msg.content,
  }));
}

/**
 * Check if AI service is available
 */
export async function checkAIServiceAvailability() {
  try {
    const activeConfig = await getActiveApiConfig();
    return !!activeConfig;
  } catch (error) {
    return false;
  }
}

export default {
  CHAT_CONTEXTS,
  sendChatMessage,
  analyzeNewsWithAI,
  getMarketInsights,
  chatAboutCommodity,
  parseAnalysisResponse,
  generateFollowUpQuestions,
  formatConversationHistory,
  checkAIServiceAvailability,
};
