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

from ..news_aggregator.news_fetcher import NewsItem
from ..app.services.keyword_ml_processor import KeywordDQN, extract_ml_keywords
from ..app.services.alert_rl_model import CommodityAlertDQN, AlertRecommendationAgent

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
