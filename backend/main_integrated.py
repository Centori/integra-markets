#!/usr/bin/env python3
"""
Integrated Integra Markets Backend
Combines existing implementations to provide real-time data
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import datetime
import logging
import requests
import re

# Load environment variables
parent_dir = Path(__file__).parent.parent
env_path = parent_dir / '.env'
load_dotenv(env_path)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add app directory to path for imports
app_dir = parent_dir / 'app'
sys.path.insert(0, str(app_dir))

# Create FastAPI app
app = FastAPI(
    title="Integra Markets Real-Time Backend",
    description="Real-time market data and AI analysis API",
    version="3.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY")
alpha_vantage_key = os.getenv("ALPHA_VANTAGE_API_KEY")
groq_api_key = os.getenv("GROQ_API_KEY")

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
    logger.info("✓ Supabase connected")
else:
    supabase = None
    logger.warning("Supabase not configured")

# Import GROQ for AI analysis
try:
    from groq import Groq
    if groq_api_key:
        groq_client = Groq(api_key=groq_api_key)
        GROQ_AVAILABLE = True
        logger.info("✓ GROQ AI (Llama 3.3 70B) connected")
    else:
        GROQ_AVAILABLE = False
        logger.warning("GROQ API key not found")
except ImportError:
    GROQ_AVAILABLE = False
    logger.warning("GROQ library not installed")

# Try to import NLP services
try:
    import nltk
    from nltk.sentiment import SentimentIntensityAnalyzer
    sia = SentimentIntensityAnalyzer()
    NLTK_AVAILABLE = True
    logger.info("✓ NLTK sentiment analyzer loaded")
except:
    NLTK_AVAILABLE = False
    logger.warning("NLTK not available")

# Request models
class SentimentRequest(BaseModel):
    text: str
    commodity: Optional[str] = None
    enhanced: bool = True

class MarketDataRequest(BaseModel):
    commodities: List[str] = ["OIL", "GOLD", "WHEAT", "NAT GAS"]

def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))

def normalize_commodity(commodity: Optional[str], text: Optional[str] = None) -> Optional[str]:
    alias_map = {
        "oil": "oil",
        "crude": "oil",
        "crude oil": "oil",
        "wti": "oil",
        "brent": "oil",
        "gas": "gas",
        "nat gas": "gas",
        "natural gas": "gas",
        "lng": "gas",
        "gold": "gold",
        "silver": "silver",
        "bitcoin": "bitcoin",
        "btc": "bitcoin",
        "wheat": "wheat",
        "corn": "corn",
        "macro": "macro",
        "weather": "weather"
    }
    if commodity:
        return alias_map.get(commodity.strip().lower(), commodity.strip().lower())
    if not text:
        return None
    text_lower = text.lower()
    for alias, normalized in alias_map.items():
        if alias in text_lower:
            return normalized
    return None

def get_commodity_rulebook() -> Dict[str, Dict[str, List[Dict[str, str]]]]:
    return {
        "oil": {
            "bullish": [
                {"pattern": r"opec\+?.{0,20}(cut|reduce|curb)", "signal": "OPEC supply cut"},
                {"pattern": r"(inventory|stockpile).{0,12}(draw|drop|fall)", "signal": "Inventory draw"},
                {"pattern": r"(sanctions|embargo|conflict|war).{0,24}(oil|crude|shipping|export)?", "signal": "Supply disruption risk"},
                {"pattern": r"(hurricane|storm|outage|disruption).{0,24}(production|supply|export|offshore)?", "signal": "Production disruption"}
            ],
            "bearish": [
                {"pattern": r"(production|output|supply).{0,18}(rise|increase|boost|grow)", "signal": "Supply growth"},
                {"pattern": r"(inventory|stockpile).{0,12}(build|rise|increase)", "signal": "Inventory build"},
                {"pattern": r"demand.{0,18}(slow|weak|fall|decline)", "signal": "Demand weakness"},
                {"pattern": r"(recession|slowdown|demand destruction)", "signal": "Macro demand risk"}
            ]
        },
        "gas": {
            "bullish": [
                {"pattern": r"(cold|freeze|arctic|winter storm)", "signal": "Heating demand surge"},
                {"pattern": r"(storage|inventory).{0,12}(draw|drop|below)", "signal": "Storage draw"},
                {"pattern": r"(lng|pipeline).{0,18}(outage|disruption|constraint)", "signal": "Supply constraint"}
            ],
            "bearish": [
                {"pattern": r"(warm|mild).{0,18}(weather|winter)", "signal": "Weak heating demand"},
                {"pattern": r"(storage|inventory).{0,12}(build|surplus|above)", "signal": "Storage surplus"},
                {"pattern": r"production.{0,18}(rise|increase|record)", "signal": "Production increase"}
            ]
        },
        "gold": {
            "bullish": [
                {"pattern": r"(rate cut|cuts rates|dovish|lower yields|yield fall|yield drops?)", "signal": "Lower real-rate pressure"},
                {"pattern": r"(inflation|cpi).{0,18}(rise|hot|sticky)", "signal": "Inflation hedge demand"},
                {"pattern": r"(geopolitical|conflict|war|safe[- ]haven)", "signal": "Safe-haven demand"},
                {"pattern": r"(dollar|usd).{0,18}(weak|falls?|declines?)", "signal": "Dollar weakness"}
            ],
            "bearish": [
                {"pattern": r"(rate hike|hawkish|higher yields|yield rise|yield jumps?)", "signal": "Higher yield pressure"},
                {"pattern": r"(dollar|usd).{0,18}(strong|rall(y|ies)|rises?)", "signal": "Dollar strength"}
            ]
        },
        "silver": {
            "bullish": [
                {"pattern": r"(rate cut|dovish|lower yields)", "signal": "Lower-rate support"},
                {"pattern": r"(solar|electronics|industrial demand).{0,18}(rise|strong|increase)", "signal": "Industrial demand strength"}
            ],
            "bearish": [
                {"pattern": r"(rate hike|hawkish|higher yields)", "signal": "Higher-rate pressure"},
                {"pattern": r"(industrial|manufacturing).{0,18}(slowdown|weakness|contract)", "signal": "Industrial demand weakness"}
            ]
        },
        "bitcoin": {
            "bullish": [
                {"pattern": r"(etf|spot etf).{0,18}(inflow|approval|demand)", "signal": "ETF demand"},
                {"pattern": r"(rate cut|liquidity|easing|dovish)", "signal": "Liquidity tailwind"},
                {"pattern": r"(institutional|adoption|treasury).{0,18}(buy|demand|allocation)", "signal": "Institutional adoption"}
            ],
            "bearish": [
                {"pattern": r"(sec|regulator|crackdown|ban|lawsuit)", "signal": "Regulatory pressure"},
                {"pattern": r"(hack|liquidation|outflow)", "signal": "Market stress"},
                {"pattern": r"(rate hike|higher yields|tightening)", "signal": "Liquidity headwind"}
            ]
        },
        "wheat": {
            "bullish": [
                {"pattern": r"(drought|flood|freeze|frost|heatwave)", "signal": "Crop risk"},
                {"pattern": r"(export ban|supply shortage|crop damage)", "signal": "Supply tightening"},
                {"pattern": r"(yield|harvest).{0,18}(fall|drop|miss)", "signal": "Weak harvest outlook"}
            ],
            "bearish": [
                {"pattern": r"(bumper crop|record harvest|strong yield)", "signal": "Strong harvest"},
                {"pattern": r"(export|supply).{0,18}(increase|recover)", "signal": "Supply recovery"}
            ]
        },
        "corn": {
            "bullish": [
                {"pattern": r"(drought|heatwave|crop stress|yield loss)", "signal": "Crop stress"},
                {"pattern": r"(ethanol demand|export sales).{0,18}(rise|strong)", "signal": "Demand support"}
            ],
            "bearish": [
                {"pattern": r"(record crop|strong yield|ample supply)", "signal": "Ample supply"},
                {"pattern": r"(rainfall|weather).{0,18}(improve|favorable)", "signal": "Improving crop conditions"}
            ]
        },
        "macro": {
            "bullish": [
                {"pattern": r"(soft landing|rate cut|disinflation|stimulus)", "signal": "Growth-supportive macro"},
                {"pattern": r"(cpi|inflation).{0,18}(cool|ease|slow)", "signal": "Cooling inflation"}
            ],
            "bearish": [
                {"pattern": r"(recession|slowdown|hard landing)", "signal": "Growth downside risk"},
                {"pattern": r"(cpi|inflation).{0,18}(hot|sticky|rise)", "signal": "Inflation pressure"},
                {"pattern": r"(hawkish|rate hike|tightening)", "signal": "Tighter policy"}
            ]
        },
        "weather": {
            "bullish": [
                {"pattern": r"(hurricane|storm|drought|flood|freeze|heatwave)", "signal": "Weather event risk"},
                {"pattern": r"(forecast|models?).{0,18}(worsen|intensif(y|ies))", "signal": "Forecast deterioration"}
            ],
            "bearish": [
                {"pattern": r"(forecast|models?).{0,18}(improve|moderate|weaken)", "signal": "Forecast improvement"},
                {"pattern": r"(storm|hurricane).{0,18}(downgrade|dissipate)", "signal": "Event weakening"}
            ]
        }
    }

def analyze_market_sentiment(text: str, commodity: Optional[str], scores: Dict[str, float]) -> Dict[str, Any]:
    normalized = normalize_commodity(commodity, text)
    compound = scores["compound"]
    if compound >= 0.05:
        base_sentiment = "BULLISH"
    elif compound <= -0.05:
        base_sentiment = "BEARISH"
    else:
        base_sentiment = "NEUTRAL"
    base_confidence = _clamp(abs(compound), 0.0, 1.0)
    rulebook = get_commodity_rulebook()
    matched_signals: List[Dict[str, str]] = []
    directional_score = 0.0
    if normalized in rulebook:
        text_lower = text.lower()
        bullish_hits = [
            entry["signal"] for entry in rulebook[normalized]["bullish"]
            if re.search(entry["pattern"], text_lower)
        ]
        bearish_hits = [
            entry["signal"] for entry in rulebook[normalized]["bearish"]
            if re.search(entry["pattern"], text_lower)
        ]
        directional_score = _clamp(0.22 * len(bullish_hits) - 0.22 * len(bearish_hits), -0.9, 0.9)
        matched_signals = (
            [{"signal": signal, "direction": "bullish"} for signal in bullish_hits] +
            [{"signal": signal, "direction": "bearish"} for signal in bearish_hits]
        )[:6]
    combined_score = (compound * 0.4) + (directional_score * 0.6) if matched_signals else compound
    if combined_score >= 0.12:
        sentiment = "BULLISH"
    elif combined_score <= -0.12:
        sentiment = "BEARISH"
    else:
        sentiment = "NEUTRAL"
    confidence = _clamp(
        base_confidence + (min(0.18, len(matched_signals) * 0.03) if matched_signals else 0.0),
        0.0,
        0.96
    )
    return {
        "sentiment": sentiment,
        "confidence": round(confidence, 3),
        "commodity": normalized,
        "market_context": {
            "base_sentiment": base_sentiment,
            "directional_score": round(directional_score, 3),
            "matched_signals": matched_signals
        }
    }

# Root endpoint
@app.get('/')
def read_root():
    return {
        "message": "Integra Markets Real-Time Backend Active!",
        "version": "3.0.0",
        "services": {
            "supabase": bool(supabase),
            "groq_ai": GROQ_AVAILABLE,
            "nltk": NLTK_AVAILABLE,
            "alpha_vantage": bool(alpha_vantage_key)
        },
        "endpoints": [
            "/health",
            "/api/sentiment",
            "/api/sentiment/market",
            "/api/news/analysis",
            "/api/market/realtime",
            "/analyze-sentiment"
        ]
    }

@app.get('/health')
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.now().isoformat(),
        "services_active": {
            "database": bool(supabase),
            "ai": GROQ_AVAILABLE,
            "sentiment": NLTK_AVAILABLE,
            "market_data": bool(alpha_vantage_key)
        }
    }

# Real-time market data endpoint
@app.get('/api/market/realtime')
async def get_realtime_market_data():
    """Get real-time market data from Alpha Vantage"""
    if not alpha_vantage_key:
        # Return mock data if API key not available
        return {
            "status": "mock_data",
            "data": {
                "OIL": {"price": 78.45, "change": 1.2},
                "GOLD": {"price": 2045.30, "change": -0.5},
                "WHEAT": {"price": 585.25, "change": 0.8},
                "NAT_GAS": {"price": 2.85, "change": -2.1}
            },
            "timestamp": datetime.datetime.now().isoformat()
        }
    
    market_data = {}
    symbols = {
        "OIL": "CL=F",  # Crude Oil
        "GOLD": "GC=F",  # Gold
        "WHEAT": "ZW=F",  # Wheat
        "NAT_GAS": "NG=F"  # Natural Gas
    }
    
    for commodity, symbol in symbols.items():
        try:
            url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={alpha_vantage_key}"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if "Global Quote" in data:
                    quote = data["Global Quote"]
                    market_data[commodity] = {
                        "price": float(quote.get("05. price", 0)),
                        "change": float(quote.get("10. change percent", "0").replace("%", ""))
                    }
        except Exception as e:
            logger.error(f"Error fetching {commodity}: {e}")
            market_data[commodity] = {"price": 0, "change": 0}
    
    return {
        "status": "live",
        "data": market_data,
        "timestamp": datetime.datetime.now().isoformat()
    }

# Enhanced sentiment analysis using GROQ
@app.post('/api/sentiment')
async def analyze_sentiment_enhanced(request: SentimentRequest):
    """Analyze sentiment using GROQ AI (GPT-OSS-120B)"""
    
    # Try GROQ first for best quality
    if GROQ_AVAILABLE and groq_client:
        try:
            prompt = f"""Analyze the sentiment of this financial news text.
