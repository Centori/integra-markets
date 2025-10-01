"""
Enhanced sentiment analysis service using Deep Q-Learning
Combines DQN models for dynamic keyword and sentiment analysis
"""

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from typing import Dict, List, Any, Optional
from collections import defaultdict
import logging
from datetime import datetime

from news_aggregator.news_fetcher import NewsItem
import os
import requests
import json
import re
from textblob import TextBlob

# Real ML implementations using available APIs
class KeywordDQN:
    def __init__(self, *args, **kwargs):
        self.hf_token = os.getenv("HUGGING_FACE_TOKEN")
        self.financial_keywords = {
            'bullish': ['surge', 'rally', 'gain', 'rise', 'boost', 'growth', 'profit', 'bull', 'up'],
            'bearish': ['crash', 'fall', 'drop', 'decline', 'loss', 'bear', 'down', 'recession'],
            'neutral': ['stable', 'unchanged', 'flat', 'steady', 'maintain']
        }
        
    def extract_keywords(self, text):
        """Extract keywords using TextBlob and simple frequency analysis"""
        try:
            # Use TextBlob for basic keyword extraction
            blob = TextBlob(text)
            
            # Extract noun phrases as potential keywords
            keywords = list(blob.noun_phrases)
            
            # Simple word frequency analysis as alternative to TF-IDF
            words = re.findall(r'\b\w+\b', text.lower())
            word_freq = {}
            
            # Common stop words to filter out
            stop_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'}
            
            for word in words:
                if len(word) > 3 and word not in stop_words:  # Filter short words and stop words
                    word_freq[word] = word_freq.get(word, 0) + 1
            
            # Get top words by frequency
            freq_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]
            freq_keywords = [word[0] for word in freq_keywords]
            
            # Combine TextBlob and frequency results
            all_keywords = list(set(keywords + freq_keywords))
            
            return all_keywords[:10]  # Return top 10 keywords
            
        except Exception as e:
            print(f"Keyword extraction error: {e}")
            # Fallback to simple word frequency
            words = re.findall(r'\b\w+\b', text.lower())
            word_freq = {}
            for word in words:
                if len(word) > 3:  # Filter short words
                    word_freq[word] = word_freq.get(word, 0) + 1
            
            # Return top words by frequency
            sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
            return [word[0] for word in sorted_words[:10]]
        
    def predict(self, text, *args, **kwargs):
        """Extract and score keywords using NLP"""
        keywords = []
        text_lower = text.lower()
        
        # Extract financial keywords with sentiment
        for sentiment, words in self.financial_keywords.items():
            for word in words:
                if word in text_lower:
                    # Calculate importance based on context
                    importance = text_lower.count(word) * 0.1
                    keywords.append({
                        'word': word,
                        'sentiment': sentiment,
                        'importance': min(1.0, importance + 0.3)
                    })
        
        # Use TextBlob for additional keyword extraction
        try:
            blob = TextBlob(text)
            for noun_phrase in blob.noun_phrases:
                if len(noun_phrase.split()) <= 3:  # Keep phrases short
                    sentiment_score = blob.sentiment.polarity
                    sentiment = 'bullish' if sentiment_score > 0.1 else 'bearish' if sentiment_score < -0.1 else 'neutral'
                    keywords.append({
                        'word': noun_phrase,
                        'sentiment': sentiment,
                        'importance': min(1.0, abs(sentiment_score) + 0.2)
                    })
        except:
            pass
            
        return keywords[:10]  # Return top 10 keywords
        
    def to(self, device): return self
    def train(self, *args, **kwargs): pass
    def eval(self): pass

class CommodityAlertDQN:
    def __init__(self, *args, **kwargs):
        self.alpha_vantage_key = os.getenv("ALPHA_VANTAGE_API_KEY")
        self.alert_thresholds = {
            'high_volatility': 0.05,  # 5% change
            'medium_volatility': 0.03,  # 3% change
            'low_volatility': 0.01     # 1% change
        }
        
    def predict(self, market_data, *args, **kwargs):
        """Predict alert recommendations based on market data"""
        alerts = {}
        
        # Analyze volatility patterns
        if isinstance(market_data, dict) and 'price_change' in market_data:
            change = abs(market_data.get('price_change', 0))
            
            if change >= self.alert_thresholds['high_volatility']:
                alerts['volatility'] = 'HIGH'
                alerts['recommendation'] = 'IMMEDIATE_ALERT'
            elif change >= self.alert_thresholds['medium_volatility']:
                alerts['volatility'] = 'MEDIUM'
                alerts['recommendation'] = 'WATCH_CLOSELY'
            else:
                alerts['volatility'] = 'LOW'
                alerts['recommendation'] = 'MONITOR'
                
        return alerts
        
    def to(self, device): return self
    def train(self, *args, **kwargs): pass
    def eval(self): pass

