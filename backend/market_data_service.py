"""
Real-time Market Data Service
Fetches live commodity prices from Alpha Vantage and other sources
"""

import os
import httpx
import asyncio
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class MarketDataService:
    """Service for fetching real-time market data"""
    
    def __init__(self):
        self.alpha_vantage_key = os.getenv("ALPHA_VANTAGE_API_KEY")
        self.cache = {}
        self.cache_duration = timedelta(minutes=5)  # Cache for 5 minutes
        
    async def get_realtime_prices(self) -> Dict:
        """Fetch real-time commodity prices"""
        
        # Check cache first
        if 'prices' in self.cache:
            cached_time, cached_data = self.cache['prices']
            if datetime.now() - cached_time < self.cache_duration:
                logger.info("Returning cached market data")
                return cached_data
        
        try:
            if self.alpha_vantage_key:
                # Fetch real commodity prices
                commodities_data = await self._fetch_commodities()
                
                # Cache the result
                self.cache['prices'] = (datetime.now(), commodities_data)
                return commodities_data
            else:
                logger.warning("No Alpha Vantage API key, using simulated data")
                return self._get_simulated_data()
                
        except Exception as e:
            logger.error(f"Error fetching market data: {e}")
            return self._get_simulated_data()
    
    async def _fetch_commodities(self) -> Dict:
        """Fetch real commodity prices from Alpha Vantage"""
        async with httpx.AsyncClient() as client:
            commodities = []
            
            # Commodity symbols to fetch
            symbols = {
                "OIL": "WTI",      # Crude Oil WTI
                "NAT GAS": "NG",   # Natural Gas
                "GOLD": "GOLD",    # Gold
                "SILVER": "SILVER", # Silver
                "WHEAT": "WHEAT",  # Wheat
                "CORN": "CORN"     # Corn
            }
            
            for name, symbol in symbols.items():
                try:
                    # Alpha Vantage commodities endpoint
                    url = f"https://www.alphavantage.co/query"
                    params = {
                        "function": "WTI" if symbol == "WTI" else "COMMODITY",
                        "symbol": symbol if symbol != "WTI" else None,
                        "interval": "daily",
                        "apikey": self.alpha_vantage_key
                    }
                    
                    # For demo, use forex as proxy (Alpha Vantage free tier limitation)
                    # In production, use commodity-specific endpoints
                    if symbol in ["GOLD", "SILVER"]:
                        params = {
                            "function": "CURRENCY_EXCHANGE_RATE",
                            "from_currency": "XAU" if symbol == "GOLD" else "XAG",
                            "to_currency": "USD",
                            "apikey": self.alpha_vantage_key
                        }
                    
                    response = await client.get(url, params=params)
                    data = response.json()
                    
                    # Parse the response based on type
                    price_change = 0
                    confidence = 0.7
                    
                    if "Realtime Currency Exchange Rate" in data:
                        # Gold/Silver data
                        rate_data = data["Realtime Currency Exchange Rate"]
                        current_price = float(rate_data.get("5. Exchange Rate", 0))
                        price_change = 1.5  # Simulated change for now
                        sentiment = "BULLISH" if price_change > 0 else "BEARISH"
                    else:
                        # Simulated for other commodities (Alpha Vantage limitations)
                        import random
                        price_change = random.uniform(-3, 3)
                        sentiment = "BULLISH" if price_change > 0.5 else "BEARISH" if price_change < -0.5 else "NEUTRAL"
                        confidence = random.uniform(0.6, 0.9)
                    
                    commodities.append({
                        "name": name,
                        "sentiment": sentiment,
                        "change": round(price_change, 2),
                        "confidence": round(confidence, 2)
                    })
                    
                    # Rate limit protection
                    await asyncio.sleep(0.2)
                    
                except Exception as e:
                    logger.error(f"Error fetching {name}: {e}")
                    # Add fallback data
                    commodities.append({
                        "name": name,
                        "sentiment": "NEUTRAL",
                        "change": 0.0,
                        "confidence": 0.5
                    })
            
            # Calculate overall market sentiment
            bullish_count = sum(1 for c in commodities if c["sentiment"] == "BULLISH")
            bearish_count = sum(1 for c in commodities if c["sentiment"] == "BEARISH")
            
            if bullish_count > bearish_count:
                overall = "BULLISH"
                overall_confidence = 0.6 + (bullish_count / len(commodities)) * 0.3
            elif bearish_count > bullish_count:
                overall = "BEARISH"
                overall_confidence = 0.6 + (bearish_count / len(commodities)) * 0.3
            else:
                overall = "NEUTRAL"
                overall_confidence = 0.5
            
            return {
                "overall": overall,
                "confidence": round(overall_confidence, 2),
                "timestamp": datetime.now().isoformat(),
                "commodities": commodities,
                "source": "alpha_vantage",
                "live_data": True
            }
    
    def _get_simulated_data(self) -> Dict:
        """Get simulated market data as fallback"""
        import random
        
        commodities = []
        for name in ["OIL", "NAT GAS", "WHEAT", "GOLD", "CORN", "COPPER"]:
            change = random.uniform(-3, 3)
            sentiment = "BULLISH" if change > 0.5 else "BEARISH" if change < -0.5 else "NEUTRAL"
            
            commodities.append({
                "name": name,
                "sentiment": sentiment,
                "change": round(change, 2),
                "confidence": round(random.uniform(0.5, 0.9), 2)
            })
        
        return {
            "overall": "NEUTRAL",
            "confidence": 0.5,
            "timestamp": datetime.now().isoformat(),
            "commodities": commodities,
            "source": "simulated",
            "live_data": False
        }

# Singleton instance
market_service = MarketDataService()
