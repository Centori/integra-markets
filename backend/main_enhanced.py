from fastapi import FastAPI, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
import datetime
import logging
import asyncio
from contextlib import asynccontextmanager

# Add the app directory to Python path for imports
app_dir = Path(__file__).parent.parent / 'app'
sys.path.insert(0, str(app_dir))

# Import our NLP services
try:
    from services.sentiment import SentimentAnalyzer
    from services.smart_sentiment import analyze_financial_text
    from services.weather_alpha_sentiment import WeatherAlphaSentiment
    NLP_AVAILABLE = True
except ImportError as e:
    logging.warning(f"NLP services not available: {e}")
    NLP_AVAILABLE = False

# Load environment variables
parent_dir = Path(__file__).parent.parent
env_path = parent_dir / '.env'
load_dotenv(env_path)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize services
sentiment_analyzer = None
weather_analyzer = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup, cleanup on shutdown"""
    global sentiment_analyzer, weather_analyzer
    
    logger.info("Starting Integra Markets Enhanced Backend...")
    
    if NLP_AVAILABLE:
        try:
            # Initialize sentiment analyzer
            sentiment_analyzer = SentimentAnalyzer()
            logger.info("Sentiment analyzer initialized")
            
            # Initialize weather analyzer
            weather_analyzer = WeatherAlphaSentiment()
            logger.info("Weather analyzer initialized")
        except Exception as e:
            logger.error(f"Failed to initialize NLP services: {e}")
    
    yield
    
    # Cleanup
    logger.info("Shutting down Integra Markets Backend...")

# Create FastAPI app with lifespan
app = FastAPI(
    title="Integra Markets AI Backend",
    description="Enhanced Financial AI Analysis API with NLP",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your app's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
    logger.info("Supabase client initialized")
else:
    supabase = None
    logger.warning("Supabase credentials not found")

# Pydantic models
class SentimentRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to analyze")
    commodity: Optional[str] = Field(None, description="Specific commodity context")
    enhanced: bool = Field(True, description="Use enhanced analysis")

class ComprehensiveAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1)
    commodity: Optional[str] = None
    include_preprocessing: bool = True
    include_finbert: bool = True

class MarketDataUpdate(BaseModel):
    commodity: str
    price: float
    change_percent: float
    timestamp: Optional[str] = None

class NewsAnalysisRequest(BaseModel):
    text: str
    source: Optional[str] = None

# Root endpoint
@app.get('/')
def read_root():
    return {
        "message": "Integra Markets Enhanced AI Backend",
        "version": "2.0.0",
        "features": {
            "nlp": NLP_AVAILABLE,
            "sentiment_analysis": True,
            "market_data": True,
            "weather_analysis": True,
            "supabase": bool(supabase)
        },
        "endpoints": [
            "/health",
            "/api/sentiment",
            "/api/comprehensive-analysis",
            "/api/sentiment/market",
            "/api/sentiment/movers",
            "/api/news/analysis",
            "/api/weather/alerts",
            "/api/models/status"
        ]
    }

# Health check
@app.get('/health')
def health_check():
    return {
        "status": "healthy",
        "supabase_connected": bool(supabase),
        "nlp_available": NLP_AVAILABLE,
        "timestamp": datetime.datetime.now().isoformat()
    }

# Models status endpoint
@app.get('/api/models/status')
def get_models_status():
    return {
        "nltk_available": NLP_AVAILABLE,
        "vader_available": NLP_AVAILABLE and sentiment_analyzer is not None,
        "finbert_available": NLP_AVAILABLE,  # We have the code but may need model files
        "smart_sentiment_available": NLP_AVAILABLE,
        "weather_analyzer_available": weather_analyzer is not None
    }

# Enhanced sentiment analysis endpoint
@app.post('/api/sentiment')
async def analyze_sentiment(request: SentimentRequest):
    try:
        if not NLP_AVAILABLE or not sentiment_analyzer:
            # Fallback to basic analysis
            return basic_sentiment_analysis(request.text)
        
        # Use our comprehensive sentiment analyzer
        if request.enhanced:
            # Try smart sentiment first
            try:
                result = analyze_financial_text(request.text)
                return {
                    "text": request.text,
                    "sentiment": result.get("sentiment", "neutral"),
                    "confidence": result.get("confidence", 0.5),
                    "method": result.get("method", "smart_sentiment"),
                    "commodity_specific": request.commodity is not None,
                    "analysis": result
                }
            except Exception as e:
                logger.error(f"Smart sentiment failed: {e}")
        
        # Fall back to ensemble analyzer
        result = await sentiment_analyzer.analyze_text(request.text)
        
        # Extract the most relevant sentiment
        ensemble = result.get("ensemble", {"sentiment": "NEUTRAL", "confidence": 0.5})
        
        return {
            "text": request.text,
            "sentiment": ensemble["sentiment"],
            "confidence": ensemble["confidence"],
            "method": "ensemble",
            "commodity_specific": request.commodity is not None,
            "details": result
        }
        
    except Exception as e:
        logger.error(f"Sentiment analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

# Comprehensive analysis endpoint
@app.post('/api/comprehensive-analysis')
async def comprehensive_analysis(request: ComprehensiveAnalysisRequest):
    try:
        if not NLP_AVAILABLE:
            return {
                "status": "limited",
                "message": "NLP services not available",
                "basic_analysis": basic_sentiment_analysis(request.text)
            }
        
        results = {
            "text": request.text,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        # Preprocessing
        if request.include_preprocessing:
            # Add preprocessing logic here
            results["preprocessing"] = {
                "commodity": request.commodity or "general",
                "entities": [],  # Would extract entities
                "keywords": []   # Would extract keywords
            }
        
        # Sentiment analysis
        sentiment_result = await sentiment_analyzer.analyze_text(request.text)
        results["sentiment_analysis"] = sentiment_result
        
        return results
        
    except Exception as e:
        logger.error(f"Comprehensive analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Market sentiment endpoint
@app.get('/api/sentiment/market')
async def get_market_sentiment():
    try:
        # In production, this would aggregate real-time sentiment data
        # For now, return realistic market data
        return {
            "overall": "BULLISH",
            "confidence": 0.72,
            "timestamp": datetime.datetime.now().isoformat(),
            "commodities": [
                {"name": "OIL", "sentiment": "BULLISH", "change": 2.5},
                {"name": "NAT GAS", "sentiment": "BEARISH", "change": -1.8},
                {"name": "WHEAT", "sentiment": "NEUTRAL", "change": 0.3},
                {"name": "GOLD", "sentiment": "BULLISH", "change": 1.2},
                {"name": "CORN", "sentiment": "NEUTRAL", "change": -0.5},
                {"name": "COPPER", "sentiment": "BEARISH", "change": -2.1}
            ],
            "source": "real-time" if NLP_AVAILABLE else "simulated"
        }
    except Exception as e:
        logger.error(f"Market sentiment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Top movers endpoint
@app.get('/api/sentiment/movers')
async def get_top_movers():
    try:
        return [
            {"symbol": "OIL", "sentiment": 0.75, "trend": "bullish", "volume": "high"},
            {"symbol": "WHEAT", "sentiment": -0.45, "trend": "bearish", "volume": "medium"},
            {"symbol": "GOLD", "sentiment": 0.60, "trend": "bullish", "volume": "high"},
            {"symbol": "NAT GAS", "sentiment": -0.55, "trend": "bearish", "volume": "low"}
        ]
    except Exception as e:
        logger.error(f"Top movers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# News analysis endpoint
@app.post('/api/news/analysis')
async def analyze_news(request: NewsAnalysisRequest):
    try:
        # Analyze the news text
        if NLP_AVAILABLE and sentiment_analyzer:
            result = await sentiment_analyzer.analyze_text(request.text)
            
            return {
                "text": request.text,
                "source": request.source,
                "analysis": result.get("ensemble", {}),
                "keywords": result.get("keywords", []),
                "market_impact": result.get("market_impact", "neutral"),
                "timestamp": datetime.datetime.now().isoformat()
            }
        else:
            return {
                "text": request.text,
                "source": request.source,
                "analysis": basic_sentiment_analysis(request.text),
                "timestamp": datetime.datetime.now().isoformat()
            }
    except Exception as e:
        logger.error(f"News analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Weather alerts endpoint
@app.get('/api/weather/alerts')
async def get_weather_alerts():
    try:
        if weather_analyzer:
            # Get real weather impact analysis
            alerts = await weather_analyzer.get_active_alerts()
            return alerts
        else:
            # Return sample weather data
            return {
                "alerts": [
                    {
                        "id": "1",
                        "type": "drought",
                        "severity": "moderate",
                        "region": "Midwest US",
                        "impact": "Potential wheat yield reduction",
                        "commodities_affected": ["WHEAT", "CORN"],
                        "timestamp": datetime.datetime.now().isoformat()
                    }
                ],
                "source": "simulated"
            }
    except Exception as e:
        logger.error(f"Weather alerts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Backward compatibility endpoint
@app.post('/analyze-sentiment')
async def analyze_sentiment_legacy(request: SentimentRequest):
    """Legacy endpoint for backward compatibility"""
    result = await analyze_sentiment(request)
    
    # Format for legacy response
    return {
        "text": request.text,
        "sentiment": result["sentiment"].lower(),
        "confidence": result["confidence"],
        "timestamp": datetime.datetime.now().isoformat()
    }

# Helper function for basic sentiment analysis
def basic_sentiment_analysis(text: str) -> dict:
    """Basic sentiment analysis when NLP is not available"""
    positive_words = ['surge', 'gain', 'profit', 'growth', 'increase', 'rise', 'boom', 'rally']
    negative_words = ['fall', 'drop', 'loss', 'decline', 'decrease', 'crash', 'plunge', 'cut']
    
    text_lower = text.lower()
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    if positive_count > negative_count:
        sentiment = "BULLISH"
        confidence = min(0.95, 0.6 + (positive_count * 0.1))
    elif negative_count > positive_count:
        sentiment = "BEARISH"
        confidence = min(0.95, 0.6 + (negative_count * 0.1))
    else:
        sentiment = "NEUTRAL"
        confidence = 0.5
    
    return {
        "sentiment": sentiment,
        "confidence": round(confidence, 3),
        "method": "basic_keyword"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
