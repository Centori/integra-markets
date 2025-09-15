import axios from 'axios';
import Constants from 'expo-constants';

// Groq API configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Use environment variable for API key
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || Constants.expoConfig?.extra?.groqApiKey || '';

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
        // Updated to use currently supported model (as of Jan 2025)
        this.model = 'llama-3.3-70b-versatile'; // Llama 3.3 70B - the latest available model
    }

    async sendMessage(messages, newsContext = null, onStreamUpdate = null) {
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

            const rawContent = response.data.choices[0].message.content;
            const cleanedContent = this.cleanResponse(rawContent);

            // If streaming callback provided, simulate typewriter effect
            if (onStreamUpdate && typeof onStreamUpdate === 'function') {
                await this.simulateTypewriter(cleanedContent, onStreamUpdate);
                return {
                    success: true,
                    data: cleanedContent,
                    streamed: true
                };
            }

            return {
                success: true,
                data: cleanedContent
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
                id: 'llama-3.3-70b-versatile',
                name: 'Llama 3.3 70B',
                description: 'Latest and most capable model for complex analysis'
            },
            {
                id: 'llama-3.1-8b-instant',
                name: 'Llama 3.1 8B',
                description: 'Fast responses for quick questions'
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

    // Clean response text from formatting artifacts
    cleanResponse(text) {
        if (!text) return '';
        
        return text
            // Remove excessive asterisks and markdown artifacts
            .replace(/\*{2,}/g, '') // Remove multiple asterisks
            .replace(/\*([^*]+)\*/g, '$1') // Remove single asterisk emphasis
            .replace(/#{1,6}\s*/g, '') // Remove markdown headers
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/`([^`]+)`/g, '$1') // Remove inline code backticks
            .replace(/\n{3,}/g, '\n\n') // Reduce excessive line breaks
            .replace(/^\s+|\s+$/g, '') // Trim whitespace
            .replace(/\s{2,}/g, ' ') // Reduce multiple spaces to single space
            .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ensure proper sentence spacing
            .trim();
    }

    // Simulate typewriter effect for smooth text appearance
    async simulateTypewriter(text, onUpdate) {
        const words = text.split(' ');
        let currentText = '';
        
        for (let i = 0; i < words.length; i++) {
            currentText += (i > 0 ? ' ' : '') + words[i];
            
            // Call the update callback with current text
            onUpdate(currentText);
            
            // Dynamic delay based on word length and position
            let delay = 50; // Base delay
            
            // Slower for longer words
            if (words[i].length > 6) delay += 20;
            
            // Pause at sentence endings
            if (words[i].match(/[.!?]$/)) {
                delay += 200;
            }
            // Pause at commas
            else if (words[i].match(/[,;:]$/)) {
                delay += 100;
            }
            // Faster for short words (articles, prepositions)
            else if (words[i].length <= 3) {
                delay = 30;
            }
            
            // Don't delay on the last word
            if (i < words.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

export default new GroqService();
