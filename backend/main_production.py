#!/usr/bin/env python3
"""
Integra Markets Production Backend
Integrates Groq AI with real news sources and proper source attribution
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import datetime
import logging

# Load environment variables
parent_dir = Path(__file__).parent.parent
env_path = parent_dir / '.env'
load_dotenv(env_path)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add parent directory to path for imports
sys.path.insert(0, str(parent_dir))

# Import our enhanced Groq service with source attribution
try:
    from backend.groq_ai_service import GroqAIService, ReasoningEffort
    GROQ_AVAILABLE = True
    logger.info("✓ Groq AI service module loaded")
except ImportError as e:
    GROQ_AVAILABLE = False
    logger.error(f"Failed to import Groq AI service: {e}")
    GroqAIService = None
    ReasoningEffort = None

# Import NLTK response processor for concise responses
try:
    from backend.response_processor import process_groq_response, ResponseProcessor
    NLTK_AVAILABLE = True
    logger.info("✓ NLTK response processor loaded")
except ImportError as e:
    NLTK_AVAILABLE = False
    logger.error(f"Failed to import NLTK processor: {e}")
    process_groq_response = None
    ResponseProcessor = None

# Create FastAPI app
app = FastAPI(
    title="Integra Markets Production API",
    description="Production-ready API with Groq AI and source attribution",
    version="4.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq AI service
groq_service = None
groq_error = None

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global groq_service, groq_error
    
    groq_api_key = os.getenv("GROQ_API_KEY")
    
    if not groq_api_key:
        logger.error("GROQ_API_KEY not found in environment")
        groq_error = "API key not configured"
        return
    
    if GROQ_AVAILABLE:
        try:
            groq_service = GroqAIService(api_key=groq_api_key)
            logger.info(f"✓ Groq AI service initialized with key: {groq_api_key[:10]}...")
        except Exception as e:
            logger.error(f"Failed to initialize Groq AI service: {e}")
            groq_error = str(e)
    else:
        groq_error = "Groq AI module not available"

# Request models
class ChatRequest(BaseModel):
    messages: List[Dict[str, str]] = Field(..., description="Chat messages")
    commodity: Optional[str] = Field(None, description="Commodity context")
    mode: Optional[str] = Field("chat", description="Chat mode")
    temperature: Optional[float] = Field(0.7, ge=0, le=1)

class AnalysisRequest(BaseModel):
    query: str = Field(..., description="Analysis query")
    commodity: Optional[str] = Field(None, description="Specific commodity")
    include_sources: bool = Field(True, description="Include source attribution")
    use_tools: bool = Field(True, description="Use available tools")
    reasoning_effort: Optional[str] = Field("medium", description="Reasoning effort level")

class MarketReportRequest(BaseModel):
    commodities: List[str] = Field(["oil", "gold", "wheat"], description="Commodities to analyze")
    include_predictions: bool = Field(True)
    include_news: bool = Field(True)
    include_sources: bool = Field(True)

# Root endpoint
@app.get('/')
async def read_root():
    return {
        "message": "Integra Markets Production API",
        "version": "4.0.0",
        "status": {
            "groq_ai": groq_service is not None,
            "groq_error": groq_error,
            "source_attribution": True,
            "real_news_integration": True
        },
        "features": [
            "AI-powered analysis with GPT-OSS-120B",
            "Real-time news from multiple RSS sources",
            "Source attribution for transparency",
            "Structured analysis with bullet points",
            "Dark/light theme support",
            "Share and bookmark functionality"
        ],
        "endpoints": [
            "/health",
            "/ai/chat",
            "/ai/analyze",
            "/ai/report",
            "/api/test/groq"
        ]
    }

@app.get('/health')
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "groq_ai": {
            "available": groq_service is not None,
            "error": groq_error
        },
        "timestamp": datetime.datetime.now().isoformat()
    }

@app.post('/ai/chat')
async def ai_chat(request: ChatRequest):
    """
    AI Chat endpoint with real data and source attribution
    This overrides mock data with real Groq AI responses
    """
    if not groq_service:
        # Return informative error if Groq is not available
        return {
            "response": f"AI service temporarily unavailable. Error: {groq_error or 'Service not initialized'}",
            "sources": [],
            "tool_results": [],
            "error": True,
            "fallback": True
        }
    
    try:
        # Add commodity context if provided
        messages = request.messages.copy()
        if request.commodity and messages:
            messages[0]["content"] = f"[Context: {request.commodity} commodity] {messages[0]['content']}"
        
        # Use Groq AI for real response
        result = await groq_service.chat_with_tools(
            messages=messages,
            available_tools=["search_commodity_news", "analyze_price_data"],
            reasoning_effort=ReasoningEffort.MEDIUM
        )
        
        # Extract sources from tool results
        sources = []
        if "tool_results" in result:
            for tool_result in result.get("tool_results", []):
                if hasattr(tool_result, "data") and isinstance(tool_result.data, dict):
                    if "sources_used" in tool_result.data:
                        for source in tool_result.data["sources_used"]:
                            sources.append({
                                "name": source,
                                "type": "news",
                                "confidence": 0.9
                            })
        
        # Process response with NLTK for conciseness if available
        response_text = result.get("response", "No response generated")
        
        if NLTK_AVAILABLE and process_groq_response:
            try:
                # Process for conciseness
                processed = await process_groq_response(
                    response_text,
                    commodity=request.commodity,
                    max_bullets=5
                )
                
                # Format as structured response
                enhanced_response = {
                    "response": processed["summary"],
                    "bullet_points": processed["bullet_points"],
                    "sentiment": processed["sentiment"],
                    "drivers": processed["drivers"],
                    "key_stats": processed["key_stats"],
                    "sources": sources,
                    "tool_results": result.get("tool_results", []),
                    "commodity": request.commodity,
                    "timestamp": datetime.datetime.now().isoformat(),
                    "model": "gpt-oss-120b",
                    "processing": "NLTK-enhanced",
                    "metadata": processed["metadata"],
                    "real_data": True
                }
                
                logger.info(f"Response reduced by {processed['metadata']['reduction_rate']}%")
                return enhanced_response
                
            except Exception as e:
                logger.warning(f"NLTK processing failed, using raw response: {e}")
        
        # Fallback to original format if NLTK not available
        return {
            "response": response_text,
            "sources": sources,
            "tool_results": result.get("tool_results", []),
            "commodity": request.commodity,
            "timestamp": datetime.datetime.now().isoformat(),
            "model": "gpt-oss-120b",
            "processing": "standard",
            "real_data": True
        }
        
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        # Return graceful fallback
        return {
            "response": "I'm having trouble connecting to the AI service. Please try again in a moment.",
            "sources": [],
            "error": str(e),
            "fallback": True
        }

@app.post('/ai/analyze')
async def ai_analyze(request: AnalysisRequest):
    """
    Comprehensive AI analysis with source attribution
    Returns structured analysis with bullet points and citations
    """
    if not groq_service:
        return {
            "error": f"Analysis service unavailable: {groq_error}",
            "fallback": True
        }
    
    try:
        # Map reasoning effort string to enum
        effort_map = {
            "low": ReasoningEffort.LOW,
            "medium": ReasoningEffort.MEDIUM,
            "high": ReasoningEffort.HIGH
        }
        reasoning_effort = effort_map.get(request.reasoning_effort.lower(), ReasoningEffort.MEDIUM)
        
        # Perform analysis with source tracking
        result = await groq_service.analyze_with_reasoning(
            query=request.query,
            commodity=request.commodity,
            use_tools=request.use_tools,
            search_web=True,
            include_sources=request.include_sources,
            reasoning_effort=reasoning_effort
        )
        
        # Structure the analysis for frontend display
        structured_analysis = {
            "query": request.query,
            "commodity": request.commodity,
            "sections": {
                "price_trends": extract_section(result, "price"),
                "supply_demand": extract_section(result, "supply", "demand"),
                "technical_indicators": extract_section(result, "technical", "indicator"),
                "geopolitical": extract_section(result, "geopolitical", "policy"),
                "market_outlook": extract_section(result, "outlook", "forecast"),
                "predictions": extract_predictions(result)
            },
            "sources": result.get("sources", []),
            "confidence": extract_confidence(result),
            "sentiment": extract_sentiment(result),
            "timestamp": datetime.datetime.now().isoformat(),
            "real_data": True
        }
        
        return structured_analysis
        
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return {
            "error": str(e),
            "fallback": True
        }

@app.post('/ai/report')
async def generate_market_report(request: MarketReportRequest):
    """
    Generate comprehensive market report with source attribution
    """
    if not groq_service:
        return {
            "error": f"Report service unavailable: {groq_error}",
            "fallback": True
        }
    
    try:
        report = await groq_service.generate_market_report(
            commodities=request.commodities,
            include_predictions=request.include_predictions,
            include_news=request.include_news,
            include_sources=request.include_sources,
            reasoning_effort=ReasoningEffort.HIGH
        )
        
        # Add real_data flag to indicate this is not mock data
        report["real_data"] = True
        report["model"] = "gpt-oss-120b"
        
        return report
        
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        return {
            "error": str(e),
            "fallback": True
        }

@app.get('/api/test/groq')
async def test_groq_connection():
    """
    Test Groq API connection and configuration
    """
    test_results = {
        "groq_module_loaded": GROQ_AVAILABLE,
        "groq_service_initialized": groq_service is not None,
        "groq_error": groq_error,
        "api_key_configured": bool(os.getenv("GROQ_API_KEY")),
        "api_key_prefix": os.getenv("GROQ_API_KEY", "")[:10] + "..." if os.getenv("GROQ_API_KEY") else None
    }
    
    if groq_service:
        try:
            # Try a simple completion
            from groq import Groq
            client = Groq(api_key=os.getenv("GROQ_API_KEY"))
            response = client.chat.completions.create(
                messages=[{"role": "user", "content": "Say 'API working'"}],
                model="mixtral-8x7b-32768",
                max_tokens=10
            )
            test_results["api_test"] = {
                "success": True,
                "response": response.choices[0].message.content
            }
        except Exception as e:
            test_results["api_test"] = {
                "success": False,
                "error": str(e)
            }
    
    return test_results

# Helper functions for structured analysis
def extract_section(result: Dict, *keywords) -> List[Dict]:
    """Extract relevant sections from analysis"""
    sections = []
    
    if "analysis" in result and isinstance(result["analysis"], dict):
        analysis = result["analysis"]
        
        # Check key_factors
        for factor in analysis.get("key_factors", []):
            if any(kw.lower() in factor.lower() for kw in keywords):
                sections.append({
                    "point": factor,
                    "source": "Analysis",
                    "confidence": analysis.get("confidence", 0.7)
                })
    
    # Check tool results
    if "tool_results" in result:
        for tool_result in result["tool_results"]:
            if hasattr(tool_result, "data") and isinstance(tool_result.data, dict):
                articles = tool_result.data.get("articles", [])
                for article in articles[:2]:  # Limit to 2 per section
                    if any(kw.lower() in article.get("title", "").lower() for kw in keywords):
                        sections.append({
                            "point": article.get("title", ""),
                            "source": article.get("source", "Unknown"),
                            "url": article.get("url", "")
                        })
    
    return sections

def extract_predictions(result: Dict) -> Dict:
    """Extract price predictions from analysis"""
    predictions = {}
    
    if "analysis" in result and isinstance(result["analysis"], dict):
        price_pred = result["analysis"].get("price_prediction", {})
        predictions = {
            "short_term": price_pred.get("next_day", price_pred.get("short_term")),
            "medium_term": price_pred.get("next_week", price_pred.get("medium_term")),
            "long_term": price_pred.get("next_month", price_pred.get("long_term"))
        }
    
    return predictions

def extract_confidence(result: Dict) -> float:
    """Extract overall confidence from analysis"""
    if "analysis" in result and isinstance(result["analysis"], dict):
        return result["analysis"].get("confidence", 0.5)
    return 0.5

def extract_sentiment(result: Dict) -> str:
    """Extract overall sentiment from analysis"""
    if "analysis" in result and isinstance(result["analysis"], dict):
        return result["analysis"].get("sentiment", "neutral")
    return "neutral"

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Integra Markets Production Backend...")
    logger.info(f"GROQ_API_KEY configured: {bool(os.getenv('GROQ_API_KEY'))}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
