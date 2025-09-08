"""
Groq AI Service for Integra Markets
Integrates Groq's Llama 3.3 70B with advanced features:
- Tool Use (Function Calling)
- Browser Search
- Code Execution
- JSON Object/Schema Modes
- Reasoning Capabilities
"""

import os
import json
import asyncio
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from enum import Enum
import httpx
from pydantic import BaseModel, Field, validator
import subprocess
import tempfile
from dataclasses import dataclass
import sys
import os

# Add parent directory to path to import from app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import NewsDataSources for real news fetching
try:
    from app.services.data_sources import NewsDataSources, fetch_latest_news
    NEWS_SOURCES_AVAILABLE = True
except ImportError:
    NEWS_SOURCES_AVAILABLE = False
    logging.warning("NewsDataSources not available")

# Groq client
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    logging.warning("Groq SDK not installed. Install with: pip install groq")

# Search capabilities
try:
    from duckduckgo_search import DDGS
    SEARCH_AVAILABLE = True
except ImportError:
    SEARCH_AVAILABLE = False
    logging.warning("DuckDuckGo search not available. Install with: pip install duckduckgo-search")

logger = logging.getLogger(__name__)

class ResponseMode(str, Enum):
    """Response format modes"""
    TEXT = "text"
    JSON_OBJECT = "json_object"
    JSON_SCHEMA = "json_schema"
    REASONING = "reasoning"
    TOOL_USE = "tool_use"

