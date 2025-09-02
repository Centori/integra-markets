from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
from pydantic import BaseModel

# Load environment variables from parent directory's .env file
parent_dir = Path(__file__).parent.parent
env_path = parent_dir / '.env'
load_dotenv(env_path)

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

# Initialize Supabase client only if credentials are available
supabase: Client = None
if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)
    print("✅ Supabase client initialized")
else:
    print("⚠️  Supabase credentials not found - some features will be limited")

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

# Push Notification Verification Endpoints
@app.get('/api/push/verify')
def verify_push_setup():
    """Verify push notification setup without requiring database"""
    
    result = {
        "expo_sdk_available": False,
        "push_client_available": False,
        "token_validation_working": False,
        "sample_token_valid": False,
        "ready_to_send": False,
        "details": {}
    }
    
    # Check 1: Expo SDK availability
    try:
        from exponent_server_sdk import PushClient, PushMessage
        result["expo_sdk_available"] = True
        result["details"]["expo_sdk_version"] = "2.1.0"
    except ImportError:
        result["details"]["expo_sdk_error"] = "exponent-server-sdk not installed"
        return result
    
    # Check 2: Push client creation
    try:
        client = PushClient()
        result["push_client_available"] = True
        result["details"]["push_client"] = "Successfully created"
    except Exception as e:
        result["details"]["push_client_error"] = str(e)
        return result
    
    # Check 3: Token validation
    try:
        # Test with a properly formatted token
        test_token = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
        result["sample_token_valid"] = PushClient.is_exponent_push_token(test_token)
        result["token_validation_working"] = True
        
        # Test with invalid token
        invalid_token = "invalid-token"
        invalid_result = PushClient.is_exponent_push_token(invalid_token)
        
        result["details"]["token_validation"] = {
            "valid_token_test": result["sample_token_valid"],
            "invalid_token_test": not invalid_result,
            "test_passed": result["sample_token_valid"] and not invalid_result
        }
    except Exception as e:
        result["details"]["token_validation_error"] = str(e)
    
    # Overall readiness
    result["ready_to_send"] = all([
        result["expo_sdk_available"],
        result["push_client_available"],
        result["token_validation_working"],
        result["sample_token_valid"]
    ])
    
    return result

@app.post('/api/push/test-token')
def test_push_token(token: str):
    """Test if a push token is valid"""
    
    try:
        from exponent_server_sdk import PushClient
        
        is_valid = PushClient.is_exponent_push_token(token)
        
        return {
            "token": token,
            "is_valid": is_valid,
            "format_hint": "Token should be in format: ExponentPushToken[xxxx...]" if not is_valid else "Token format is correct"
        }
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Expo Server SDK not installed"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error validating token: {str(e)}"
        )
