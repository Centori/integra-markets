/**
 * Kalshi Prediction Markets Service
 * Handles all Kalshi API communication for prediction markets
 */
import { apiClient } from './apiClient';
import Constants from 'expo-constants';

class KalshiService {
    constructor() {
    // Get configuration from environment variables or app config
    this.baseURL = process.env.EXPO_PUBLIC_KALSHI_BASE_URL || 
                   Constants.expoConfig?.extra?.kalshiBaseUrl || 
                   'https://trading-api.kalshi.com/trade-api/v2';
    
    this.apiKey = process.env.EXPO_PUBLIC_KALSHI_API_KEY || 
                  Constants.expoConfig?.extra?.kalshiApiKey || 
                  null;
    
    this.apiSecret = process.env.EXPO_PUBLIC_KALSHI_API_SECRET || 
                     Constants.expoConfig?.extra?.kalshiApiSecret || 
                     null;
    
    this.isAuthenticated = false;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.baseEndpoint = '/kalshi';
  }

    // Public Market Data Methods (no authentication required)

    /**
     * Get list of prediction markets
     */
    async getMarkets(options = {}) {
        const {
            limit = 100,
            cursor = null,
            status = null,
            eventId = null
        } = options;

        const params = { limit };
        if (cursor) params.cursor = cursor;
        if (status) params.status = status;
        if (eventId) params.event_id = eventId;

        try {
            return await api.get(`${this.baseEndpoint}/markets`, params);
        } catch (error) {
            console.error('Error fetching Kalshi markets:', error);
            throw error;
        }
    }

    /**
     * Get specific market by ticker
     */
    async getMarket(ticker) {
        try {
            return await api.get(`${this.baseEndpoint}/markets/${ticker}`);
        } catch (error) {
            console.error(`Error fetching Kalshi market ${ticker}:`, error);
            throw error;
        }
    }

    /**
     * Get list of events
     */
    async getEvents(options = {}) {
        const {
            limit = 100,
            cursor = null,
            status = null
        } = options;

        const params = { limit };
        if (cursor) params.cursor = cursor;
        if (status) params.status = status;

        try {
            return await api.get(`${this.baseEndpoint}/events`, params);
        } catch (error) {
            console.error('Error fetching Kalshi events:', error);
            throw error;
        }
    }

    /**
     * Get specific event by ID
     */
    async getEvent(eventId) {
        try {
            return await api.get(`${this.baseEndpoint}/events/${eventId}`);
        } catch (error) {
            console.error(`Error fetching Kalshi event ${eventId}:`, error);
            throw error;
        }
    }

    /**
     * Get order book for a market
     */
    async getOrderbook(ticker, depth = 5) {
        try {
            return await api.get(`${this.baseEndpoint}/markets/${ticker}/orderbook`, { depth });
        } catch (error) {
            console.error(`Error fetching orderbook for ${ticker}:`, error);
            throw error;
        }
    }

    /**
     * Get recent trades for a market
     */
    async getTrades(ticker, options = {}) {
        const {
            limit = 100,
            cursor = null
        } = options;

        const params = { limit };
        if (cursor) params.cursor = cursor;

        try {
            return await api.get(`${this.baseEndpoint}/markets/${ticker}/trades`, params);
        } catch (error) {
            console.error(`Error fetching trades for ${ticker}:`, error);
            throw error;
        }
    }

    // Utility Methods

    /**
     * Get available market categories
     */
    async getMarketCategories() {
        try {
            return await api.get(`${this.baseEndpoint}/markets/categories`);
        } catch (error) {
            console.error('Error fetching market categories:', error);
            throw error;
        }
    }

    /**
     * Search markets by title or ticker
     */
    async searchMarkets(query, limit = 20) {
        try {
            return await api.post(`${this.baseEndpoint}/markets/search`, {
                query,
                limit
            });
        } catch (error) {
            console.error('Error searching markets:', error);
            throw error;
        }
    }

    /**
     * Get trending markets based on volume
     */
    async getTrendingMarkets(limit = 20) {
        try {
            return await api.get(`${this.baseEndpoint}/markets/trending`, { limit });
        } catch (error) {
            console.error('Error fetching trending markets:', error);
            throw error;
        }
    }

