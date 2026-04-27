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

# Import the article summarizer that already exists!
try:
    from article_summarizer import ArticleSummarizer
    SUMMARIZER_AVAILABLE = True
except ImportError:
    SUMMARIZER_AVAILABLE = False
    logging.warning("Article summarizer not available")

# Import VADER for enhanced sentiment
try:
    from nltk.sentiment.vader import SentimentIntensityAnalyzer
    vader_analyzer = SentimentIntensityAnalyzer()
    VADER_AVAILABLE = True
except ImportError:
    VADER_AVAILABLE = False
    vader_analyzer = None
    logging.warning("VADER sentiment analyzer not available")

logger = logging.getLogger(__name__)

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
                {"pattern": r"(sanctions|embargo|conflict|war).{0,24}(oil|crude|shipping|export)?", "signal": "Supply disruption risk"}
            ],
            "bearish": [
                {"pattern": r"(production|output|supply).{0,18}(rise|increase|boost|grow)", "signal": "Supply growth"},
                {"pattern": r"(inventory|stockpile).{0,12}(build|rise|increase)", "signal": "Inventory build"},
                {"pattern": r"demand.{0,18}(slow|weak|fall|decline)", "signal": "Demand weakness"}
            ]
        },
        "gas": {
            "bullish": [
                {"pattern": r"(cold|freeze|arctic|winter storm)", "signal": "Heating demand surge"},
                {"pattern": r"(storage|inventory).{0,12}(draw|drop|below)", "signal": "Storage draw"}
            ],
            "bearish": [
                {"pattern": r"(warm|mild).{0,18}(weather|winter)", "signal": "Weak heating demand"},
                {"pattern": r"(storage|inventory).{0,12}(build|surplus|above)", "signal": "Storage surplus"}
            ]
        },
        "gold": {
            "bullish": [
                {"pattern": r"(rate cut|dovish|lower yields|yield fall|yield drops?)", "signal": "Lower real-rate pressure"},
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
                {"pattern": r"(rate cut|liquidity|easing|dovish)", "signal": "Liquidity tailwind"}
            ],
            "bearish": [
                {"pattern": r"(sec|regulator|crackdown|ban|lawsuit)", "signal": "Regulatory pressure"},
                {"pattern": r"(hack|liquidation|outflow)", "signal": "Market stress"}
            ]
        },
        "wheat": {
            "bullish": [
                {"pattern": r"(drought|flood|freeze|frost|heatwave)", "signal": "Crop risk"},
                {"pattern": r"(export ban|supply shortage|crop damage)", "signal": "Supply tightening"}
            ],
            "bearish": [
                {"pattern": r"(bumper crop|record harvest|strong yield)", "signal": "Strong harvest"},
                {"pattern": r"(rainfall|weather).{0,18}(improve|favorable)", "signal": "Improving crop conditions"}
            ]
        },
        "corn": {
            "bullish": [
                {"pattern": r"(drought|heatwave|crop stress|yield loss)", "signal": "Crop stress"},
                {"pattern": r"(ethanol demand|export sales).{0,18}(rise|strong)", "signal": "Demand support"}
            ],
            "bearish": [
                {"pattern": r"(record crop|strong yield|ample supply)", "signal": "Ample supply"}
            ]
        }
    }

