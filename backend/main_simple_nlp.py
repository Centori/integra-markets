from fastapi import FastAPI, HTTPException
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
from contextlib import asynccontextmanager

# Import article summarizer
try:
    from article_summarizer import ArticleSummarizer
    SUMMARIZER_AVAILABLE = True
except ImportError:
    SUMMARIZER_AVAILABLE = False

# Import Groq AI service
try:
    from groq_ai_service import GroqAIService, ResponseMode
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    logging.warning("Groq AI service not available")

# NLTK imports
try:
    import nltk
    from nltk.sentiment.vader import SentimentIntensityAnalyzer
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False

# Load environment variables
parent_dir = Path(__file__).parent.parent
env_path = parent_dir / '.env'
load_dotenv(env_path)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize VADER analyzer
vader_analyzer = None
article_summarizer = None
groq_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""
    global vader_analyzer, article_summarizer, groq_service
    
    logger.info("Starting Integra Markets Enhanced Backend with NLP...")
    
    if NLTK_AVAILABLE:
        try:
            # Download required NLTK data
            try:
                nltk.data.find('vader_lexicon')
            except LookupError:
                logger.info("Downloading VADER lexicon...")
                nltk.download('vader_lexicon', quiet=True)
            
            # Initialize VADER
            vader_analyzer = SentimentIntensityAnalyzer()
            logger.info("VADER sentiment analyzer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize VADER: {e}")
    else:
        logger.warning("NLTK not available - using basic sentiment analysis")
    
    # Initialize article summarizer
    if SUMMARIZER_AVAILABLE:
        try:
            article_summarizer = ArticleSummarizer()
            logger.info("Article summarizer initialized")
        except Exception as e:
            logger.error(f"Failed to initialize article summarizer: {e}")
    
    # Initialize Groq AI service
    if GROQ_AVAILABLE and os.getenv("GROQ_API_KEY"):
        try:
            groq_service = GroqAIService()
            logger.info("Groq AI service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Groq AI: {e}")
    
    yield
    
    # Cleanup
    logger.info("Shutting down...")