    // Authenticated Methods (require API key and private key)

    /**
     * Get portfolio information
     */
    async getPortfolio() {
        try {
            return await api.get(`${this.baseEndpoint}/portfolio`);
        } catch (error) {
            console.error('Error fetching portfolio:', error);
            throw error;
        }
    }

    /**
     * Get portfolio positions
     */
    async getPositions(options = {}) {
        const {
            limit = 100,
            cursor = null
        } = options;

        const params = { limit };
        if (cursor) params.cursor = cursor;

        try {
            return await api.get(`${this.baseEndpoint}/portfolio/positions`, params);
        } catch (error) {
            console.error('Error fetching positions:', error);
            throw error;
        }
    }

    /**
     * Get orders
     */
    async getOrders(options = {}) {
        const {
            limit = 100,
            cursor = null,
            ticker = null
        } = options;

        const params = { limit };
        if (cursor) params.cursor = cursor;
        if (ticker) params.ticker = ticker;

        try {
            return await api.get(`${this.baseEndpoint}/portfolio/orders`, params);
        } catch (error) {
            console.error('Error fetching orders:', error);
            throw error;
        }
    }

    /**
     * Create a new order
     */
    async createOrder(orderData) {
        const {
            ticker,
            action,      // 'buy' or 'sell'
            side,        // 'yes' or 'no'
            count,
            orderType = 'limit',
            yesPrice = null,
            noPrice = null,
            clientOrderId = null
        } = orderData;

        try {
            return await api.post(`${this.baseEndpoint}/portfolio/orders`, {
                ticker,
                action,
                side,
                count,
                order_type: orderType,
                yes_price: yesPrice,
                no_price: noPrice,
                client_order_id: clientOrderId
            });
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    }

    /**
     * Get specific order by ID
     */
    async getOrder(orderId) {
        try {
            return await api.get(`${this.baseEndpoint}/portfolio/orders/${orderId}`);
        } catch (error) {
            console.error(`Error fetching order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Cancel an order
     */
    async cancelOrder(orderId) {
        try {
            return await api.delete(`${this.baseEndpoint}/portfolio/orders/${orderId}`);
        } catch (error) {
            console.error(`Error canceling order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Amend an existing order
     */
    async amendOrder(orderId, amendments) {
        const {
            yesPrice = null,
            noPrice = null,
            count = null
        } = amendments;

        const data = {};
        if (yesPrice !== null) data.yes_price = yesPrice;
        if (noPrice !== null) data.no_price = noPrice;
        if (count !== null) data.count = count;

        try {
            return await api.put(`${this.baseEndpoint}/portfolio/orders/${orderId}`, data);
        } catch (error) {
            console.error(`Error amending order ${orderId}:`, error);
            throw error;
        }
    }

    // Health and utility methods

    /**
     * Check Kalshi service health
     */
    async checkHealth() {
        try {
            return await api.get(`${this.baseEndpoint}/health`);
        } catch (error) {
            console.error('Error checking Kalshi health:', error);
            throw error;
        }
    }

    /**
     * Clear API cache
     */
    async clearCache() {
        try {
            return await api.post(`${this.baseEndpoint}/cache/clear`);
        } catch (error) {
            console.error('Error clearing Kalshi cache:', error);
            throw error;
        }
    }

    // Helper methods for UI components

    /**
     * Format market data for display
     */
    formatMarketData(market) {
        return {
            id: market.ticker,
            title: market.title,
            ticker: market.ticker,
            yesPrice: market.yes_bid || market.yes_ask || 0,
            noPrice: market.no_bid || market.no_ask || 0,
            volume: market.volume || 0,
            openInterest: market.open_interest || 0,
            status: market.status,
            category: market.category,
            eventId: market.event_id,
            closeTime: market.close_time,
            resolveTime: market.resolve_time,
            lastTradePrice: market.last_price,
            priceChange: this.calculatePriceChange(market),
            probability: this.calculateProbability(market)
        };
    }

    /**
     * Calculate price change percentage
     */
    calculatePriceChange(market) {
        if (!market.previous_yes_bid || !market.yes_bid) return 0;
        return ((market.yes_bid - market.previous_yes_bid) / market.previous_yes_bid) * 100;
    }

    /**
     * Calculate implied probability from prices
     */
    calculateProbability(market) {
        const yesPrice = market.yes_bid || market.yes_ask || 0;
        return yesPrice; // Kalshi prices are already in probability format (0-100)
    }

    /**
     * Format order data for display
     */
    formatOrderData(order) {
        return {
            id: order.order_id,
            ticker: order.ticker,
            side: order.side,
            action: order.action,
            count: order.count,
            yesPrice: order.yes_price,
            noPrice: order.no_price,
            status: order.status,
            createdTime: order.created_time,
            filledCount: order.filled_count || 0,
            remainingCount: order.remaining_count || order.count,
            type: order.type
        };
    }

    /**
     * Get market sentiment based on price movement
     */
    getMarketSentiment(market) {
        const priceChange = this.calculatePriceChange(market);
        if (priceChange > 5) return 'bullish';
        if (priceChange < -5) return 'bearish';
        return 'neutral';
    }

    /**
     * Filter markets by category
     */
    filterMarketsByCategory(markets, category) {
        if (!category || category === 'all') return markets;
        return markets.filter(market => 
            market.category && market.category.toLowerCase() === category.toLowerCase()
        );
    }

    /**
     * Sort markets by various criteria
     */
    sortMarkets(markets, sortBy = 'volume') {
        const sortedMarkets = [...markets];
        
        switch (sortBy) {
            case 'volume':
                return sortedMarkets.sort((a, b) => (b.volume || 0) - (a.volume || 0));
            case 'probability':
                return sortedMarkets.sort((a, b) => 
                    this.calculateProbability(b) - this.calculateProbability(a)
                );
            case 'change':
                return sortedMarkets.sort((a, b) => 
                    this.calculatePriceChange(b) - this.calculatePriceChange(a)
                );
            case 'alphabetical':
                return sortedMarkets.sort((a, b) => a.title.localeCompare(b.title));
            case 'close_time':
                return sortedMarkets.sort((a, b) => 
                    new Date(a.close_time) - new Date(b.close_time)
                );
            default:
                return sortedMarkets;
        }
    }

    /**
     * Get market status color for UI
     */
    getMarketStatusColor(status) {
        switch (status) {
            case 'open': return '#10B981'; // green
            case 'closed': return '#6B7280'; // gray
            case 'settled': return '#3B82F6'; // blue
            case 'resolved': return '#8B5CF6'; // purple
            default: return '#6B7280';
        }
    }

    /**
     * Get formatted markets for UI mockup
     */
    async getFormattedMarkets(options = {}) {
        try {
            const { limit = 20, category } = options;
            const params = new URLSearchParams({ limit: limit.toString() });
            if (category) params.append('category', category);
            
            const response = await this.makeRequest(`/markets/formatted?${params}`);
            return response.markets || [];
        } catch (error) {
            console.error('Error fetching formatted markets:', error);
            throw error;
        }
    }

    /**
     * Place a trade with simplified interface
     */
    async placeTrade(ticker, side, count, price, options = {}) {
        try {
            const tradeData = {
                ticker,
                side, // 'yes' or 'no'
                count,
                price, // Price in cents
                order_type: options.orderType || 'limit',
                client_order_id: options.clientOrderId
            };

            const response = await this.makeRequest('/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tradeData),
            });

            return response;
        } catch (error) {
            console.error('Error placing trade:', error);
            throw error;
        }
    }

    /**
     * Format price for display (cents to dollars)
     */
    formatPrice(cents) {
        if (cents === null || cents === undefined) return '--';
        return `$${(cents / 100).toFixed(2)}`;
    }

    /**
     * Format probability for display
     */
    formatProbability(probability) {
        if (probability === null || probability === undefined) return '--';
        return `${probability.toFixed(1)}%`;
    }
}

// Export singleton instance
export const kalshiService = new KalshiService();
export default kalshiService;