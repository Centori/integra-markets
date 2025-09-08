"""
User Preference-Based News Service
Fetches real-time news and data based on user's alert preferences and website choices
"""

import os
import httpx
import asyncio
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging
from bs4 import BeautifulSoup
import feedparser
import re

logger = logging.getLogger(__name__)

class UserNewsService:
    """Service for fetching news based on user preferences"""
    
    def __init__(self):
        self.cache = {}
        self.cache_duration = timedelta(minutes=15)  # Cache for 15 minutes
        
        # Default news sources if user hasn't specified
        self.default_sources = {
            "reuters": "https://www.reuters.com/markets/commodities/",
            "bloomberg": "https://www.bloomberg.com/markets/commodities",
            "cnbc": "https://www.cnbc.com/commodities/",
            "oilprice": "https://oilprice.com/",
            "marketwatch": "https://www.marketwatch.com/investing/future",
            "investing": "https://www.investing.com/commodities/"
        }
        
        # RSS feeds for commodities news
        self.rss_feeds = {
            "reuters_commodities": "https://news.google.com/rss/search?q=commodity+prices+oil+gold+wheat&hl=en-US&gl=US&ceid=US:en",
            "marketwatch": "https://feeds.marketwatch.com/marketwatch/marketpulse/",
            "investing": "https://www.investing.com/rss/commodities.rss"
        }
    
    async def get_user_based_news(self, user_preferences: Dict) -> Dict:
        """Fetch news based on user preferences"""
        
        # Extract user preferences
        commodities = user_preferences.get('commodities', ['oil', 'gold', 'wheat'])
        regions = user_preferences.get('regions', ['US', 'EU', 'Asia'])
        keywords = user_preferences.get('keywords', [])
        website_urls = user_preferences.get('websiteURLs', [])
        alert_threshold = user_preferences.get('alertThreshold', 'medium')
        
        # Check cache
        cache_key = f"{','.join(commodities)}_{','.join(regions)}"
        if cache_key in self.cache:
            cached_time, cached_data = self.cache[cache_key]
            if datetime.now() - cached_time < self.cache_duration:
                logger.info("Returning cached user-based news")
                return cached_data
        
        try:
            # Fetch news from multiple sources
            all_news = []
            
            # 1. Fetch from user-specified websites
            if website_urls:
                custom_news = await self._fetch_from_custom_urls(website_urls, commodities, keywords)
                all_news.extend(custom_news)
            
            # 2. Fetch from RSS feeds
            rss_news = await self._fetch_from_rss(commodities, regions, keywords)
            all_news.extend(rss_news)
            
            # 3. Fetch market data for specific commodities
            market_data = await self._fetch_commodity_data(commodities)
            
            # 4. Process and filter news based on threshold
            filtered_news = self._filter_by_threshold(all_news, alert_threshold)
            
            # 5. Analyze sentiment for each news item
            analyzed_news = self._analyze_news_sentiment(filtered_news, commodities)
            
            result = {
                "timestamp": datetime.now().isoformat(),
                "user_preferences": {
                    "commodities": commodities,
                    "regions": regions,
                    "keywords": keywords,
                    "sources": len(website_urls) if website_urls else len(self.default_sources)
                },
                "news": analyzed_news[:20],  # Limit to 20 most relevant items
                "market_data": market_data,
                "alert_count": len([n for n in analyzed_news if n.get('is_alert', False)])
            }
            
            # Cache the result
            self.cache[cache_key] = (datetime.now(), result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching user-based news: {e}")
            return self._get_fallback_news(commodities)
    
    async def _fetch_from_custom_urls(self, urls: List[str], commodities: List[str], keywords: List[str]) -> List[Dict]:
        """Fetch news from user-specified URLs"""
        news_items = []
        
        async with httpx.AsyncClient() as client:
            for url in urls[:5]:  # Limit to 5 custom URLs
                try:
                    response = await client.get(url, timeout=5.0)
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.text, 'html.parser')
                        
                        # Extract articles (generic extraction)
                        articles = soup.find_all(['article', 'div'], class_=re.compile('article|news|story|post'))
                        
                        for article in articles[:10]:  # Limit articles per source
                            title_elem = article.find(['h1', 'h2', 'h3', 'h4'])
                            summary_elem = article.find(['p', 'div'], class_=re.compile('summary|excerpt|description'))
                            
                            if title_elem:
                                title = title_elem.get_text().strip()
                                summary = summary_elem.get_text().strip() if summary_elem else ""
                                
                                # Check if relevant to user's commodities/keywords
                                relevant = any(comm.lower() in title.lower() or comm.lower() in summary.lower() 
                                             for comm in commodities)
                                if keywords:
                                    relevant = relevant or any(kw.lower() in title.lower() or kw.lower() in summary.lower() 
                                                              for kw in keywords)
                                
                                if relevant:
                                    news_items.append({
                                        "title": title,
                                        "summary": summary[:200],
                                        "source": url.split('/')[2],  # Domain name
                                        "url": url,
                                        "timestamp": datetime.now().isoformat(),
                                        "relevance_score": 0.8 if relevant else 0.3
                                    })
                    
                    await asyncio.sleep(0.5)  # Rate limiting
                    
                except Exception as e:
                    logger.error(f"Error fetching from {url}: {e}")
        
        return news_items
    
    async def _fetch_from_rss(self, commodities: List[str], regions: List[str], keywords: List[str]) -> List[Dict]:
        """Fetch news from RSS feeds"""
        news_items = []
        
        for feed_name, feed_url in self.rss_feeds.items():
            try:
                # Build search query
                search_terms = commodities + keywords
                if "google" in feed_url and search_terms:
                    # Update Google News RSS with user's search terms
                    query = "+".join(search_terms)
                    feed_url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"
                
                feed = feedparser.parse(feed_url)
                
                for entry in feed.entries[:15]:  # Limit entries per feed
                    # Check relevance
                    title = entry.get('title', '')
                    summary = entry.get('summary', '')
                    
                    relevant = any(comm.lower() in title.lower() or comm.lower() in summary.lower() 
                                 for comm in commodities)
                    
                    if relevant or not commodities:  # Include if relevant or no specific commodities
                        news_items.append({
                            "title": title,
                            "summary": summary[:200],
                            "source": feed_name,
                            "url": entry.get('link', ''),
                            "published": entry.get('published', datetime.now().isoformat()),
                            "relevance_score": 0.9 if relevant else 0.5
                        })
                        
            except Exception as e:
                logger.error(f"Error fetching RSS feed {feed_name}: {e}")
        
        # Sort by relevance and recency
        news_items.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return news_items
    
    async def _fetch_commodity_data(self, commodities: List[str]) -> Dict:
        """Fetch real-time commodity price data"""
        market_data = {}
        
        # Map user commodity names to symbols
        commodity_map = {
            "oil": {"symbol": "CL", "name": "Crude Oil", "unit": "$/barrel"},
            "gold": {"symbol": "GC", "name": "Gold", "unit": "$/ounce"},
            "silver": {"symbol": "SI", "name": "Silver", "unit": "$/ounce"},
            "wheat": {"symbol": "W", "name": "Wheat", "unit": "$/bushel"},
            "corn": {"symbol": "C", "name": "Corn", "unit": "$/bushel"},
            "natural gas": {"symbol": "NG", "name": "Natural Gas", "unit": "$/MMBtu"},
            "copper": {"symbol": "HG", "name": "Copper", "unit": "$/pound"}
        }
        
        for commodity in commodities:
            comm_lower = commodity.lower()
            if comm_lower in commodity_map:
                info = commodity_map[comm_lower]
                
                # Simulate real-time data (replace with actual API call)
                import random
                base_price = {
                    "oil": 75.50,
                    "gold": 2050.00,
                    "silver": 24.50,
                    "wheat": 5.80,
                    "corn": 4.25,
                    "natural gas": 2.75,
                    "copper": 3.85
                }.get(comm_lower, 100)
                
                change = random.uniform(-5, 5)
                current_price = base_price * (1 + change/100)
                
                market_data[commodity] = {
                    "symbol": info["symbol"],
                    "name": info["name"],
                    "current_price": round(current_price, 2),
                    "change_percent": round(change, 2),
                    "change_amount": round(current_price - base_price, 2),
                    "unit": info["unit"],
                    "timestamp": datetime.now().isoformat(),
                    "sentiment": "BULLISH" if change > 1 else "BEARISH" if change < -1 else "NEUTRAL"
                }
        
        return market_data
    
    def _filter_by_threshold(self, news: List[Dict], threshold: str) -> List[Dict]:
        """Filter news based on alert threshold"""
        
        # Define importance scores for different thresholds
        threshold_scores = {
            "low": 0.3,
            "medium": 0.5,
            "high": 0.7
        }
        
        min_score = threshold_scores.get(threshold, 0.5)
        
        # Filter news by relevance score
        filtered = [item for item in news if item.get('relevance_score', 0) >= min_score]
        
        # Mark high-importance items as alerts
        for item in filtered:
            if item.get('relevance_score', 0) >= 0.8:
                item['is_alert'] = True
                item['alert_type'] = 'high_impact'
        
        return filtered
    
    def _analyze_news_sentiment(self, news: List[Dict], commodities: List[str]) -> List[Dict]:
        """Analyze sentiment for each news item"""
        
        # Sentiment keywords
        positive_words = ['surge', 'rise', 'gain', 'boost', 'rally', 'increase', 'up', 'high', 'strong', 'bullish']
        negative_words = ['fall', 'drop', 'decline', 'decrease', 'down', 'low', 'weak', 'bearish', 'crash', 'plunge']
        
        for item in news:
            text = (item.get('title', '') + ' ' + item.get('summary', '')).lower()
            
            # Count sentiment words
            pos_count = sum(1 for word in positive_words if word in text)
            neg_count = sum(1 for word in negative_words if word in text)
            
            # Determine sentiment
            if pos_count > neg_count:
                item['sentiment'] = 'POSITIVE'
                item['sentiment_score'] = min(0.5 + (pos_count * 0.1), 1.0)
            elif neg_count > pos_count:
                item['sentiment'] = 'NEGATIVE'
                item['sentiment_score'] = max(0.5 - (neg_count * 0.1), 0.0)
            else:
                item['sentiment'] = 'NEUTRAL'
                item['sentiment_score'] = 0.5
            
            # Tag relevant commodities
            item['related_commodities'] = [c for c in commodities if c.lower() in text]
        
        return news
    
    def _get_fallback_news(self, commodities: List[str]) -> Dict:
        """Return fallback news when fetching fails"""
        return {
            "timestamp": datetime.now().isoformat(),
            "user_preferences": {
                "commodities": commodities,
                "regions": [],
                "keywords": [],
                "sources": 0
            },
            "news": [
                {
                    "title": f"{commodity.title()} Market Update",
                    "summary": f"Latest updates on {commodity} market conditions and price movements.",
                    "source": "Market Watch",
                    "sentiment": "NEUTRAL",
                    "relevance_score": 0.5
                } for commodity in commodities[:3]
            ],
            "market_data": {},
            "alert_count": 0,
            "error": "Unable to fetch real-time news"
        }

# Singleton instance
user_news_service = UserNewsService()
