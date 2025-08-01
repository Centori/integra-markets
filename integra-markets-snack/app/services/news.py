"""
News service with enhanced caching for high-volume production use.
Integrates multiple news sources with intelligent caching strategies.
"""

import logging
import asyncio
import hashlib
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import feedparser
import httpx
from bs4 import BeautifulSoup

from app.services.enhanced_caching import cache_manager, cached
from app.services.news_preprocessing import preprocess_news, create_pipeline_ready_output
from app.services.sentiment import analyze_sentiment

logger = logging.getLogger(__name__)

class NewsService:
    """
    Enhanced news service with production-grade caching for high user loads.
    Implements aggressive caching strategies to minimize API calls and improve performance.
    """
    
    def __init__(self):
        """Initialize the news service with enhanced caching"""
        self.client = httpx.AsyncClient(timeout=30.0)
        
        # Enhanced cache TTL for production (aggressive caching for 100-1000 users)
        self.cache_ttl = {
            "rss_feeds": 1800,      # 30 minutes for RSS feeds
            "article_content": 7200, # 2 hours for full article content
            "sentiment_analysis": 14400, # 4 hours for sentiment analysis
            "preprocessed_news": 10800,  # 3 hours for preprocessed data
            "search_results": 3600   # 1 hour for search results
        }
        
        # RSS feed sources with high-quality commodity news
        self.rss_sources = {
            "reuters_commodities": "https://feeds.reuters.com/reuters/commoditiesNews",
            "reuters_energy": "https://feeds.reuters.com/reuters/energy",
            "bloomberg_energy": "https://feeds.bloomberg.com/energy/news.rss",
            "marketwatch_commodities": "https://feeds.marketwatch.com/marketwatch/realtimeheadlines/",
            "oil_gas_journal": "https://www.ogj.com/rss/ogj-breaking-news.xml",
            "platts": "https://www.spglobal.com/platts/en/rss-feeds",
            "energy_intel": "https://www.energyintel.com/rss"
        }
        
        # Commodity keywords for filtering relevant news
        self.commodity_keywords = {
            "oil": ["crude", "oil", "petroleum", "wti", "brent", "opec", "drilling", "refinery"],
            "gas": ["natural gas", "lng", "pipeline", "gas prices", "energy"],
            "metals": ["gold", "silver", "copper", "aluminum", "steel", "mining"],
            "agriculture": ["wheat", "corn", "soybeans", "cotton", "coffee", "sugar", "cattle"]
        }
        
        logger.info("NewsService initialized with enhanced caching for production")
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
    
    def _generate_cache_key(self, *args) -> str:
        """Generate a consistent cache key from arguments"""
        key_string = "|".join(str(arg) for arg in args)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    @cached("news_rss", ttl_seconds=1800)  # 30-minute cache for RSS feeds
    async def _fetch_rss_feed(self, url: str) -> Dict[str, Any]:
        """
        Fetch and parse RSS feed with caching.
        
        Args:
            url: RSS feed URL
            
        Returns:
            Parsed feed data
        """
        try:
            logger.debug(f"Fetching RSS feed: {url}")
            response = await self.client.get(url)
            response.raise_for_status()
            
            # Parse RSS feed
            feed = feedparser.parse(response.text)
            
            # Extract articles
            articles = []
            for entry in feed.entries[:20]:  # Limit to 20 most recent
                articles.append({
                    "title": entry.get("title", ""),
                    "url": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "summary": entry.get("summary", ""),
                    "source": feed.feed.get("title", "Unknown")
                })
            
            return {
                "articles": articles,
                "feed_title": feed.feed.get("title", ""),
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error fetching RSS feed {url}: {str(e)}")
            return {"articles": [], "error": str(e)}
    
    @cached("news_content", ttl_seconds=7200)  # 2-hour cache for article content
    async def _fetch_article_content(self, url: str) -> Dict[str, Any]:
        """
        Fetch full article content with caching.
        
        Args:
            url: Article URL
            
        Returns:
            Article content data
        """
        try:
            logger.debug(f"Fetching article content: {url}")
            response = await self.client.get(url)
            response.raise_for_status()
            
            # Parse HTML content
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract article text (basic extraction)
            paragraphs = soup.find_all('p')
            content = ' '.join([p.get_text() for p in paragraphs])
            
            # Extract title
            title = ""
            title_tags = soup.find_all(['h1', 'title'])
            if title_tags:
                title = title_tags[0].get_text().strip()
            
            return {
                "title": title,
                "content": content[:5000],  # Limit content length
                "url": url,
                "extracted_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error fetching article content {url}: {str(e)}")
            return {"content": "", "error": str(e)}
    
    async def get_latest_news(self, 
                            commodities: Optional[List[str]] = None,
                            limit: int = 50,
                            include_sentiment: bool = True) -> Dict[str, Any]:
        """
        Get latest commodity news with enhanced caching.
        
        Args:
            commodities: List of commodity types to filter by
            limit: Maximum number of articles to return
            include_sentiment: Whether to include sentiment analysis
            
        Returns:
            Dict containing news articles with metadata
        """
        cache_key = self._generate_cache_key("latest_news", str(commodities), limit, include_sentiment)
        
        # Check cache first
        cached_result = cache_manager.get("news_latest", cache_key)
        if cached_result is not None:
            logger.debug("Cache HIT for latest news")
            return cached_result
        
        logger.info(f"Fetching latest news for commodities: {commodities}")
        
        all_articles = []
        
        # Fetch from all RSS sources concurrently
        tasks = []
        for source_name, rss_url in self.rss_sources.items():
            task = self._fetch_rss_feed(rss_url)
            tasks.append((source_name, task))
        
        # Execute all RSS fetches concurrently
        for source_name, task in tasks:
            try:
                feed_data = await task
                if feed_data.get("articles"):
                    for article in feed_data["articles"]:
                        article["source_name"] = source_name
                        all_articles.append(article)
            except Exception as e:
                logger.error(f"Error processing feed {source_name}: {str(e)}")
        
        # Filter by commodity keywords if specified
        if commodities:
            filtered_articles = []
            for article in all_articles:
                article_text = f"{article.get('title', '')} {article.get('summary', '')}".lower()
                
                for commodity in commodities:
                    if commodity.lower() in self.commodity_keywords:
                        keywords = self.commodity_keywords[commodity.lower()]
                        if any(keyword.lower() in article_text for keyword in keywords):
                            article["commodity"] = commodity
                            filtered_articles.append(article)
                            break
            
            all_articles = filtered_articles
        
        # Sort by published date (most recent first)
        all_articles.sort(key=lambda x: x.get("published", ""), reverse=True)
        
        # Limit results
        all_articles = all_articles[:limit]
        
        # Add sentiment analysis if requested
        if include_sentiment:
            for article in all_articles:
                try:
                    # Use cached sentiment analysis
                    sentiment_key = self._generate_cache_key("sentiment", article.get("url", ""), article.get("title", ""))
                    cached_sentiment = cache_manager.get("news_sentiment", sentiment_key)
                    
                    if cached_sentiment is not None:
                        article.update(cached_sentiment)
                    else:
                        # Analyze sentiment
                        text = f"{article.get('title', '')} {article.get('summary', '')}"
                        sentiment_result = await analyze_sentiment(text)
                        
                        article.update({
                            "sentiment": sentiment_result.get("sentiment", "neutral"),
                            "sentiment_score": sentiment_result.get("confidence", 0.0),
                            "sentiment_analysis": sentiment_result
                        })
                        
                        # Cache the sentiment analysis
                        cache_manager.set("news_sentiment", sentiment_key, {
                            "sentiment": article["sentiment"],
                            "sentiment_score": article["sentiment_score"],
                            "sentiment_analysis": article["sentiment_analysis"]
                        }, self.cache_ttl["sentiment_analysis"])
                        
                except Exception as e:
                    logger.error(f"Error analyzing sentiment for article: {str(e)}")
                    article.update({
                        "sentiment": "neutral",
                        "sentiment_score": 0.0
                    })
        
        result = {
            "articles": all_articles,
            "total_count": len(all_articles),
            "commodities_filter": commodities,
            "timestamp": datetime.now().isoformat(),
            "cache_info": {
                "cached": False,
                "cache_key": cache_key
            }
        }
        
        # Cache the result
        cache_manager.set("news_latest", cache_key, result, self.cache_ttl["rss_feeds"])
        
        return result
    
    async def get_news_analysis(self, url: str) -> Dict[str, Any]:
        """
        Get comprehensive news analysis with enhanced preprocessing and caching.
        
        Args:
            url: Article URL
            
        Returns:
            Dict containing preprocessed analysis
        """
        cache_key = self._generate_cache_key("news_analysis", url)
        
        # Check cache first
        cached_result = cache_manager.get("news_analysis", cache_key)
        if cached_result is not None:
            logger.debug("Cache HIT for news analysis")
            return cached_result
        
        logger.info(f"Analyzing news article: {url}")
        
        try:
            # Fetch article content
            content_data = await self._fetch_article_content(url)
            
            if content_data.get("error"):
                return {"error": content_data["error"]}
            
            # Create enhanced preprocessing pipeline
            full_text = f"{content_data.get('title', '')} {content_data.get('content', '')}"
            pipeline_output = create_pipeline_ready_output(full_text)
            
            # Add metadata
            pipeline_output.update({
                "url": url,
                "title": content_data.get("title", ""),
                "analyzed_at": datetime.now().isoformat(),
                "cache_info": {
                    "cached": False,
                    "cache_key": cache_key
                }
            })
            
            # Cache the result
            cache_manager.set("news_analysis", cache_key, pipeline_output, self.cache_ttl["preprocessed_news"])
            
            return pipeline_output
            
        except Exception as e:
            logger.error(f"Error analyzing news article {url}: {str(e)}")
            return {"error": str(e)}
    
    async def search_news(self, 
                         query: str,
                         commodities: Optional[List[str]] = None,
                         limit: int = 20) -> Dict[str, Any]:
        """
        Search news articles with caching.
        
        Args:
            query: Search query
            commodities: Optional commodity filter
            limit: Maximum results
            
        Returns:
            Search results
        """
        cache_key = self._generate_cache_key("search", query, str(commodities), limit)
        
        # Check cache first
        cached_result = cache_manager.get("news_search", cache_key)
        if cached_result is not None:
            logger.debug("Cache HIT for news search")
            return cached_result
        
        logger.info(f"Searching news: {query}")
        
        # Get all recent news
        all_news = await self.get_latest_news(commodities=commodities, limit=200, include_sentiment=False)
        
        # Filter by search query
        query_lower = query.lower()
        matching_articles = []
        
        for article in all_news.get("articles", []):
            article_text = f"{article.get('title', '')} {article.get('summary', '')}".lower()
            if query_lower in article_text:
                matching_articles.append(article)
        
        # Limit results
        matching_articles = matching_articles[:limit]
        
        result = {
            "articles": matching_articles,
            "query": query,
            "total_found": len(matching_articles),
            "commodities_filter": commodities,
            "timestamp": datetime.now().isoformat(),
            "cache_info": {
                "cached": False,
                "cache_key": cache_key
            }
        }
        
        # Cache the result
        cache_manager.set("news_search", cache_key, result, self.cache_ttl["search_results"])
        
        return result
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get news service cache statistics"""
        base_stats = cache_manager.get_stats()
        
        # Add service-specific metrics
        base_stats.update({
            "cache_ttl_settings": self.cache_ttl,
            "rss_sources_count": len(self.rss_sources),
            "commodity_categories": list(self.commodity_keywords.keys())
        })
        
        return base_stats

# Create singleton instance
news_service = NewsService()

# Convenience functions for external use
async def get_latest_commodity_news(commodities: Optional[List[str]] = None, limit: int = 50) -> Dict[str, Any]:
    """Get latest commodity news with enhanced caching"""
    return await news_service.get_latest_news(commodities=commodities, limit=limit)

async def analyze_news_article(url: str) -> Dict[str, Any]:
    """Analyze a news article with comprehensive preprocessing"""
    return await news_service.get_news_analysis(url)

async def search_commodity_news(query: str, commodities: Optional[List[str]] = None, limit: int = 20) -> Dict[str, Any]:
    """Search commodity news with caching"""
    return await news_service.search_news(query=query, commodities=commodities, limit=limit)