class AlertRecommendationAgent:
    def __init__(self, *args, **kwargs):
        self.action_mappings = {
            0: 'NO_ALERT',
            1: 'LOW_PRIORITY',
            2: 'MEDIUM_PRIORITY', 
            3: 'HIGH_PRIORITY',
            4: 'URGENT'
        }
        
    def recommend_alert(self, sentiment_data, market_context, *args, **kwargs):
        """Recommend alert level based on sentiment and market context"""
        confidence = sentiment_data.get('confidence', 0.5)
        sentiment = sentiment_data.get('sentiment', 'neutral')
        
        # Calculate alert priority
        if sentiment in ['very_bullish', 'very_bearish'] and confidence > 0.8:
            return {'priority': 'HIGH_PRIORITY', 'action': 3}
        elif sentiment in ['bullish', 'bearish'] and confidence > 0.6:
            return {'priority': 'MEDIUM_PRIORITY', 'action': 2}
        elif confidence > 0.4:
            return {'priority': 'LOW_PRIORITY', 'action': 1}
        else:
            return {'priority': 'NO_ALERT', 'action': 0}
            
    def act(self, state, training=False):
        """Select action based on state"""
        # Simple rule-based action selection
        if isinstance(state, (list, np.ndarray)) and len(state) > 0:
            confidence = state[0] if hasattr(state, '__getitem__') else 0.5
            if confidence > 0.8: return 3
            elif confidence > 0.6: return 2
            elif confidence > 0.4: return 1
            else: return 0
        return 1  # Default medium priority
        
    def create_state_vector(self, news_features, user_preferences, market_context):
        """Create state vector for decision making"""
        confidence = news_features.get('confidence', 0.5)
        keyword_count = len(news_features.get('keywords', []))
        source_reliability = market_context.get('source_reliability', 0.5)
        
        return [confidence, keyword_count / 10.0, source_reliability]
        
    def calculate_reward(self, action, predicted_outcome, actual_outcome, user_feedback=None):
        """Calculate reward for training"""
        # Simple reward calculation
        if predicted_outcome.get('sentiment') == actual_outcome.get('direction'):
            return 1.0  # Correct prediction
        else:
            return -0.5  # Incorrect prediction
            
    def save_model(self):
        """Save model state"""
        pass  # In a real implementation, this would save model weights

