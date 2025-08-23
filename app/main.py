import uvicorn
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from api.ai_alerts import router as ai_alerts_router
from api.notifications import router as notifications_router
from core.config import settings
from core.database import create_db_and_tables
from core.initialize import initialize_app

app = FastAPI(
    title="Integra Markets API",
    description="Sentiment analysis & market intelligence platform for commodity traders",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api")
app.include_router(ai_alerts_router)
app.include_router(notifications_router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    """Initialize database, NLTL, and other startup tasks"""
    # Create database tables
    create_db_and_tables()
    
    # Initialize NLTK, FinBERT, and check API keys
    initialize_app()
    
    # Initialize sentiment analyzer
    from services.enhanced_sentiment import sentiment_analyzer
    await sentiment_analyzer.initialize()

@app.get("/")
async def root():
    """Root endpoint for health checks"""
    return {
        "status": "online",
        "service": "Integra Markets API",
        "version": app.version,
        "features": {
            "sentiment_analysis": True,
            "market_data": settings.ALPHA_VANTAGE_API_KEY is not None,
            "finbert": settings.HUGGING_FACE_TOKEN is not None
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for React Native app"""
    return {"status": "healthy", "timestamp": "2024-01-01T00:00:00Z"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
