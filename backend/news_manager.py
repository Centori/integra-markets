"""
Dynamic News Source Manager for Integra Markets
Handles user-defined news sources and alert preferences
"""

import asyncio
import logging
from typing import List, Dict, Optional, Set, Union
from urllib.parse import urlparse
import feedparser
import aiohttp
from bs4 import BeautifulSoup
from datetime import datetime, timezone
import json
import re

# Import content extraction utilities if available
try:
    from content_extractor import ContentExtractor, get_commodity_keywords
    CONTENT_EXTRACTION_AVAILABLE = True
except ImportError:
    CONTENT_EXTRACTION_AVAILABLE = False
    logger.warning("Content extraction utilities not available")
    ContentExtractor = None
    def get_commodity_keywords(commodity):
        return []

from data_sources import NewsDataSources

logger = logging.getLogger(__name__)

class UserNewsSourceManager:
    """Manages dynamic news sources and preferences for individual users"""
    
    def __init__(self, preferences: Dict):
        self.preferences = preferences
        self.custom_sources = []
        self.excluded_sources = set()
        self.content_extractor = None
        self.news_sources = None
        self.keywords = set(preferences.get('keywords', []))
        self.commodities = set(preferences.get('commodities', []))
        self.regions = set(preferences.get('regions', []))
        
        # Add commodity-specific keywords
        for commodity in self.commodities:
            self.keywords.update(get_commodity_keywords(commodity))
    
    async def __aenter__(self):
        """Initialize extractors and news sources"""
        if CONTENT_EXTRACTION_AVAILABLE:
            self.content_extractor = ContentExtractor()
            await self.content_extractor.__aenter__()
        else:
            self.content_extractor = None
            
        self.news_sources = NewsDataSources()
        await self.news_sources.__aenter__()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Cleanup resources"""
        if self.content_extractor:
            await self.content_extractor.__aexit__(exc_type, exc_val, exc_tb)
        if self.news_sources:
            await self.news_sources.__aexit__(exc_type, exc_val, exc_tb)
    
    def add_source(self, url: str, category: Optional[str] = None, keywords: Optional[List[str]] = None):
        """Add a custom news source"""
        source = {
            'url': url,
            'category': category or 'custom',
            'keywords': keywords or [],
            'added_at': datetime.now(timezone.utc).isoformat(),
            'is_active': True,
            'last_fetch': None,
            'fetch_errors': 0
        }
        self.custom_sources.append(source)
    
    def remove_source(self, url: str):
        """Remove a custom source"""
        self.custom_sources = [s for s in self.custom_sources if s['url'] != url]
        self.excluded_sources.add(url)
    
    def update_preferences(self, new_preferences: Dict):
        """Update user preferences and keywords"""
        self.preferences.update(new_preferences)
        
        # Update tracked items
        self.keywords = set(self.preferences.get('keywords', []))
        self.commodities = set(self.preferences.get('commodities', []))
        self.regions = set(self.preferences.get('regions', []))
        
        # Update commodity-specific keywords
        for commodity in self.commodities:
            self.keywords.update(get_commodity_keywords(commodity))
    
    async def detect_feed_type(self, url: str) -> str:
        """Detect if URL provides RSS/Atom feed or requires HTML scraping"""
        try:
            async with self.content_extractor.session.get(url) as response:
                content_type = response.headers.get('Content-Type', '')
                if any(feed_type in content_type.lower() for feed_type in ['rss', 'xml', 'atom']):
                    return 'feed'
                
                # Check URL pattern
                if any(ext in url.lower() for ext in ['.rss', '.xml', 'feed', 'rss.xml']):
                    return 'feed'
                
                # Parse content to look for feed links
                text = await response.text()
                soup = BeautifulSoup(text, 'html.parser')
                
                # Check for feed autodiscovery
                feed_links = soup.find_all('link', type=re.compile(r'application/(rss|atom)\+xml'))
                if feed_links:
                    # Update URL to feed URL
                    source = next(s for s in self.custom_sources if s['url'] == url)
                    source['url'] = feed_links[0].get('href')
                    return 'feed'
                
                return 'html'
        except Exception as e:
            logger.error(f"Error detecting feed type for {url}: {e}")
            return 'html'  # Default to HTML scraping
    
    async def fetch_from_feed(self, url: str) -> List[Dict]:
        """Fetch articles from RSS/Atom feed"""
        try:
            async with self.content_extractor.session.get(url) as response:
                feed_content = await response.text()
                feed = feedparser.parse(feed_content)
                
                articles = []
                for entry in feed.entries[:15]:  # Limit to 15 most recent
                    article = {
                        'title': entry.get('title', ''),
                        'summary': entry.get('summary', ''),
                        'content': entry.get('content', [{}])[0].get('value', ''),
                        'url': entry.get('link', ''),
                        'published': entry.get('published', ''),
                        'source': urlparse(url).netloc,
                        'source_url': url
                    }
                    
                    # Skip if doesn't match user preferences
                    if not self._matches_preferences(article):
                        continue
                    
                    articles.append(article)
                
                return articles
        except Exception as e:
            logger.error(f"Error fetching feed from {url}: {e}")
            return []
    
    async def fetch_from_html(self, url: str) -> List[Dict]:
        """Fetch articles by scraping HTML page"""
        try:
            content = await self.content_extractor.fetch_article_content(url)
            
            if content.get('error'):
                logger.error(f"Error fetching HTML from {url}: {content['error']}")
                return []
            
            article = {
                'title': content['title'],
                'content': content['content'],
                'summary': content['content'][:500] + '...' if len(content['content']) > 500 else content['content'],
                'url': url,
                'published': datetime.now(timezone.utc).isoformat(),
                'source': urlparse(url).netloc,
                'source_url': url,
                'word_count': content['word_count']
            }
            
            # Skip if doesn't match preferences
            if not self._matches_preferences(article):
                return []
            
            return [article]
        except Exception as e:
            logger.error(f"Error scraping HTML from {url}: {e}")
            return []
    
    def _matches_preferences(self, article: Dict) -> bool:
        """Check if article matches user preferences"""
        text = f"{article['title']} {article['summary']} {article.get('content', '')}"
        text = text.lower()
        
        # Check keywords
        if self.keywords and not any(k.lower() in text for k in self.keywords):
            return False
        
        # Check commodities
        if self.commodities and not any(c.lower() in text for c in self.commodities):
            return False
        
        # Check regions
        if self.regions and not any(r.lower() in text for r in self.regions):
            return False
        
        return True
    
    async def fetch_all_sources(self) -> List[Dict]:
        """Fetch articles from all sources (built-in + custom)"""
        tasks = []
        
        # Add built-in sources
        if self.news_sources:
            tasks.append(self.news_sources.fetch_all_sources())
        
        # Add custom sources
        for source in self.custom_sources:
            if not source['is_active'] or source['url'] in self.excluded_sources:
                continue
            
            source_type = await self.detect_feed_type(source['url'])
            if source_type == 'feed':
                tasks.append(self.fetch_from_feed(source['url']))
            else:
                tasks.append(self.fetch_from_html(source['url']))
        
        # Execute all fetches concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine and filter results
        all_articles = []
        for result in results:
            if isinstance(result, list):
                all_articles.extend(result)
            elif isinstance(result, Exception):
                logger.error(f"Error fetching from source: {result}")
        
        # Remove duplicates and sort by date
        unique_articles = self._remove_duplicates(all_articles)
        unique_articles.sort(
            key=lambda x: datetime.fromisoformat(str(x['published']).replace('Z', '+00:00')),
            reverse=True
        )
        
        return unique_articles[:50]  # Return most recent 50
    
    def _remove_duplicates(self, articles: List[Dict]) -> List[Dict]:
        """Remove duplicate articles based on title/content similarity"""
        unique_articles = []
        seen_titles = set()
        
        for article in articles:
            # Create normalized title
            title = re.sub(r'[^\w\s]', '', article['title'].lower()).strip()
            
            # Skip exact duplicates
            if title in seen_titles:
                continue
            
            # Check for similar titles
            is_duplicate = False
            for seen_title in seen_titles:
                # Calculate similarity
                words1 = set(title.split())
                words2 = set(seen_title.split())
                
                if len(words1) > 0 and len(words2) > 0:
                    intersection = len(words1.intersection(words2))
                    union = len(words1.union(words2))
                    similarity = intersection / union
                    
                    if similarity > 0.7:  # 70% similarity threshold
                        is_duplicate = True
                        break
            
            if not is_duplicate:
                unique_articles.append(article)
                seen_titles.add(title)
        
        return unique_articles
