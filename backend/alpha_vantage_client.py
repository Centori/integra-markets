"""
Alpha Vantage API client wrapper with rate limiting and caching.
Focused on FX and commodities data.
"""

import os
import time
import json
import logging
from typing import Dict, Optional, List, Any
from datetime import datetime, timedelta
import aiohttp
import asyncio
from dataclasses import dataclass
from functools import wraps

logger = logging.getLogger(__name__)

@dataclass
class RateLimitConfig:
    """Rate limit configuration"""
    requests_per_minute: int = 5
    requests_per_day: int = 500
    request_window: int = 60  # seconds

class RateLimiter:
    """Rate limiter with sliding window"""
    def __init__(self, config: RateLimitConfig):
        self.config = config
        self.requests: List[float] = []
        self.daily_requests: List[float] = []
    
    def can_make_request(self) -> bool:
        """Check if a request can be made within rate limits"""
        now = time.time()
        
        # Clean up old requests
        self.requests = [t for t in self.requests if now - t < self.config.request_window]
        self.daily_requests = [t for t in self.daily_requests if now - t < 24 * 3600]
        
        # Check limits
        return (len(self.requests) < self.config.requests_per_minute and 
                len(self.daily_requests) < self.config.requests_per_day)
    
    async def wait_if_needed(self):
        """Wait until a request can be made"""
        while not self.can_make_request():
            await asyncio.sleep(1)
        
        # Record the request
        now = time.time()
        self.requests.append(now)
        self.daily_requests.append(now)

class Cache:
    """Simple in-memory cache with TTL"""
    def __init__(self, ttl_seconds: int = 300):  # 5 minute default TTL
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.ttl = ttl_seconds
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key in self.cache:
            entry = self.cache[key]
            if time.time() - entry['timestamp'] < self.ttl:
                return entry['data']
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, value: Any):
        """Set value in cache with timestamp"""
        self.cache[key] = {
            'data': value,
            'timestamp': time.time()
        }

class AlphaVantageClient:
    """Alpha Vantage API client with rate limiting and caching"""
    
    BASE_URL = "https://www.alphavantage.co/query"
    
    def __init__(self, cache_ttl: int = 300):
        self.api_key = os.getenv('ALPHAVANTAGE_API_KEY')
        if not self.api_key:
            raise ValueError("ALPHAVANTAGE_API_KEY environment variable not set")
        
        self.rate_limiter = RateLimiter(RateLimitConfig())
        self.cache = Cache(ttl_seconds=cache_ttl)
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(timeout=timeout)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def _make_request(self, params: Dict[str, str]) -> Dict:
        """Make API request with rate limiting and caching"""
        if not self.session:
            raise RuntimeError("Client not initialized - use async with")
        
        # Add API key
        params['apikey'] = self.api_key
        
        # Check cache
        cache_key = json.dumps(params, sort_keys=True)
        cached = self.cache.get(cache_key)
        if cached:
            logger.debug("Cache hit for %s", cache_key)
            return cached
        
        # Wait for rate limit
        await self.rate_limiter.wait_if_needed()
        
        # Make request
        async with self.session.get(self.BASE_URL, params=params) as response:
            if response.status != 200:
                raise Exception(f"API request failed: {response.status}")
            
            data = await response.json()
            
            # Check for API errors
            if 'Error Message' in data:
                raise Exception(f"API error: {data['Error Message']}")
            
            # Cache response
            self.cache.set(cache_key, data)
            return data
    
    async def get_fx_series(self, from_symbol: str, to_symbol: str, interval: str = 'DAILY') -> Dict:
        """Get FX time series data
        
        Args:
            from_symbol: From currency (e.g., 'EUR')
            to_symbol: To currency (e.g., 'USD') 
            interval: 'DAILY', 'WEEKLY', 'MONTHLY'
        """
        params = {
            'function': f'FX_{interval}',
            'from_symbol': from_symbol,
            'to_symbol': to_symbol
        }
        return await self._make_request(params)
    
    async def get_fx_rate(self, from_symbol: str, to_symbol: str) -> Dict:
        """Get current FX rate
        
        Args:
            from_symbol: From currency (e.g., 'EUR')
            to_symbol: To currency (e.g., 'USD')
        """
        params = {
            'function': 'CURRENCY_EXCHANGE_RATE',
            'from_currency': from_symbol,
            'to_currency': to_symbol
        }
        return await self._make_request(params)
    
    async def get_commodity_rate(self, symbol: str, market: str = 'USD') -> Dict:
        """Get current commodity rate
        
        Args:
            symbol: Commodity symbol (e.g., 'WTI', 'BRENT', 'NATURAL_GAS')
            market: Market currency (default USD)
        """
        params = {
            'function': 'COMMODITY_RATE',
            'symbol': symbol,
            'market': market
        }
        return await self._make_request(params)
    
    async def get_commodity_series(self, symbol: str, interval: str = 'DAILY') -> Dict:
        """Get commodity time series data
        
        Args:
            symbol: Commodity symbol (e.g., 'WTI', 'BRENT', 'NATURAL_GAS')
            interval: 'DAILY', 'WEEKLY', 'MONTHLY'
        """
        params = {
            'function': f'COMMODITY_{interval}',
            'symbol': symbol
        }
        return await self._make_request(params)

# Example usage:
async def example():
    async with AlphaVantageClient() as client:
        # Get EUR/USD daily series
        eur_usd = await client.get_fx_series('EUR', 'USD')
        print(eur_usd)
        
        # Get current WTI crude oil price
        wti = await client.get_commodity_rate('WTI')
        print(wti)

if __name__ == '__main__':
    asyncio.run(example())
