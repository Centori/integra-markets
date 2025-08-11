import axios from 'axios';
import Constants from 'expo-constants';

// Groq API configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Use environment variable for API key
const GROQ_API_KEY = Constants.expoConfig?.extra?.groqApiKey || '';

// System prompt optimized for commodities trading analysis
const COMMODITIES_SYSTEM_PROMPT = `You are an AI assistant specialized in commodities markets analysis. You help traders understand market dynamics, price movements, and news impacts on commodities like crude oil, natural gas, gold, and others.

Your expertise includes:
- Technical analysis of price charts and indicators
- Fundamental analysis of supply/demand factors
- Interpreting economic data releases and their impact on commodities
- Understanding seasonal patterns and weather impacts
- Analyzing geopolitical events affecting commodity prices
- Risk management strategies for commodity traders

Important guidelines:
- Provide educational insights, not financial advice
- Always remind users to do their own research
- Be objective and present multiple perspectives
- Use clear, concise language suitable for both beginners and experienced traders
- When discussing specific price levels or predictions, always emphasize uncertainty and risk`;

class GroqService {
    constructor() {
        this.apiKey = GROQ_API_KEY;
        // Updated to use currently supported model
        this.model = 'llama3-70b-8192'; // Llama 3 70B with 8k context
    }

    async sendMessage(messages, newsContext = null) {
        try {
            // Prepare messages array with system prompt
            const formattedMessages = [
                {
                    role: 'system',
                    content: COMMODITIES_SYSTEM_PROMPT
                }
            ];

            // Add news context if provided
            if (newsContext) {
                formattedMessages.push({
                    role: 'system',
                    content: `Current news context:\nTitle: ${newsContext.title}\nSummary: ${newsContext.summary}\nSource: ${newsContext.source}\n\nPlease consider this news article when responding to the user's questions.`
                });
            }

            // Add user messages
            formattedMessages.push(...messages);

            const response = await axios.post(
                GROQ_API_URL,
                {
                    model: this.model,
                    messages: formattedMessages,
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: false
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                data: response.data.choices[0].message.content
            };
        } catch (error) {
            console.error('Groq API Error:', error);
            
            // Handle rate limits
            if (error.response?.status === 429) {
                return {
                    success: false,
                    error: 'Rate limit reached. Please try again in a moment.'
                };
            }

            // Handle missing API key
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'API key not configured. Please add EXPO_PUBLIC_GROQ_API_KEY to your .env file.'
                };
            }

            // Handle bad request
            if (error.response?.status === 400) {
                console.error('Bad request details:', error.response?.data);
                return {
                    success: false,
                    error: 'Invalid request. Please try again.'
                };
            }

            return {
                success: false,
                error: 'Failed to get response. Please try again.'
            };
        }
    }

    // Get available models (useful for letting users choose)
    getAvailableModels() {
        return [
            {
                id: 'llama3-70b-8192',
                name: 'Llama 3 70B',
                description: 'Best for complex analysis and reasoning'
            },
            {
                id: 'llama3-8b-8192',
                name: 'Llama 3 8B',
                description: 'Faster responses, good for quick questions'
            },
            {
                id: 'mixtral-8x7b-32768',
                name: 'Mixtral 8x7B',
                description: 'Good balance of speed and quality'
            },
            {
                id: 'gemma2-9b-it',
                name: 'Gemma 2 9B',
                description: 'Google\'s efficient model, good for analysis'
            }
        ];
    }

    // Switch model if needed
    setModel(modelId) {
        this.model = modelId;
    }
}

export default new GroqService();
