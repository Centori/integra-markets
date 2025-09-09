/**
 * Enhanced API Client for Integra Markets
 * Handles all API communication with authentication
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Safely access environment variables to prevent iOS 18.6 crashes
// Force production backend for TestFlight deployment
const API_BASE_URL = 'https://integra-markets-backend.fly.dev' || 
                     process.env.EXPO_PUBLIC_API_URL || 
                     Constants.expoConfig?.extra?.apiUrl;
const API_URL = `${API_BASE_URL}/api`;

class APIClient {
    constructor() {
        this.authToken = null;
        this.baseURL = API_BASE_URL;
        this.apiURL = API_URL;
    }

    /**
     * Set authentication token
     */
    setAuthToken(token) {
        this.authToken = token;
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        return this.authToken;
    }

    /**
     * Make authenticated request
     */
    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.apiURL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        // Add auth token if available
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            // Handle 401 Unauthorized
            if (response.status === 401) {
                // Clear auth data
                await AsyncStorage.multiRemove(['@auth_token', '@user_data']);
                this.authToken = null;
                throw new Error('Authentication expired. Please login again.');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    /**
     * GET request
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    /**
     * POST request
     */
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // --- Auth Endpoints ---

    async login(email, password) {
        return this.post('/auth/login', { email, password });
    }

    async signup(email, password, fullName) {
        return this.post('/auth/signup', {
            email,
            password,
            full_name: fullName,
        });
    }

    async logout() {
        return this.post('/auth/logout');
    }

    async getMe() {
        return this.get('/auth/me');
    }

    async syncUser(userData) {
        return this.post('/auth/sync', userData);
    }

    // --- Notification Endpoints ---

    async registerPushToken(token, deviceType) {
        return this.post('/notifications/register-token', {
            token,
            device_type: deviceType,
        });
    }

    async getNotificationPreferences() {
        return this.get('/notifications/preferences');
    }

    async updateNotificationPreferences(preferences) {
        return this.put('/notifications/preferences', preferences);
    }

    async sendTestNotification(message) {
        return this.post('/notifications/test', { message });
    }

    // --- AI Alert Endpoints ---

    async analyzeNews(newsText, source = null) {
        return this.post('/ai-alerts/analyze', {
            news_text: newsText,
            source,
        });
    }

    async submitFeedback(trackingId, feedbackType, additionalData = {}) {
        return this.post('/ai-alerts/feedback', {
            tracking_id: trackingId,
            feedback_type: feedbackType,
            ...additionalData,
        });
    }

    async submitMarketData(updates) {
        return this.post('/ai-alerts/market-data', { updates });
    }

    async getUserInsights() {
        return this.get('/ai-alerts/user-insights');
    }

    async getModelStats() {
        return this.get('/ai-alerts/model-stats');
    }

    // --- Market Data Endpoints ---

    async getMarketSentiment() {
        return this.get('/sentiment/market');
    }

    async getTopMovers() {
        return this.get('/sentiment/movers');
    }

    async getNewsAnalysis(preferences = {}) {
        // Use the correct endpoint that accepts POST with preferences
        return this.post('/user/news', {
            commodities: preferences.commodities || [],
            regions: preferences.regions || [],
            keywords: preferences.keywords || [],
            websiteURLs: preferences.websiteURLs || [],
            sources: 6
        });
    }

    async getWeatherAlerts() {
        return this.get('/weather/alerts');
    }

    // --- Preprocessing & Analysis ---

    async preprocessNews(text) {
        return this.post('/preprocess-news', { text });
    }

    async analyzeSentiment(text, commodity = null, enhanced = true) {
        return this.post('/analyze-sentiment', {
            text,
            commodity,
            enhanced,
        });
    }

    async comprehensiveAnalysis(text, commodity = null) {
        return this.post('/comprehensive-analysis', {
            text,
            commodity,
            include_preprocessing: true,
            include_finbert: true,
        });
    }

    // --- Health Check ---

    async checkHealth() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async getModelsStatus() {
        return this.get('/models/status');
    }
}

// Create singleton instance
export const api = new APIClient();

// Export convenience functions
export const setAuthToken = (token) => api.setAuthToken(token);
export const checkApiHealth = () => api.checkHealth();
export const getMarketSentiment = () => api.getMarketSentiment();
export const getTopMovers = () => api.getTopMovers();
export const analyzeNews = (text, source) => api.analyzeNews(text, source);
export const submitFeedback = (trackingId, feedbackType, data) => 
    api.submitFeedback(trackingId, feedbackType, data);
export const getUserInsights = () => api.getUserInsights();