# Create FastAPI app
app = FastAPI(
    title="Integra Markets AI Backend",
    description="Financial AI Analysis API with NLP Support",
    version="2.1.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers for notifications and push verification
try:
    from api.notifications import router as notifications_router
    from api.push_verify import router as push_verify_router
    app.include_router(notifications_router)
    app.include_router(push_verify_router)
    logger.info("Routers included: notifications and push verification")
except Exception as e:
    logger.error(f"Failed to include routers: {e}")

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

class NewsAnalysisRequest(BaseModel):
    text: str
    source: Optional[str] = None

class ArticleSummarizeRequest(BaseModel):
    url: str = Field(..., description="URL of the article to summarize")
    sentences: int = Field(5, ge=1, le=10, description="Number of sentences in summary")
    commodity: Optional[str] = Field(None, description="Specific commodity to focus on")

class AIAnalysisRequest(BaseModel):
    query: str = Field(..., description="Query for AI analysis")
    commodity: Optional[str] = Field(None, description="Specific commodity context")
    use_tools: bool = Field(True, description="Enable tool use")
    search_web: bool = Field(True, description="Enable web search")

class AIChatRequest(BaseModel):
    messages: List[Dict[str, str]] = Field(..., description="Chat messages")
    available_tools: Optional[List[str]] = Field(None, description="Available tools to use")
    commodity: Optional[str] = Field(None, description="Commodity context")
    mode: Optional[str] = Field("reasoning", description="Response mode")

# Root endpoint
@app.get('/')
def read_root():
    return {
        "message": "Integra Markets AI Backend (Simplified NLP)",
        "version": "2.1.0",
        "features": {
            "nltk": NLTK_AVAILABLE,
            "vader": vader_analyzer is not None,
            "supabase": bool(supabase),
            "groq_ai": groq_service is not None,
            "article_summarizer": article_summarizer is not None
        },
        "endpoints": [
            "/health",
            "/api/sentiment",
            "/api/sentiment/market",
            "/api/sentiment/movers", 
            "/api/news/analysis",
            "/api/weather/alerts",
            "/api/models/status",
            "/api/summarize/article",
            "/ai/analyze",
            "/ai/chat",
            "/ai/report"
        ]
    }

# Health check
@app.get('/health')
def health_check():
    return {
        "status": "healthy",
        "supabase_connected": bool(supabase),
        "nltk_available": NLTK_AVAILABLE,
        "vader_available": vader_analyzer is not None,
        "timestamp": datetime.datetime.now().isoformat()
    }

# Models status
@app.get('/api/models/status')
def get_models_status():
    return {
        "nltk_available": NLTK_AVAILABLE,
        "vader_available": vader_analyzer is not None,
        "finbert_available": False,  # Not in this simplified version
        "groq_available": groq_service is not None,
        "models_loaded": vader_analyzer is not None or groq_service is not None
    }

# Enhanced sentiment analysis
@app.post('/api/sentiment')
async def analyze_sentiment(request: SentimentRequest):
    try:
        if vader_analyzer:
            # Use VADER for sentiment analysis
            scores = vader_analyzer.polarity_scores(request.text)
            
            # Determine overall sentiment
            compound = scores['compound']
            if compound >= 0.05:
                sentiment = "BULLISH"
                confidence = 0.5 + (compound * 0.5)
            elif compound <= -0.05:
                sentiment = "BEARISH" 
                confidence = 0.5 + (abs(compound) * 0.5)
            else:
                sentiment = "NEUTRAL"
                confidence = 0.5 + (abs(compound) * 2)
            
            # Add commodity-specific context if provided
            if request.commodity:
                # Adjust sentiment based on commodity keywords
                commodity_keywords = {
                    "oil": ["production", "opec", "barrel", "crude", "petroleum"],
                    "gold": ["mining", "precious", "metal", "bullion", "reserve"],
                    "wheat": ["harvest", "grain", "crop", "yield", "agriculture"],
                    "gas": ["natural gas", "lng", "pipeline", "energy", "heating"]
                }
                
                text_lower = request.text.lower()
                if request.commodity.lower() in commodity_keywords:
                    keywords = commodity_keywords[request.commodity.lower()]
                    keyword_count = sum(1 for kw in keywords if kw in text_lower)
                    if keyword_count > 0:
                        confidence = min(0.95, confidence + (keyword_count * 0.05))
            
            return {
                "text": request.text,
                "sentiment": sentiment,
                "confidence": round(confidence, 3),
                "method": "vader",
                "commodity_specific": request.commodity is not None,
                "scores": {
                    "compound": round(scores['compound'], 3),
                    "positive": round(scores['pos'], 3),
                    "negative": round(scores['neg'], 3),
                    "neutral": round(scores['neu'], 3)
                }
            }
        else:
            # Fallback to basic analysis
            return basic_sentiment_analysis(request.text, request.commodity)
            
    except Exception as e:
        logger.error(f"Sentiment analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Market sentiment endpoint
@app.get('/api/sentiment/market')
async def get_market_sentiment():
    try:
        # Aggregate market sentiment (in production, this would use real data)
        commodities_sentiment = [
            {"name": "OIL", "sentiment": "BULLISH", "change": 2.5, "confidence": 0.75},
            {"name": "NAT GAS", "sentiment": "BEARISH", "change": -1.8, "confidence": 0.68},
            {"name": "WHEAT", "sentiment": "NEUTRAL", "change": 0.3, "confidence": 0.52},
            {"name": "GOLD", "sentiment": "BULLISH", "change": 1.2, "confidence": 0.71},
            {"name": "CORN", "sentiment": "NEUTRAL", "change": -0.5, "confidence": 0.55},
            {"name": "COPPER", "sentiment": "BEARISH", "change": -2.1, "confidence": 0.69}
        ]
        
        # Calculate overall market sentiment
        bullish_count = sum(1 for c in commodities_sentiment if c["sentiment"] == "BULLISH")
        bearish_count = sum(1 for c in commodities_sentiment if c["sentiment"] == "BEARISH")
        
        if bullish_count > bearish_count:
            overall = "BULLISH"
            confidence = 0.65 + (bullish_count - bearish_count) * 0.05
        elif bearish_count > bullish_count:
            overall = "BEARISH"
            confidence = 0.65 + (bearish_count - bullish_count) * 0.05
        else:
            overall = "NEUTRAL"
            confidence = 0.50
        
        return {
            "overall": overall,
            "confidence": round(confidence, 2),
            "timestamp": datetime.datetime.now().isoformat(),
            "commodities": commodities_sentiment,
            "analysis_method": "vader" if vader_analyzer else "basic"
        }
    except Exception as e:
        logger.error(f"Market sentiment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Top movers endpoint
@app.get('/api/sentiment/movers')
async def get_top_movers():
    return [
        {"symbol": "OIL", "sentiment": 0.75, "trend": "bullish", "volume": "high", "change_24h": 2.5},
        {"symbol": "WHEAT", "sentiment": -0.45, "trend": "bearish", "volume": "medium", "change_24h": -1.2},
        {"symbol": "GOLD", "sentiment": 0.60, "trend": "bullish", "volume": "high", "change_24h": 1.8},
        {"symbol": "NAT GAS", "sentiment": -0.55, "trend": "bearish", "volume": "low", "change_24h": -2.1}
    ]

# News analysis endpoint
@app.post('/api/news/analysis')
async def analyze_news(request: NewsAnalysisRequest):
    try:
        # Analyze news using available sentiment analyzer
        sentiment_result = await analyze_sentiment(
            SentimentRequest(text=request.text, enhanced=True)
        )
        
        # Extract key information
        keywords = extract_keywords(request.text)
        market_impact = determine_market_impact(sentiment_result["sentiment"], sentiment_result["confidence"])
        
        return {
            "text": request.text,
            "source": request.source,
            "sentiment": sentiment_result["sentiment"],
            "confidence": sentiment_result["confidence"],
            "keywords": keywords,
            "market_impact": market_impact,
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"News analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Weather alerts endpoint  
@app.get('/api/weather/alerts')
async def get_weather_alerts():
    # Sample weather alerts
    return {
        "alerts": [
            {
                "id": "1",
                "type": "drought",
                "severity": "moderate",
                "region": "Midwest US",
                "impact": "Potential wheat and corn yield reduction",
                "commodities_affected": ["WHEAT", "CORN"],
                "confidence": 0.78,
                "timestamp": datetime.datetime.now().isoformat()
            },
            {
                "id": "2", 
                "type": "frost",
                "severity": "low",
                "region": "Brazil",
                "impact": "Minor risk to coffee production",
                "commodities_affected": ["COFFEE"],
                "confidence": 0.65,
                "timestamp": datetime.datetime.now().isoformat()
            }
        ],
        "last_updated": datetime.datetime.now().isoformat()
    }

# Legacy endpoint for backward compatibility
@app.post('/analyze-sentiment')
async def analyze_sentiment_legacy(request: SentimentRequest):
    result = await analyze_sentiment(request)
    return {
        "text": request.text,
        "sentiment": result["sentiment"].lower(),
        "confidence": result["confidence"],
        "timestamp": datetime.datetime.now().isoformat()
    }

# Helper functions
def basic_sentiment_analysis(text: str, commodity: Optional[str] = None) -> dict:
    """Basic keyword-based sentiment analysis"""
    positive_words = ['surge', 'gain', 'profit', 'growth', 'increase', 'rise', 'boom', 'rally', 'strong', 'high']
    negative_words = ['fall', 'drop', 'loss', 'decline', 'decrease', 'crash', 'plunge', 'cut', 'weak', 'low']
    
    text_lower = text.lower()
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    if positive_count > negative_count:
        sentiment = "BULLISH"
        confidence = min(0.85, 0.6 + (positive_count * 0.08))
    elif negative_count > positive_count:
        sentiment = "BEARISH"
        confidence = min(0.85, 0.6 + (negative_count * 0.08))
    else:
        sentiment = "NEUTRAL"
        confidence = 0.5
    
    return {
        "sentiment": sentiment,
        "confidence": round(confidence, 3),
        "method": "basic_keyword",
        "commodity_specific": commodity is not None
    }

def extract_keywords(text: str) -> List[str]:
    """Extract relevant keywords from text"""
    # Common commodity and market keywords
    keywords = []
    commodity_terms = ["oil", "gas", "wheat", "corn", "gold", "silver", "copper", "coffee", "sugar"]
    market_terms = ["price", "production", "supply", "demand", "forecast", "harvest", "export", "import"]
    
    text_lower = text.lower()
    for term in commodity_terms + market_terms:
        if term in text_lower:
            keywords.append(term)
    
    return keywords[:5]  # Return top 5 keywords

def determine_market_impact(sentiment: str, confidence: float) -> str:
    """Determine market impact based on sentiment and confidence"""
    if confidence >= 0.8:
        if sentiment == "BULLISH":
            return "strong_positive"
        elif sentiment == "BEARISH":
            return "strong_negative"
    elif confidence >= 0.6:
        if sentiment == "BULLISH":
            return "moderate_positive"
        elif sentiment == "BEARISH":
            return "moderate_negative"
    
    return "neutral"

# Article summarization endpoint
@app.post('/api/summarize/article')
async def summarize_article(request: ArticleSummarizeRequest):
    """Summarize a financial news article from URL"""
    if not SUMMARIZER_AVAILABLE or not article_summarizer:
        return {
            "error": "Article summarization not available",
            "url": request.url,
            "fallback": True,
            "message": "Please install sumy or newspaper3k for article summarization"
        }
    
    try:
        # Summarize the article
        if request.commodity:
            result = article_summarizer.summarize_commodity_news(request.url, request.commodity)
        else:
            result = article_summarizer.summarize_url(request.url, request.sentences)
        
        # Add sentiment analysis to summary
        if 'summary' in result and result['summary']:
            summary_text = ' '.join(result['summary'])
            sentiment_analysis = await analyze_sentiment(
                SentimentRequest(text=summary_text, commodity=request.commodity)
            )
            result['sentiment_analysis'] = {
                "overall": sentiment_analysis['sentiment'],
                "confidence": sentiment_analysis['confidence']
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Article summarization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Groq AI Analysis endpoint
@app.post('/ai/analyze')
async def ai_analyze(request: AIAnalysisRequest):
    """Perform AI analysis with reasoning and tools"""
    if not GROQ_AVAILABLE or not groq_service:
        # Fallback to basic sentiment analysis
        sentiment_result = await analyze_sentiment(
            SentimentRequest(text=request.query, commodity=request.commodity)
        )
        return {
            "query": request.query,
            "analysis": sentiment_result,
            "reasoning": "Using basic sentiment analysis (Groq AI not available)",
            "tool_results": []
        }
    
    try:
        result = await groq_service.analyze_with_reasoning(
            request.query,
            commodity=request.commodity,
            use_tools=request.use_tools,
            search_web=request.search_web
        )
        return result
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Groq AI Chat endpoint
@app.post('/ai/chat')
async def ai_chat(request: AIChatRequest):
    """Chat with AI using tool capabilities"""
    if not GROQ_AVAILABLE or not groq_service:
        return {
            "response": "I'm currently using basic analysis. Groq AI is not available.",
            "tool_results": [],
            "messages": request.messages
        }
    
    try:
        # Add commodity context if provided
        if request.commodity and request.messages:
            request.messages[0]["content"] += f" (Context: {request.commodity} commodity)"
        
        result = await groq_service.chat_with_tools(
            request.messages,
            available_tools=request.available_tools
        )
        return result
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Groq AI Market Report endpoint
@app.post('/ai/report')
async def generate_ai_report(
    commodities: List[str] = ["oil", "gold", "wheat"],
    include_predictions: bool = True,
    include_news: bool = True
):
    """Generate comprehensive AI market report"""
    if not GROQ_AVAILABLE or not groq_service:
        # Return basic report
        return {
            "generated_at": datetime.datetime.now().isoformat(),
            "commodities": {c: {"sentiment": "neutral", "confidence": 0.5} for c in commodities},
            "overview": "AI analysis not available. Using basic sentiment.",
            "insights": ["Limited analysis available without Groq AI"]
        }
    
    try:
        report = await groq_service.generate_market_report(
            commodities,
            include_predictions=include_predictions,
            include_news=include_news
        )
        return report
    except Exception as e:
        logger.error(f"AI report generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
