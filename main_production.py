from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
from pydantic import BaseModel
import logging

# Configure logging for production
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# DB - Import with error handling
try:
    from backend.db import init_db, close_db
except ImportError:
    logger.warning("Could not import database functions")
    async def init_db():
        pass
    async def close_db():
        pass

# Routers - Import with error handling
try:
    from backend.api.notifications import router as notifications_router
    notifications_available = True
except ImportError as e:
    logger.warning(f"Could not import notifications router: {e}")
    notifications_available = False

try:
    from backend.api.market_data import router as market_data_router
    market_data_available = True
except ImportError as e:
    logger.warning(f"Could not import market_data router: {e}")
    market_data_available = False

try:
    from backend.api.news import router as news_router
    news_available = True
except ImportError as e:
    logger.warning(f"Could not import news router: {e}")
    news_available = False

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Integra AI Backend", 
    description="Financial AI Analysis API",
    version="1.0.0"
)

# Lifespan events
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up Integra AI Backend...")
    await init_db()
    logger.info("Database initialized successfully")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Integra AI Backend...")
    await close_db()
    logger.info("Database connections closed")

# Mount routers with error handling
if notifications_available:
    app.include_router(notifications_router)
    logger.info("Notifications router mounted")
else:
    logger.warning("Notifications router not available")

if market_data_available:
    app.include_router(market_data_router)
    logger.info("Market data router mounted")
else:
    logger.warning("Market data router not available")

if news_available:
    app.include_router(news_router)
    logger.info("News router mounted")
else:
    logger.warning("News router not available")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your app's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get Supabase URL and Key from environment variables
supabase_url: str = os.getenv("SUPABASE_URL")
supabase_key: str = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    logger.error("Missing SUPABASE_URL or SUPABASE_KEY environment variables")
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY environment variables")

supabase: Client = create_client(supabase_url, supabase_key)

# Pydantic models
class SentimentRequest(BaseModel):
    text: str
    user_id: str = None

class SentimentResponse(BaseModel):
    text: str
    sentiment: str
    confidence: float
    timestamp: str

@app.get('/')
def read_root():
    """Root endpoint"""
    return {
        "message": "Welcome to Integra AI Backend",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "sentiment": "/analyze-sentiment",
            "notifications": "/notifications/*",
            "market_data": "/market/*",
            "news": "/news/*"
        }
    }

@app.get('/health')
def health_check():
    """Health check endpoint for monitoring"""
    logger.info("Health check requested")
    return {"status": "healthy", "service": "integra-ai-backend"}

@app.post('/analyze-sentiment', response_model=SentimentResponse)
def analyze_sentiment(request: SentimentRequest):
    """Analyze sentiment of given text"""
    try:
        from datetime import datetime
        import random
        
        # Simple sentiment analysis (replace with actual ML model)
        text = request.text.lower()
        
        if any(word in text for word in ['good', 'great', 'excellent', 'positive', 'bullish']):
            sentiment = 'positive'
            confidence = random.uniform(0.7, 0.95)
        elif any(word in text for word in ['bad', 'terrible', 'negative', 'bearish', 'decline']):
            sentiment = 'negative'
            confidence = random.uniform(0.7, 0.95)
        else:
            sentiment = 'neutral'
            confidence = random.uniform(0.5, 0.8)
        
        response = SentimentResponse(
            text=request.text,
            sentiment=sentiment,
            confidence=confidence,
            timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"Sentiment analysis completed for user {request.user_id}: {sentiment} ({confidence:.2f})")
        return response
        
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sentiment analysis failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting server on 0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)