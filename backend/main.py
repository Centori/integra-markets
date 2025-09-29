from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
from pydantic import BaseModel

# Load environment variables (Cloud Run will provide them directly)
load_dotenv()  # This will load from .env if present, but won't fail if missing

app = FastAPI(title="Integra AI Backend", description="Financial AI Analysis API")

# Add CORS middleware to allow requests from your React Native app
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
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY environment variables")

supabase: Client = create_client(supabase_url, supabase_key)

# Pydantic models for request/response
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
    return {
        "message": "Integra AI Backend is running!",
        "version": "1.0.1",  # Updated version
        "endpoints": ["/analyze-sentiment", "/health"]
    }

@app.get('/health')
def health_check():
    return {"status": "healthy", "supabase_connected": bool(supabase_url and supabase_key)}

@app.post('/analyze-sentiment', response_model=SentimentResponse)
def analyze_sentiment(request: SentimentRequest):
    try:
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # TODO: Replace with actual NLTK and FinBERT implementation
        # For now, return mock data
        import datetime
        
        # Simple mock sentiment analysis
        positive_words = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'profit', 'gain']
        negative_words = ['bad', 'terrible', 'awful', 'loss', 'deficit', 'poor']
        
        text_lower = request.text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            sentiment = "positive"
            confidence = min(0.95, 0.6 + (positive_count * 0.1))
        elif negative_count > positive_count:
            sentiment = "negative"
            confidence = min(0.95, 0.6 + (negative_count * 0.1))
        else:
            sentiment = "neutral"
            confidence = 0.5
        
        return SentimentResponse(
            text=request.text,
            sentiment=sentiment,
            confidence=round(confidence, 3),
            timestamp=datetime.datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