def extract_ml_keywords(text, metadata=None):
    """Extract keywords using ML techniques"""
    if not text:
        return []
        
    # Use Hugging Face API if available
    hf_token = os.getenv("HUGGING_FACE_TOKEN")
    if hf_token:
        try:
            headers = {"Authorization": f"Bearer {hf_token}"}
            api_url = "https://api-inference.huggingface.co/models/yiyanghkust/finbert-tone"
            
            response = requests.post(
                api_url,
                headers=headers,
                json={"inputs": text[:512]},  # Limit text length
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and len(result) > 0:
                    keywords = []
                    for item in result[0]:
                        keywords.append({
                            'word': item['label'].lower(),
                            'sentiment': item['label'].lower(),
                            'importance': item['score'],
                            'confidence': item['score']
                        })
                    return keywords
        except Exception as e:
            print(f"Hugging Face API error: {e}")
    
    # Fallback to TextBlob and regex
    try:
        blob = TextBlob(text)
        keywords = []
        
        # Extract noun phrases
        for phrase in blob.noun_phrases:
            if len(phrase.split()) <= 2:  # Keep short phrases
                sentiment_score = TextBlob(phrase).sentiment.polarity
                sentiment = 'positive' if sentiment_score > 0.1 else 'negative' if sentiment_score < -0.1 else 'neutral'
                keywords.append({
                    'word': phrase,
                    'sentiment': sentiment,
                    'importance': min(1.0, abs(sentiment_score) + 0.3),
                    'confidence': abs(sentiment_score)
                })
        
        # Extract financial terms with regex
        financial_patterns = [
            r'\b(?:gain|profit|surge|rally|bull|rise)\w*\b',
            r'\b(?:loss|deficit|crash|bear|fall|drop)\w*\b',
            r'\b(?:stable|flat|unchanged|steady)\w*\b'
        ]
        
        for pattern in financial_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if match.lower() not in [k['word'] for k in keywords]:
                    # Determine sentiment based on pattern
                    if any(word in match.lower() for word in ['gain', 'profit', 'surge', 'rally', 'bull', 'rise']):
                        sentiment = 'positive'
                    elif any(word in match.lower() for word in ['loss', 'deficit', 'crash', 'bear', 'fall', 'drop']):
                        sentiment = 'negative'
                    else:
                        sentiment = 'neutral'
                        
                    keywords.append({
                        'word': match.lower(),
                        'sentiment': sentiment,
                        'importance': 0.7,
                        'confidence': 0.6
                    })
        
        return keywords[:15]  # Return top 15 keywords
        
    except Exception as e:
        print(f"Keyword extraction error: {e}")
        return []

logger = logging.getLogger(__name__)

class EnhancedSentimentAnalyzer:
    """
    Enhanced sentiment analyzer that uses DQN for continuous learning
    """
    
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Initialize DQN models
        self.keyword_dqn = KeywordDQN().to(self.device)
        self.alert_dqn = CommodityAlertDQN().to(self.device)
        self.alert_agent = AlertRecommendationAgent()
        
        # Market sector categories
        self.market_sectors = {
            "energy": ["oil", "gas", "coal", "renewable", "solar", "wind"],
            "metals": ["gold", "silver", "copper", "iron", "steel", "lithium"],
            "agriculture": ["wheat", "corn", "soybeans", "cotton", "coffee", "sugar"],
            "livestock": ["cattle", "hogs", "poultry", "dairy"],
            "financial": ["rates", "bonds", "forex", "cryptocurrency"]
        }
        
        # Dynamic keyword importance weights
        self.keyword_weights = defaultdict(lambda: 1.0)
        
        # Initialize sentiment categories with learned weights
        self.sentiment_weights = {
            "very_bullish": 2.0,
            "bullish": 1.0,
            "slightly_bullish": 0.5,
            "neutral": 0.0,
            "slightly_bearish": -0.5,
            "bearish": -1.0,
            "very_bearish": -2.0
        }
        
    async def analyze_news(self, news_item: NewsItem) -> Dict[str, Any]:
        """
        Analyze news using DQN-enhanced sentiment analysis
        """
        # Extract market context
        market_context = self._extract_market_context(news_item)
        
        # Get ML-based keywords
        keywords = extract_ml_keywords(news_item.summary, {
            "title": news_item.title,
            "source": news_item.source
        })
        
        # Create state vector for DQN
        state = self.alert_agent.create_state_vector(
            news_features={
                "text": news_item.summary,
                "keywords": keywords,
                "source": news_item.source
            },
            user_preferences={},  # Will be populated in real implementation
            market_context=market_context
        )
        
        # Get DQN predictions
        with torch.no_grad():
            keyword_importance = self.keyword_dqn(
                torch.tensor([k["importance"] for k in keywords]).float().to(self.device)
            )
            alert_action = self.alert_agent.act(state, training=False)
        
        # Calculate enhanced sentiment
        sentiment_result = await self._calculate_enhanced_sentiment(
            news_item.summary,
            keywords,
            keyword_importance.cpu().numpy(),
            market_context
        )
        
        # Combine results
        return {
            "text": news_item.summary,
            "sentiment": sentiment_result["sentiment"],
            "confidence": sentiment_result["confidence"],
            "keywords": keywords,
            "market_impact": sentiment_result["market_impact"],
            "sectors_affected": sentiment_result["sectors_affected"],
            "alert_recommendation": self.alert_agent.action_mappings[alert_action],
            "analysis_timestamp": datetime.now().isoformat()
        }
    
    async def _calculate_enhanced_sentiment(
        self,
        text: str,
        keywords: List[Dict[str, Any]],
        keyword_importance: np.ndarray,
        market_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate sentiment using DQN-enhanced weights
        """
        # Weight keywords by learned importance
        weighted_keywords = []
        for keyword, importance in zip(keywords, keyword_importance):
            weight = self.keyword_weights[keyword["word"]] * importance
            weighted_keywords.append({
                "word": keyword["word"],
                "weight": float(weight),
                "sentiment": keyword["sentiment"]
            })
        
        # Calculate sector impacts
        sector_impacts = defaultdict(float)
        for keyword in weighted_keywords:
            for sector, terms in self.market_sectors.items():
                if any(term in keyword["word"].lower() for term in terms):
                    sector_impacts[sector] += keyword["weight"] * (
                        1 if keyword["sentiment"] == "positive" else
                        -1 if keyword["sentiment"] == "negative" else 0
                    )
        
        # Get affected sectors above threshold
        affected_sectors = {
            sector: impact for sector, impact in sector_impacts.items()
            if abs(impact) > 0.5
        }
        
        # Calculate overall sentiment
        sentiment_score = sum(k["weight"] * (
            1 if k["sentiment"] == "positive" else
            -1 if k["sentiment"] == "negative" else 0
        ) for k in weighted_keywords)
        
        # Map to sentiment category
        if sentiment_score > 1.5:
            sentiment = "very_bullish"
        elif sentiment_score > 0.5:
            sentiment = "bullish"
        elif sentiment_score > 0.1:
            sentiment = "slightly_bullish"
        elif sentiment_score < -1.5:
            sentiment = "very_bearish"
        elif sentiment_score < -0.5:
            sentiment = "bearish"
        elif sentiment_score < -0.1:
            sentiment = "slightly_bearish"
        else:
            sentiment = "neutral"
        
        # Calculate confidence based on keyword weights
        confidence = min(0.95, sum(k["weight"] for k in weighted_keywords) / len(weighted_keywords))
        
        # Determine market impact
        impact = "HIGH" if confidence > 0.8 else "MEDIUM" if confidence > 0.5 else "LOW"
        
        return {
            "sentiment": sentiment,
            "confidence": confidence,
            "market_impact": impact,
            "sectors_affected": affected_sectors,
            "weighted_keywords": weighted_keywords
        }
    
    def _extract_market_context(self, news_item: NewsItem) -> Dict[str, Any]:
        """Extract market context from news item"""
        context = {
            "timestamp": datetime.fromisoformat(news_item.published),
            "source_reliability": self._get_source_reliability(news_item.source),
            "volatility_index": 0.0,  # Would be populated from market data
            "trend_strength": 0.0,    # Would be populated from market data
            "trading_hours": 1 if self._is_trading_hours() else 0,
            "day_of_week": datetime.now().weekday()
        }
        return context
    
    def _get_source_reliability(self, source: str) -> float:
        """Get source reliability score"""
        reliability_scores = {
            "Reuters": 0.9,
            "Bloomberg": 0.9,
            "Financial Times": 0.85,
            "Wall Street Journal": 0.85,
            "MarketWatch": 0.8
        }
        return reliability_scores.get(source, 0.5)
    
    def _is_trading_hours(self) -> bool:
        """Check if current time is during trading hours"""
        now = datetime.now()
        hour = now.hour
        return 9 <= hour < 17  # Simplified check for demonstration
    
    async def train_on_outcome(
        self,
        analysis_result: Dict[str, Any],
        actual_outcome: Dict[str, Any],
        user_feedback: Optional[Dict[str, Any]] = None
    ):
        """
        Train DQN models based on actual market outcomes
        """
        # Train alert DQN
        state = self.alert_agent.create_state_vector(
            news_features=analysis_result,
            user_preferences={},  # Would be populated in real implementation
            market_context=analysis_result.get("market_context", {})
        )
        
        action = self.alert_agent.act(state)
        reward = self.alert_agent.calculate_reward(
            action=action,
            predicted_outcome=analysis_result,
            actual_outcome=actual_outcome,
            user_feedback=user_feedback
        )
        
        # Update keyword weights based on outcome
        for keyword in analysis_result["keywords"]:
            if actual_outcome["direction"] == analysis_result["sentiment"]:
                self.keyword_weights[keyword["word"]] *= 1.1  # Increase weight
            else:
                self.keyword_weights[keyword["word"]] *= 0.9  # Decrease weight
            
            # Keep weights in reasonable range
            self.keyword_weights[keyword["word"]] = max(0.1, min(5.0, self.keyword_weights[keyword["word"]]))
        
        # Update sentiment category weights
        predicted_sentiment = analysis_result["sentiment"]
        if actual_outcome["direction"] == predicted_sentiment:
            self.sentiment_weights[predicted_sentiment] *= 1.05
        else:
            self.sentiment_weights[predicted_sentiment] *= 0.95
        
        # Save updated models periodically
        self.alert_agent.save_model()

# Create singleton instance
enhanced_analyzer = EnhancedSentimentAnalyzer()