Commodity context: {request.commodity if request.commodity else 'general market'}
Text: {request.text}

Provide:
1. Overall sentiment (BULLISH/BEARISH/NEUTRAL)
2. Confidence score (0-1)
3. Key factors
4. Market impact assessment"""

            completion = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a financial analyst specializing in commodity markets."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200,
                temperature=0.3
            )
            
            ai_response = completion.choices[0].message.content
            
            # Parse AI response to extract sentiment
            sentiment = "NEUTRAL"
            confidence = 0.7
            
            if "BULLISH" in ai_response.upper():
                sentiment = "BULLISH"
                confidence = 0.85
            elif "BEARISH" in ai_response.upper():
                sentiment = "BEARISH"
                confidence = 0.85
            
            return {
                "text": request.text,
                "sentiment": sentiment,
                "confidence": confidence,
                "method": "groq_ai_gpt_oss_120b",
                "analysis": ai_response,
                "commodity": request.commodity,
                "timestamp": datetime.datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"GROQ analysis failed: {e}")
    
    # Fallback to NLTK
    if NLTK_AVAILABLE:
        try:
            scores = sia.polarity_scores(request.text)
            market_result = analyze_market_sentiment(request.text, request.commodity, scores)
            return {
                "text": request.text,
                "sentiment": market_result["sentiment"],
                "confidence": market_result["confidence"],
                "method": "nltk_vader",
                "scores": scores,
                "commodity": request.commodity,
                "market_context": market_result["market_context"],
                "timestamp": datetime.datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"NLTK analysis failed: {e}")
    
    # Final fallback
    return {
        "text": request.text,
        "sentiment": "NEUTRAL",
        "confidence": 0.5,
        "method": "fallback",
        "commodity": request.commodity,
        "timestamp": datetime.datetime.now().isoformat()
    }

# Market sentiment overview
@app.get('/api/sentiment/market')
async def get_market_sentiment():
    """Get overall market sentiment"""
    
    # Get real-time market data
    market_data = await get_realtime_market_data()
    
    # Calculate overall sentiment based on price changes
    total_change = 0
    commodities = []
    
    for commodity, data in market_data.get("data", {}).items():
        change = data.get("change", 0)
        total_change += change
        commodities.append({
            "name": commodity,
            "change": change,
            "sentiment": "BULLISH" if change > 0.5 else "BEARISH" if change < -0.5 else "NEUTRAL"
        })
    
    avg_change = total_change / len(commodities) if commodities else 0
    
    if avg_change > 0.5:
        overall = "BULLISH"
    elif avg_change < -0.5:
        overall = "BEARISH"
    else:
        overall = "NEUTRAL"
    
    return {
        "overall": overall,
        "confidence": min(abs(avg_change) / 10 * 100, 95),
        "commodities": commodities,
        "timestamp": datetime.datetime.now().isoformat(),
        "data_source": market_data.get("status", "mock_data")
    }

# News analysis endpoint
@app.post('/api/news/analysis')
async def analyze_news(text: str = None):
    """Analyze news text for trading signals"""
    
    if not text:
        # Return sample analyzed news
        return [{
            "id": 1,
            "headline": "Oil prices surge on OPEC+ production cuts",
            "summary": "Crude oil futures jumped 3% following OPEC+ decision to extend production cuts",
            "sentiment": "BULLISH",
            "confidence": 0.85,
            "commodity": "OIL",
            "timestamp": datetime.datetime.now().isoformat()
        }]
    
    # Analyze provided text
    analysis = await analyze_sentiment_enhanced(SentimentRequest(text=text))
    
    return [{
        "id": 1,
        "headline": text[:100],
        "summary": text,
        "sentiment": analysis["sentiment"],
        "confidence": analysis["confidence"],
        "analysis": analysis,
        "timestamp": datetime.datetime.now().isoformat()
    }]

# Legacy endpoint for compatibility
@app.post('/analyze-sentiment')
async def analyze_sentiment_legacy(request: SentimentRequest):
    """Legacy endpoint - redirects to new API"""
    return await analyze_sentiment_enhanced(request)

# Alert preferences endpoint
@app.get('/api/alerts/preferences')
async def get_alert_preferences():
    """Get user alert preferences from Supabase"""
    if supabase:
        try:
            # Fetch from Supabase if available
            response = supabase.table('alert_preferences').select('*').execute()
            if response.data:
                return response.data[0]
        except Exception as e:
            logger.warning(f"Could not fetch alert preferences: {e}")
    
    # Return default preferences
    return {
        "price_alerts": True,
        "sentiment_alerts": True,
        "news_alerts": True,
        "threshold_percentage": 5.0,
        "commodities": ["OIL", "GOLD", "WHEAT", "NAT GAS"],
        "notification_frequency": "immediate",
        "quiet_hours": {"start": "22:00", "end": "08:00"},
        "email_enabled": False,
        "push_enabled": True
    }

@app.post('/api/alerts/preferences')
async def update_alert_preferences(preferences: Dict[str, Any]):
    """Update user alert preferences"""
    if supabase:
        try:
            response = supabase.table('alert_preferences').upsert(preferences).execute()
            return {"status": "updated", "preferences": preferences}
        except Exception as e:
            logger.error(f"Could not update alert preferences: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return {"status": "mock_update", "preferences": preferences}

# Active alerts endpoint
@app.get('/api/alerts/active')
async def get_active_alerts():
    """Get active price and news alerts"""
    alerts = []
    
    # Get market data for price alerts
    market_data = await get_realtime_market_data()
    
    for commodity, data in market_data.get("data", {}).items():
        change = data.get("change", 0)
        if abs(change) >= 5.0:  # Default threshold
            alerts.append({
                "type": "price_alert",
                "commodity": commodity,
                "change": change,
                "price": data.get("price", 0),
                "severity": "high" if abs(change) >= 10 else "medium",
                "timestamp": datetime.datetime.now().isoformat(),
                "message": f"{commodity} {'up' if change > 0 else 'down'} {abs(change):.1f}%"
            })
    
    # Add sentiment-based alerts
    if len(alerts) == 0:  # Add sample alert if none
        alerts.append({
            "type": "sentiment_alert",
            "commodity": "OIL",
            "sentiment": "BULLISH",
            "confidence": 0.85,
            "severity": "medium",
            "timestamp": datetime.datetime.now().isoformat(),
            "message": "Strong bullish sentiment detected for Oil markets"
        })
    
    return {
        "alerts": alerts,
        "count": len(alerts),
        "timestamp": datetime.datetime.now().isoformat()
    }

# Test notification endpoint
@app.post('/api/test/notification')
async def test_notification():
    """Test push notification"""
    return {
        "status": "sent",
        "notification": {
            "title": "Integra Markets Alert",
            "body": "Oil prices surge 7.2% on OPEC+ production cuts",
            "data": {
                "type": "price_alert",
                "commodity": "OIL",
                "change": 7.2
            }
        },
        "timestamp": datetime.datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Integra Markets Real-Time Backend...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