class ReasoningEffort(str, Enum):
    """Reasoning effort levels for GPT-OSS-120B"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class CommodityAnalysis(BaseModel):
    """Schema for commodity analysis responses"""
    commodity: str
    sentiment: str = Field(..., pattern="^(bullish|bearish|neutral)$")
    confidence: float = Field(..., ge=0.0, le=1.0)
    price_prediction: Dict[str, float] = Field(..., description="Price predictions for different timeframes")
    key_factors: List[str] = Field(..., description="Key factors affecting the commodity")
    risks: List[str] = Field(..., description="Potential risks")
    opportunities: List[str] = Field(..., description="Potential opportunities")
    technical_analysis: Optional[Dict[str, Any]] = None
    reasoning: Optional[str] = Field(None, description="Step-by-step reasoning")
    data_sources: Optional[List[str]] = Field(None, description="Sources of information used")

class MarketInsight(BaseModel):
    """Schema for market insights"""
    title: str
    summary: str
    impact_score: float = Field(..., ge=0.0, le=10.0)
    affected_commodities: List[str]
    time_horizon: str = Field(..., pattern="^(immediate|short-term|medium-term|long-term)$")
    data_sources: List[str]
    confidence_level: float = Field(..., ge=0.0, le=1.0)

@dataclass
class ToolResult:
    """Result from tool execution"""
    tool_name: str
    success: bool
    data: Any
    error: Optional[str] = None

class GroqAIService:
    """Advanced AI service using Groq's Llama 3.3 70B"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not provided")
        
        if GROQ_AVAILABLE:
            self.client = Groq(api_key=self.api_key)
        else:
            self.client = None
            
        # Model options
        self.models = {
            "llama": "llama-3.3-70b-versatile",  # 128k context
            "gpt-oss": "openai/gpt-oss-120b"      # 120B parameter model
        }
        self.default_model = "gpt-oss"  # Use GPT-OSS-120B by default
        self.search_engine = DDGS() if SEARCH_AVAILABLE else None
        
        # Define available tools
        self.tools = self._define_tools()
        
        logger.info(f"GroqAIService initialized - Default model: {self.models[self.default_model]}")
    
    def _define_tools(self) -> List[Dict[str, Any]]:
        """Define available tools for function calling"""
        return [
            {
                "type": "function",
                "function": {
                    "name": "search_commodity_news",
                    "description": "Search for latest news about a specific commodity",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "commodity": {
                                "type": "string",
                                "description": "The commodity to search for (e.g., oil, gold, wheat)"
                            },
                            "timeframe": {
                                "type": "string",
                                "enum": ["today", "week", "month"],
                                "description": "Time range for news search"
                            }
                        },
                        "required": ["commodity"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "analyze_price_data",
                    "description": "Analyze historical price data and generate predictions",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "commodity": {"type": "string"},
                            "data_points": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "date": {"type": "string"},
                                        "price": {"type": "number"}
                                    }
                                }
                            }
                        },
                        "required": ["commodity", "data_points"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "execute_analysis_code",
                    "description": "Execute Python code for data analysis",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "code": {
                                "type": "string",
                                "description": "Python code to execute"
                            },
                            "context": {
                                "type": "object",
                                "description": "Variables to make available in code execution"
                            }
                        },
                        "required": ["code"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_weather_impact",
                    "description": "Analyze weather impact on agricultural commodities",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "region": {"type": "string"},
                            "commodity": {"type": "string"},
                            "weather_event": {"type": "string"}
                        },
                        "required": ["region", "commodity"]
                    }
                }
            }
        ]
    
    async def analyze_with_reasoning(
        self,
        query: str,
        commodity: Optional[str] = None,
        use_tools: bool = True,
        search_web: bool = True,
        model: str = None,
        reasoning_effort: ReasoningEffort = ReasoningEffort.MEDIUM,
        include_sources: bool = True
    ) -> Dict[str, Any]:
        """
        Perform analysis with step-by-step reasoning
        """
        # Step 1: Initial reasoning
        reasoning_prompt = f"""
        Analyze this query step-by-step for commodity markets:
        Query: {query}
        {"Commodity focus: " + commodity if commodity else ""}
        
        Provide your reasoning process:
        1. What information do we need?
        2. What tools should we use?
        3. What analysis approach is best?
        4. What are the key factors to consider?
        
        Format: Clear numbered steps.
        """
        
        reasoning = await self._get_completion(
            reasoning_prompt, 
            mode=ResponseMode.REASONING,
            model=model,
            reasoning_effort=reasoning_effort
        )
        
        # Step 2: Gather information using tools
        tool_results = []
        news_sources = []  # Track all sources used
        
        if use_tools:
            # Determine which tools to use based on reasoning
            if "news" in query.lower() or "latest" in query.lower() or include_sources:
                news_result = await self._search_commodity_news(commodity or "commodities")
                tool_results.append(news_result)
                
                # Extract sources from news results
                if 'sources_used' in news_result:
                    news_sources.extend(news_result['sources_used'])
            
            if search_web and self.search_engine:
                search_results = await self._web_search(query)
                tool_results.append(ToolResult("web_search", True, search_results))
                if not news_sources:
                    news_sources.append("Web Search")
        
        # Step 3: Comprehensive analysis
        analysis_prompt = f"""
        Based on the following information, provide a comprehensive analysis:
        
        Query: {query}
        Reasoning: {reasoning}
        Tool Results: {json.dumps([r.__dict__ if hasattr(r, '__dict__') else r for r in tool_results], default=str)}
        
        Important: Include source attribution for any facts or data points mentioned.
        Sources available: {', '.join(news_sources) if news_sources else 'General market knowledge'}
        
        Provide structured analysis following the CommodityAnalysis schema.
        """
        
        analysis = await self._get_completion(
            analysis_prompt,
            mode=ResponseMode.JSON_SCHEMA,
            response_schema=CommodityAnalysis.schema(),
            model=model,
            reasoning_effort=reasoning_effort
        )
        
        # Prepare sources for frontend
        formatted_sources = []
        for source in news_sources:
            formatted_sources.append({
                "name": source,
                "type": "news" if source != "Web Search" else "web",
                "timestamp": datetime.now().isoformat()
            })
        
        return {
            "query": query,
            "reasoning": reasoning,
            "tool_results": tool_results,
            "analysis": analysis,
            "sources": formatted_sources,  # Add sources for frontend display
            "timestamp": datetime.now().isoformat()
        }
    
    async def chat_with_tools(
        self,
        messages: List[Dict[str, str]],
        available_tools: Optional[List[str]] = None,
        model: str = None,
        reasoning_effort: ReasoningEffort = ReasoningEffort.MEDIUM,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Chat interface with tool use capability
        """
        if not self.client:
            return {"error": "Groq client not initialized"}
        
        # Filter tools based on what's requested
        tools = self.tools
        if available_tools:
            tools = [t for t in self.tools if t["function"]["name"] in available_tools]
        
        try:
            # Select model
            selected_model = self.models.get(model, self.models[self.default_model])
            
            # Build request parameters
            params = {
                "model": selected_model,
                "messages": messages,
                "tools": tools,
                "tool_choice": "auto",
                "temperature": 0.7,
                "max_tokens": 8192,  # Increased for GPT-OSS-120B
                "stream": stream
            }
            
            # Add reasoning effort for GPT-OSS-120B
            if "gpt-oss" in selected_model:
                params["reasoning_effort"] = reasoning_effort.value
            
            # Make initial request with tools
            response = self.client.chat.completions.create(**params)
            
            response_message = response.choices[0].message
            
            # Check if model wants to use tools
            tool_calls = response_message.tool_calls
            if tool_calls:
                # Execute tool calls
                tool_results = []
                for tool_call in tool_calls:
                    result = await self._execute_tool(
                        tool_call.function.name,
                        json.loads(tool_call.function.arguments)
                    )
                    tool_results.append(result)
                    
                    # Add tool result to conversation
                    messages.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [tool_call]
                    })
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(result.data)
                    })
                
                # Get final response with tool results
                final_params = {
                    "model": selected_model,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 8192
                }
                
                if "gpt-oss" in selected_model:
                    final_params["reasoning_effort"] = reasoning_effort.value
                    
                final_response = self.client.chat.completions.create(**final_params)
                
                return {
                    "response": final_response.choices[0].message.content,
                    "tool_results": tool_results,
                    "messages": messages
                }
            else:
                return {
                    "response": response_message.content,
                    "tool_results": [],
                    "messages": messages + [{"role": "assistant", "content": response_message.content}]
                }
                
        except Exception as e:
            logger.error(f"Chat with tools error: {e}")
            return {"error": str(e)}
    
    async def _execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> ToolResult:
        """Execute a specific tool"""
        try:
            if tool_name == "search_commodity_news":
                data = await self._search_commodity_news(
                    arguments["commodity"],
                    arguments.get("timeframe", "week")
                )
                return ToolResult(tool_name, True, data)
                
            elif tool_name == "analyze_price_data":
                data = await self._analyze_price_data(
                    arguments["commodity"],
                    arguments["data_points"]
                )
                return ToolResult(tool_name, True, data)
                
            elif tool_name == "execute_analysis_code":
                data = await self._execute_code(
                    arguments["code"],
                    arguments.get("context", {})
                )
                return ToolResult(tool_name, True, data)
                
            elif tool_name == "get_weather_impact":
                data = await self._get_weather_impact(
                    arguments["region"],
                    arguments["commodity"],
                    arguments.get("weather_event")
                )
                return ToolResult(tool_name, True, data)
                
            else:
                return ToolResult(tool_name, False, None, f"Unknown tool: {tool_name}")
                
        except Exception as e:
            logger.error(f"Tool execution error: {e}")
            return ToolResult(tool_name, False, None, str(e))
    
    async def _search_commodity_news(self, commodity: str, timeframe: str = "week") -> Dict[str, Any]:
        """Search for commodity news using NewsDataSources and web search"""
        articles = []
        sources_used = []
        
        # First, try to get news from NewsDataSources (RSS feeds)
        if NEWS_SOURCES_AVAILABLE:
            try:
                async with NewsDataSources() as news_sources:
                    all_news = await news_sources.fetch_all_sources()
                    
                    # Filter for relevant commodity
                    for article in all_news:
                        title = article.get('title', '').lower()
                        summary = article.get('summary', '').lower()
                        if commodity.lower() in title or commodity.lower() in summary:
                            articles.append({
                                "title": article.get('title'),
                                "snippet": article.get('summary'),
                                "url": article.get('url'),
                                "source": article.get('source'),
                                "published": article.get('published', datetime.now()).isoformat() if isinstance(article.get('published'), datetime) else article.get('published'),
                                "category": article.get('category', 'news')
                            })
                            if article.get('source') not in sources_used:
                                sources_used.append(article.get('source'))
                    
                    logger.info(f"Fetched {len(articles)} articles from NewsDataSources for {commodity}")
            except Exception as e:
                logger.error(f"Error fetching from NewsDataSources: {e}")
        
        # Supplement with web search if available
        if self.search_engine and len(articles) < 5:
            try:
                results = self.search_engine.text(
                    f"{commodity} commodity market news {timeframe}",
                    max_results=5
                )
                
                for r in results:
                    articles.append({
                        "title": r.get("title"),
                        "snippet": r.get("body"),
                        "url": r.get("href"),
                        "source": "Web Search",
                        "published": datetime.now().isoformat(),
                        "category": "web_search"
                    })
                    if "Web Search" not in sources_used:
                        sources_used.append("Web Search")
            except Exception as e:
                logger.error(f"Web search error: {e}")
        
        return {
            "commodity": commodity,
            "timeframe": timeframe,
            "articles": articles[:10],  # Limit to 10 most relevant
            "sources_used": sources_used,
            "search_timestamp": datetime.now().isoformat()
        }
    
    async def _analyze_price_data(self, commodity: str, data_points: List[Dict]) -> Dict[str, Any]:
        """Analyze price data and generate predictions"""
        # Simple analysis - in production, use proper statistical methods
        prices = [p["price"] for p in data_points]
        avg_price = sum(prices) / len(prices)
        trend = "up" if prices[-1] > prices[0] else "down"
        volatility = max(prices) - min(prices)
        
        return {
            "commodity": commodity,
            "analysis": {
                "average_price": avg_price,
                "current_price": prices[-1],
                "trend": trend,
                "volatility": volatility,
                "price_range": {"min": min(prices), "max": max(prices)}
            },
            "prediction": {
                "next_day": prices[-1] * (1.01 if trend == "up" else 0.99),
                "next_week": prices[-1] * (1.05 if trend == "up" else 0.95),
                "confidence": 0.7
            }
        }
    
    async def _execute_code(self, code: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Python code safely"""
        # WARNING: Code execution should be done in a sandboxed environment
        # This is a simplified example - use proper sandboxing in production
        
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                # Add context variables
                setup_code = "import json\nimport numpy as np\nimport pandas as pd\n\n"
                for key, value in context.items():
                    setup_code += f"{key} = {repr(value)}\n"
                
                f.write(setup_code + "\n" + code)
                f.flush()
                
                # Execute in subprocess with timeout
                result = subprocess.run(
                    ["python", f.name],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                os.unlink(f.name)
                
                return {
                    "success": result.returncode == 0,
                    "output": result.stdout,
                    "error": result.stderr if result.returncode != 0 else None
                }
                
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Code execution timeout"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _get_weather_impact(self, region: str, commodity: str, weather_event: Optional[str] = None) -> Dict[str, Any]:
        """Analyze weather impact on commodities"""
        # Simplified analysis - integrate with real weather APIs in production
        impacts = {
            "wheat": {"drought": -0.3, "flood": -0.2, "frost": -0.15},
            "corn": {"drought": -0.25, "flood": -0.15, "heat": -0.1},
            "coffee": {"frost": -0.4, "drought": -0.2, "rain": 0.1},
            "sugar": {"drought": -0.2, "flood": -0.25, "hurricane": -0.3}
        }
        
        commodity_lower = commodity.lower()
        if commodity_lower in impacts and weather_event:
            impact_factor = impacts[commodity_lower].get(weather_event.lower(), 0)
        else:
            impact_factor = 0
        
        return {
            "region": region,
            "commodity": commodity,
            "weather_event": weather_event or "normal",
            "impact_factor": impact_factor,
            "impact_description": f"{'Negative' if impact_factor < 0 else 'Positive'} impact of {abs(impact_factor)*100:.0f}%",
            "recommendations": [
                "Monitor weather patterns closely",
                "Consider hedging strategies" if impact_factor < -0.2 else "Maintain current positions",
                "Review supply chain alternatives" if impact_factor < -0.3 else "Continue normal operations"
            ]
        }
    
    async def _web_search(self, query: str) -> List[Dict[str, str]]:
        """Perform web search"""
        if not self.search_engine:
            return []
        
        try:
            results = self.search_engine.text(query, max_results=3)
            return [
                {
                    "title": r.get("title", ""),
                    "snippet": r.get("body", ""),
                    "url": r.get("href", "")
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Web search error: {e}")
            return []
    
    async def _get_completion(
        self,
        prompt: str,
        mode: ResponseMode = ResponseMode.TEXT,
        response_schema: Optional[Dict[str, Any]] = None,
        model: str = None,
        reasoning_effort: ReasoningEffort = ReasoningEffort.MEDIUM,
        stream: bool = False
    ) -> Union[str, Dict[str, Any]]:
        """Get completion from Groq with specified mode"""
        if not self.client:
            return {"error": "Groq client not initialized"}
        
        try:
            messages = [{"role": "user", "content": prompt}]
            
            # Select model
            selected_model = self.models.get(model, self.models[self.default_model])
            
            # Configure based on mode
            kwargs = {
                "model": selected_model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 8192,
                "stream": stream
            }
            
            # Add reasoning effort for GPT-OSS-120B
            if "gpt-oss" in selected_model:
                kwargs["reasoning_effort"] = reasoning_effort.value
            
            if mode == ResponseMode.JSON_OBJECT:
                kwargs["response_format"] = {"type": "json_object"}
                messages[0]["content"] += "\n\nRespond with valid JSON only."
                
            elif mode == ResponseMode.JSON_SCHEMA and response_schema:
                messages[0]["content"] += f"\n\nRespond following this JSON schema:\n{json.dumps(response_schema, indent=2)}"
                kwargs["response_format"] = {"type": "json_object"}
            
            if stream:
                # Handle streaming response
                full_content = ""
                for chunk in self.client.chat.completions.create(**kwargs):
                    if chunk.choices[0].delta.content:
                        full_content += chunk.choices[0].delta.content
                content = full_content
            else:
                response = self.client.chat.completions.create(**kwargs)
                content = response.choices[0].message.content
            
            # Parse JSON responses
            if mode in [ResponseMode.JSON_OBJECT, ResponseMode.JSON_SCHEMA]:
                try:
                    return json.loads(content)
                except json.JSONDecodeError:
                    return {"error": "Invalid JSON response", "content": content}
            
            return content
            
        except Exception as e:
            logger.error(f"Groq completion error: {e}")
            return {"error": str(e)}
    
    async def generate_market_report(
        self,
        commodities: List[str],
        include_predictions: bool = True,
        include_news: bool = True,
        model: str = "gpt-oss",  # Use GPT-OSS-120B for comprehensive reports
        reasoning_effort: ReasoningEffort = ReasoningEffort.HIGH,
        include_sources: bool = True
    ) -> Dict[str, Any]:
        """Generate comprehensive market report"""
        report = {
            "generated_at": datetime.now().isoformat(),
            "commodities": {},
            "market_overview": "",
            "key_insights": [],
            "sources": []  # Aggregate sources
        }
        
        all_sources = set()  # Track unique sources
        
        for commodity in commodities:
            # Analyze each commodity
            analysis = await self.analyze_with_reasoning(
                f"Analyze {commodity} market conditions, trends, and outlook",
                commodity=commodity,
                use_tools=True,
                search_web=include_news,
                include_sources=include_sources
            )
            
            report["commodities"][commodity] = analysis
            
            # Collect sources
            if 'sources' in analysis:
                for source in analysis['sources']:
                    all_sources.add(source['name'])
        
        # Generate overview
        overview_prompt = f"""
        Based on the analysis of {', '.join(commodities)}, provide:
        1. Market overview (2-3 sentences)
        2. Top 3 key insights
        3. Risk factors
        4. Opportunities
        
        Format as JSON with keys: overview, insights, risks, opportunities
        """
        
        overview = await self._get_completion(overview_prompt, mode=ResponseMode.JSON_OBJECT)
        report.update(overview)
        
        # Add aggregated sources to report
        report["sources"] = [
            {"name": source, "type": "news"} 
            for source in all_sources
        ]
        
        return report

# Convenience functions for integration
async def analyze_commodity(query: str, commodity: str = None) -> Dict[str, Any]:
    """Quick commodity analysis"""
    service = GroqAIService()
    return await service.analyze_with_reasoning(query, commodity)

async def chat_with_ai(messages: List[Dict[str, str]], use_tools: bool = True) -> Dict[str, Any]:
    """Chat interface with optional tools"""
    service = GroqAIService()
    return await service.chat_with_tools(messages, available_tools=None if use_tools else [])

async def generate_daily_report(commodities: List[str] = ["oil", "gold", "wheat"]) -> Dict[str, Any]:
    """Generate daily market report"""
    service = GroqAIService()
    return await service.generate_market_report(commodities)
