"""
API Routes for Integra Markets
Enhanced with FinBERT and VADER sentiment analysis
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import datetime

# Import services
from services.enhanced_sentiment import analyze_market_sentiment, sentiment_analyzer
from services.news_preprocessing import preprocess_news, create_pipeline_ready_output
from services.weather import get_weather_alerts

# Create API router
api_router = APIRouter()

# Request models
class NewsPreprocessRequest(BaseModel):
    text: str

class SentimentAnalysisRequest(BaseModel):
    text: str
    commodity: Optional[str] = None
    enhanced: bool = False

class ComprehensiveAnalysisRequest(BaseModel):
    text: str
    commodity: Optional[str] = None
    include_preprocessing: bool = True
    include_finbert: bool = True

# --- Enhanced Sentiment Analysis Endpoints ---
@api_router.post("/analyze-sentiment", response_model=Dict[str, Any])
async def analyze_sentiment_endpoint(request: SentimentAnalysisRequest):
    """
    Enhanced sentiment analysis using FinBERT and VADER
    """
    try:
        if not request.text or request.text.strip() == "":
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        result = await analyze_market_sentiment(
            text=request.text,
            commodity=request.commodity,
            enhanced=request.enhanced
        )
        
        return {
            "status": "success",
            "analysis": result,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing sentiment: {str(e)}")

@api_router.post("/comprehensive-analysis", response_model=Dict[str, Any])
async def comprehensive_analysis_endpoint(request: ComprehensiveAnalysisRequest):
    """
    Complete analysis combining preprocessing, FinBERT, and VADER
    """
    try:
        if not request.text or request.text.strip() == "":
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        result = {
            "text": request.text,
            "commodity": request.commodity,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        
        # Add preprocessing if requested
        if request.include_preprocessing:
            preprocessing_result = preprocess_news(request.text)
            result["preprocessing"] = preprocessing_result
            
            # Use commodity from preprocessing if not provided
            if not request.commodity and "commodity" in preprocessing_result:
                request.commodity = preprocessing_result["commodity"]
        
        # Add enhanced sentiment analysis
        sentiment_result = await analyze_market_sentiment(
            text=request.text,
            commodity=request.commodity,
            enhanced=request.include_finbert
        )
        result["sentiment_analysis"] = sentiment_result
        
        # Generate trading recommendations
        if request.include_preprocessing and sentiment_result:
            result["trading_intelligence"] = generate_trading_intelligence(
                preprocessing_result if request.include_preprocessing else {},
                sentiment_result,
                request.commodity
            )
        
        return {
            "status": "success",
            "analysis": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in comprehensive analysis: {str(e)}")

def generate_trading_intelligence(preprocessing: Dict, sentiment: Dict, commodity: str) -> Dict:
    """Generate actionable trading intelligence"""
    
    # Extract key data
    market_impact = sentiment.get("market_impact", "neutral")
    confidence = sentiment.get("confidence", 0.5)
    severity = sentiment.get("severity", "low")
    event_type = preprocessing.get("event_type", "market_movement")
    region = preprocessing.get("region", "Global")
    
    # Generate recommendations
    recommendations = []
    risk_level = "LOW"
    
    if confidence > 0.8 and severity == "high":
        risk_level = "HIGH"
        if market_impact == "bullish":
            recommendations.extend([
                f"Consider long positions in {commodity}",
                "Monitor for entry points on any dips",
                "Set stop-losses below key support levels"
            ])
        elif market_impact == "bearish":
            recommendations.extend([
                f"Consider reducing {commodity} exposure", 
                "Look for short opportunities",
                "Hedge existing long positions"
            ])
    elif confidence > 0.6:
        risk_level = "MEDIUM"
        recommendations.extend([
            f"Watch {commodity} closely for volatility",
            "Consider smaller position sizes",
            "Monitor for confirmation signals"
        ])
    else:
        recommendations.extend([
            "Maintain current positions",
            "Wait for clearer signals",
            "Focus on risk management"
        ])
    
    # Time horizon based on event type
    if event_type in ["geopolitical_tension", "supply_shock"]:
        time_horizon = "1-7 days"
    elif event_type == "weather_event":
        time_horizon = "2-4 weeks"
    else:
        time_horizon = "24-72 hours"
    
    return {
        "market_impact": market_impact.upper(),
        "risk_level": risk_level,
        "confidence_score": f"{confidence:.1%}",
        "time_horizon": time_horizon,
        "recommendations": recommendations,
        "key_levels_to_watch": [
            "Support/Resistance levels",
            "Volume confirmation",
            "Related commodity correlations"
        ]
    }

# --- News Preprocessing Endpoints ---
@api_router.post("/preprocess-news", response_model=Dict[str, Any])
async def preprocess_news_endpoint(request: NewsPreprocessRequest):
    """
    Preprocesses raw news text using domain knowledge from commodity trading experts
    """
    try:
        if not request.text or request.text.strip() == "":
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        result = preprocess_news(request.text)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error preprocessing news: {str(e)}")

@api_router.post("/preprocess-news/pipeline", response_model=Dict[str, Any])
async def preprocess_news_pipeline_endpoint(request: NewsPreprocessRequest):
    """
    Preprocesses news text and returns pipeline-ready output with enhanced context
    """
    try:
        if not request.text or request.text.strip() == "":
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        result = create_pipeline_ready_output(request.text)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating pipeline output: {str(e)}")

# --- Sentiment Analysis Endpoints ---
@api_router.get("/sentiment/market", response_model=Dict[str, Any])
async def get_market_sentiment():
    """
    Returns overall market sentiment analysis for commodities
    """
    try:
        sentiment_data = analyze_market_sentiment()
        return sentiment_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing market sentiment: {str(e)}")

# --- Weather Intelligence Endpoints ---
@api_router.get("/weather/alerts", response_model=Dict[str, Any])
async def get_active_weather_alerts():
    """
    Returns active weather alerts affecting commodity markets
    """
    try:
        alerts = get_weather_alerts()
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving weather alerts: {str(e)}")

# --- Health Check Endpoints ---
@api_router.get("/health")
async def health_check():
    """Enhanced health check with model status"""
    
    # Check if sentiment analyzer is initialized
    analyzer_status = {
        "initialized": sentiment_analyzer.initialized,
        "vader_available": sentiment_analyzer.vader_analyzer is not None,
        "finbert_available": sentiment_analyzer.finbert_model is not None
    }
    
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "services": {
            "sentiment_analysis": analyzer_status,
            "news_preprocessing": True,
            "api_endpoints": True
        }
    }

@api_router.get("/models/status")
async def models_status():
    """Check status of ML models"""
    
    # Initialize if not already done
    if not sentiment_analyzer.initialized:
        await sentiment_analyzer.initialize()
    
    return {
        "sentiment_analyzer": {
            "initialized": sentiment_analyzer.initialized,
            "vader": {
                "available": sentiment_analyzer.vader_analyzer is not None,
                "status": "ready" if sentiment_analyzer.vader_analyzer else "not_loaded"
            },
            "finbert": {
                "available": sentiment_analyzer.finbert_model is not None,
                "status": "ready" if sentiment_analyzer.finbert_model else "not_loaded"
            }
        }
    }

# --- Demo endpoints for testing ---
@api_router.get("/demo/market_sentiment")
async def demo_market_sentiment():
    """
    Demo endpoint that returns sample market sentiment data
    """
    return {
        "overall": "BEARISH",
        "confidence": 78,
        "commodities": [
            {"name": "OIL", "change": -1.2},
            {"name": "NAT GAS", "change": 0.7},
            {"name": "WHEAT", "change": -2.3},
            {"name": "GOLD", "change": -0.1}
        ]
    }

@api_router.get("/demo/top_movers")
async def demo_top_movers():
    """
    Demo endpoint that returns sample top movers data
    """
    return [
        {"symbol": "OIL", "sentiment": -2.1, "trend": "down"},
        {"symbol": "CORN", "sentiment": 1.7, "trend": "up"},
        {"symbol": "COPPER", "sentiment": -0.8, "trend": "down"},
        {"symbol": "SILVER", "sentiment": 0.3, "trend": "up"}
    ]

@api_router.get("/demo/news_analysis")
async def demo_news_analysis():
    """
    Demo endpoint that returns sample news analysis data
    """
    return [
        {
            "id": 1,
            "sentiment": "BEARISH",
            "headline": "Oil prices drop as recession fears grow amid weak economic data",
            "source": "Reuters",
            "timeAgo": "47m ago",
            "commodity": "OIL",
            "isPremium": False
        },
        {
            "id": 2,
            "sentiment": "BULLISH",
            "headline": "OPEC+ considers additional output cuts to stabilize markets",
            "source": "Bloomberg",
            "timeAgo": "2h ago",
            "commodity": "OIL",
            "isPremium": True
        }
    ]

@api_router.get("/demo/weather_alerts")
async def demo_weather_alerts():
    """
    Demo endpoint that returns sample weather alert data
    """
    return {
        "message": "Drought conditions worsening in key wheat producing regions"
    }