def analyze_market_sentiment(text: str, commodity: Optional[str], scores: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
    normalized = normalize_commodity(commodity, text)
    if scores:
        compound = scores["compound"]
        base_score = compound
    else:
        base_score = 0.0
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
    combined_score = (base_score * 0.4) + (directional_score * 0.6) if matched_signals else base_score
    if combined_score >= 0.12:
        sentiment = "POSITIVE"
        sentiment_score = _clamp(0.55 + abs(combined_score) * 0.35, 0.5, 0.96)
    elif combined_score <= -0.12:
        sentiment = "NEGATIVE"
        sentiment_score = _clamp(0.45 - abs(combined_score) * 0.05, 0.0, 0.49)
    else:
        sentiment = "NEUTRAL"
        sentiment_score = 0.5
    return {
        "commodity": normalized,
        "sentiment": sentiment,
        "sentiment_score": round(sentiment_score, 2),
        "market_context": {
            "directional_score": round(combined_score, 3),
            "matched_signals": matched_signals
        }
    }

class UserNewsService:
    """Service for fetching news based on user preferences"""
    
    def __init__(self):
        self.cache = {}
        self.cache_duration = timedelta(minutes=15)  # Cache for 15 minutes
        
        # Initialize the article summarizer (uses NLTK, Sumy, and Newspaper3k)
        self.summarizer = ArticleSummarizer() if SUMMARIZER_AVAILABLE else None
        if self.summarizer:
            logger.info("Article summarizer initialized with NLTK/Sumy/Newspaper3k support")
        
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
        """Fetch news from RSS feeds and enhance with article summaries"""
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
                
                for entry in feed.entries[:10]:  # Limit entries per feed
                    title = entry.get('title', '')
                    url = entry.get('link', '')
                    
                    # Check relevance
                    relevant = any(comm.lower() in title.lower() for comm in commodities)
                    
                    if relevant or not commodities:  # Include if relevant or no specific commodities
                        # Initialize news item
                        news_item = {
                            "title": title,
                            "source": feed_name,
                            "url": url,
                            "published": entry.get('published', datetime.now().isoformat()),
                            "relevance_score": 0.9 if relevant else 0.5
                        }
                        
                        # Use article summarizer to get real content and summary
                        if self.summarizer and url:
                            try:
                                # Summarize article using NLTK/Sumy/Newspaper3k
                                summary_result = self.summarizer.summarize_url(url, sentences=3, method='auto')
                                
                                if 'error' not in summary_result:
                                    # Get the actual summary from the article
                                    summary_sentences = summary_result.get('summary', [])
                                    if summary_sentences:
                                        news_item['summary'] = ' '.join(summary_sentences)
                                    else:
                                        news_item['summary'] = title  # Fallback to title
                                    
                                    # Extract keywords if available
                                    if 'keywords' in summary_result:
                                        news_item['keywords'] = summary_result['keywords'][:5]
                                    
                                    # Get full text for better sentiment analysis
                                    full_text = summary_result.get('full_text', news_item['summary'])
                                    
                                    # Perform VADER sentiment analysis on full article
                                    if VADER_AVAILABLE and vader_analyzer and full_text:
                                        scores = vader_analyzer.polarity_scores(full_text)
                                        analysis = analyze_market_sentiment(full_text, None, scores)
                                        news_item['sentiment'] = analysis['sentiment']
                                        news_item['sentiment_score'] = analysis['sentiment_score']
                                        news_item['market_context'] = analysis['market_context']
                                        if analysis['commodity']:
                                            news_item['commodity'] = analysis['commodity']
                                    else:
                                        # Use basic sentiment if VADER not available
                                        self._add_basic_sentiment(news_item, full_text or title)
                                else:
                                    # Summarization failed, use title as summary
                                    news_item['summary'] = title
                                    self._add_basic_sentiment(news_item, title)
                                    
                            except Exception as e:
                                logger.warning(f"Could not summarize {url}: {e}")
                                news_item['summary'] = title
                                self._add_basic_sentiment(news_item, title)
                        else:
                            # No summarizer available, use title as summary
                            news_item['summary'] = title
                            self._add_basic_sentiment(news_item, title)
                        
                        news_items.append(news_item)
                        
                        # Rate limiting to avoid overwhelming servers
                        await asyncio.sleep(0.5)
                        
            except Exception as e:
                logger.error(f"Error fetching RSS feed {feed_name}: {e}")
        
        # Sort by relevance and recency
        news_items.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return news_items
    
    def _add_basic_sentiment(self, item: Dict, text: str):
        """Add basic sentiment analysis to item"""
        sentiment_result = self._analyze_news_sentiment([{'title': text, 'summary': ''}], [])
        if sentiment_result:
            item['sentiment'] = sentiment_result[0].get('sentiment', 'NEUTRAL')
            item['sentiment_score'] = sentiment_result[0].get('sentiment_score', 0.5)
    
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
            normalized_commodity = normalize_commodity(None, text)
            
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
            contextual = analyze_market_sentiment(text, normalized_commodity)
            if contextual['market_context']['matched_signals']:
                item['sentiment'] = contextual['sentiment']
                item['sentiment_score'] = contextual['sentiment_score']
                item['market_context'] = contextual['market_context']
                if contextual['commodity']:
                    item['commodity'] = contextual['commodity']
            
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
