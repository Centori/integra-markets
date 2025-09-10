"""
News Data Sources Service for Integra Markets
Fetches news from major financial sources without requiring API keys or triggering reCAPTCHA
"""

import asyncio
import aiohttp
import feedparser
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
import logging

# Import content extraction utilities
try:
    from content_extractor import ContentExtractor, NLTKSummarizer, get_commodity_keywords
    CONTENT_EXTRACTION_AVAILABLE = True
except ImportError:
    CONTENT_EXTRACTION_AVAILABLE = False
    logging.warning("Content extraction utilities not available")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NewsDataSources:
    """Handles fetching news from multiple sources"""
    
    def __init__(self, enable_full_content=False, enable_nltk_summary=False, user_sources=None):
        self.session = None
        self.enable_full_content = enable_full_content and CONTENT_EXTRACTION_AVAILABLE
        self.enable_nltk_summary = enable_nltk_summary and CONTENT_EXTRACTION_AVAILABLE
        self.content_extractor = None
        self.nltk_summarizer = None
        self.user_sources = user_sources or []  # List of sources user has enabled
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        if self.enable_nltk_summary:
            try:
                self.nltk_summarizer = NLTKSummarizer()
                logger.info("NLTK summarizer initialized")
            except Exception as e:
                logger.error(f"Failed to initialize NLTK summarizer: {e}")
                self.enable_nltk_summary = False
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            headers=self.headers,
            timeout=aiohttp.ClientTimeout(total=30)
        )
        
        # Initialize content extractor if needed
        if self.enable_full_content:
            self.content_extractor = ContentExtractor()
            await self.content_extractor.__aenter__()
        
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.content_extractor:
            await self.content_extractor.__aexit__(exc_type, exc_val, exc_tb)
        
        if self.session:
            await self.session.close()

    async def fetch_reuters_commodities(self) -> List[Dict]:
        """Fetch Reuters commodities news via RSS feed"""
        try:
            # Reuters commodities RSS feed
            url = "https://feeds.reuters.com/reuters/businessNews"
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    content = await response.text()
                    feed = feedparser.parse(content)
                    
                    articles = []
                    for entry in feed.entries[:10]:  # Get latest 10 articles
                        # Filter for commodity-related keywords
                        title = entry.title.lower()
                        summary = getattr(entry, 'summary', '').lower()
                        
                        commodity_keywords = ['oil', 'gas', 'gold', 'silver', 'copper', 'wheat', 'corn', 'commodity', 'energy', 'metal']
                        if any(keyword in title or keyword in summary for keyword in commodity_keywords):
                            articles.append({
                                'source': 'Reuters',
                                'title': entry.title,
                                'summary': getattr(entry, 'summary', ''),
                                'url': entry.link,
                                'published': self._parse_date(entry.published),
                                'category': 'commodities'
                            })
                    
                    logger.info(f"Fetched {len(articles)} Reuters articles")
                    return articles
                    
        except Exception as e:
            logger.error(f"Error fetching Reuters news: {e}")
            return []
    
    async def fetch_yahoo_finance_commodities(self) -> List[Dict]:
        """Fetch Yahoo Finance commodities news via RSS"""
        try:
            # Yahoo Finance commodities RSS feed
            url = "https://feeds.finance.yahoo.com/rss/2.0/headline"
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    content = await response.text()
                    feed = feedparser.parse(content)
                    
                    articles = []
                    for entry in feed.entries[:15]:
                        title = entry.title.lower()
                        summary = getattr(entry, 'summary', '').lower()
                        
                        # Look for commodity-related content
                        commodity_keywords = ['crude', 'oil', 'natural gas', 'gold', 'silver', 'copper', 'wheat', 'corn', 'soybeans', 'commodity', 'futures', 'energy']
                        if any(keyword in title or keyword in summary for keyword in commodity_keywords):
                            articles.append({
                                'source': 'Yahoo Finance',
                                'title': entry.title,
                                'summary': getattr(entry, 'summary', ''),
                                'url': entry.link,
                                'published': self._parse_date(entry.published),
                                'category': 'commodities'
                            })
                    
                    logger.info(f"Fetched {len(articles)} Yahoo Finance articles")
                    return articles
                    
        except Exception as e:
            logger.error(f"Error fetching Yahoo Finance news: {e}")
            return []

    async def fetch_eia_reports(self) -> List[Dict]:
        """Fetch Energy Information Administration reports and data"""
        try:
            # EIA RSS feed for reports
            url = "https://www.eia.gov/rss/press_releases.xml"
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    content = await response.text()
                    feed = feedparser.parse(content)
                    
                    articles = []
                    for entry in feed.entries[:8]:
                        articles.append({
                            'source': 'U.S. EIA',
                            'title': entry.title,
                            'summary': getattr(entry, 'summary', ''),
                            'url': entry.link,
                            'published': self._parse_date(entry.published),
                            'category': 'energy_data'
                        })
                    
                    logger.info(f"Fetched {len(articles)} EIA reports")
                    return articles
                    
        except Exception as e:
            logger.error(f"Error fetching EIA reports: {e}")
            return []

    async def fetch_iea_news(self) -> List[Dict]:
        """Fetch International Energy Agency news"""
        try:
            # IEA RSS feed
            url = "https://www.iea.org/api/articles/rss"
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    content = await response.text()
                    feed = feedparser.parse(content)
                    
                    articles = []
                    for entry in feed.entries[:8]:
                        articles.append({
                            'source': 'IEA',
                            'title': entry.title,
                            'summary': getattr(entry, 'summary', ''),
                            'url': entry.link,
                            'published': self._parse_date(entry.published),
                            'category': 'energy_policy'
                        })
                    
                    logger.info(f"Fetched {len(articles)} IEA articles")
                    return articles
                    
        except Exception as e:
            logger.error(f"Error fetching IEA news: {e}")
            return []

    async def fetch_bloomberg_commodities(self) -> List[Dict]:
        """Fetch Bloomberg commodities news via alternative sources"""
        try:
            # Bloomberg commodities RSS (if available)
            # Note: Bloomberg has limited free RSS feeds
            url = "https://feeds.bloomberg.com/markets/news.rss"
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    content = await response.text()
                    feed = feedparser.parse(content)
                    
                    articles = []
                    for entry in feed.entries[:10]:
                        title = entry.title.lower()
                        summary = getattr(entry, 'summary', '').lower()
                        
                        # Filter for commodity content
                        commodity_keywords = ['oil', 'gas', 'gold', 'silver', 'copper', 'wheat', 'corn', 'commodity', 'energy', 'metal', 'futures']
                        if any(keyword in title or keyword in summary for keyword in commodity_keywords):
                            articles.append({
                                'source': 'Bloomberg',
                                'title': entry.title,
                                'summary': getattr(entry, 'summary', ''),
                                'url': entry.link,
                                'published': self._parse_date(entry.published),
                                'category': 'markets'
                            })
                    
                    logger.info(f"Fetched {len(articles)} Bloomberg articles")
                    return articles
                    
        except Exception as e:
            logger.error(f"Error fetching Bloomberg news: {e}")
            return []

    async def fetch_sp_global_platts(self) -> List[Dict]:
        """Fetch S&P Global Platts energy news"""
        try:
            # S&P Global Platts RSS feed
            url = "https://www.spglobal.com/commodityinsights/en/rss-feeds"
            
            # Alternative: Use MarketWatch commodities which is owned by S&P
            marketwatch_url = "https://feeds.marketwatch.com/marketwatch/realtimeheadlines/"
            
            async with self.session.get(marketwatch_url) as response:
                if response.status == 200:
                    content = await response.text()
                    feed = feedparser.parse(content)
                    
                    articles = []
                    for entry in feed.entries[:12]:
                        title = entry.title.lower()
                        summary = getattr(entry, 'summary', '').lower()
                        
                        # Filter for energy and commodities
                        keywords = ['oil', 'gas', 'energy', 'crude', 'natural gas', 'commodity', 'futures', 'gold', 'silver', 'copper']
                        if any(keyword in title or keyword in summary for keyword in keywords):
                            articles.append({
                                'source': 'MarketWatch/S&P',
                                'title': entry.title,
                                'summary': getattr(entry, 'summary', ''),
                                'url': entry.link,
                                'published': self._parse_date(entry.published),
                                'category': 'commodities'
                            })
                    
                    logger.info(f"Fetched {len(articles)} S&P/MarketWatch articles")
                    return articles
                    
        except Exception as e:
            logger.error(f"Error fetching S&P Global Platts news: {e}")
            return []

    async def fetch_additional_sources(self) -> List[Dict]:
        """Fetch from additional reliable commodity news sources"""
        articles = []
        
        try:
            # CNBC commodities
            cnbc_url = "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664"
            async with self.session.get(cnbc_url) as response:
                if response.status == 200:
                    content = await response.text()
                    feed = feedparser.parse(content)
                    
                    for entry in feed.entries[:5]:
                        title = entry.title.lower()
                        if any(keyword in title for keyword in ['oil', 'gas', 'gold', 'commodity', 'energy']):
                            articles.append({
                                'source': 'CNBC',
                                'title': entry.title,
                                'summary': getattr(entry, 'summary', ''),
                                'url': entry.link,
                                'published': self._parse_date(entry.published),
                                'category': 'commodities'
                            })
            
            # Financial Times markets (limited free access)
            ft_url = "https://www.ft.com/markets?format=rss"
            async with self.session.get(ft_url) as response:
                if response.status == 200:
                    content = await response.text()
                    feed = feedparser.parse(content)
                    
                    for entry in feed.entries[:5]:
                        title = entry.title.lower()
                        if any(keyword in title for keyword in ['oil', 'gas', 'gold', 'commodity', 'energy', 'metal']):
                            articles.append({
                                'source': 'Financial Times',
                                'title': entry.title,
                                'summary': getattr(entry, 'summary', ''),
                                'url': entry.link,
                                'published': self._parse_date(entry.published),
                                'category': 'markets'
                            })
            
            logger.info(f"Fetched {len(articles)} additional source articles")
            
        except Exception as e:
            logger.error(f"Error fetching additional sources: {e}")
            
        return articles

    def _parse_date(self, date_string: str) -> datetime:
        """Parse various date formats to datetime object"""
        try:
            # Try parsing different date formats
            formats = [
                '%a, %d %b %Y %H:%M:%S %Z',  # RFC 2822
                '%a, %d %b %Y %H:%M:%S %z',  # RFC 2822 with timezone
                '%Y-%m-%dT%H:%M:%S%z',       # ISO 8601
                '%Y-%m-%d %H:%M:%S',         # Simple format
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(date_string, fmt)
                except ValueError:
                    continue
                    
            # If all formats fail, return current time
            return datetime.now()
            
        except Exception:
            return datetime.now()

    async def fetch_all_sources(self) -> List[Dict]:
        """Fetch news from all sources concurrently"""
        tasks = [
            self.fetch_reuters_commodities(),
            self.fetch_yahoo_finance_commodities(),
            self.fetch_eia_reports(),
            self.fetch_iea_news(),
            self.fetch_bloomberg_commodities(),
            self.fetch_sp_global_platts(),
            self.fetch_additional_sources(),
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_articles = []
        for result in results:
            if isinstance(result, list):
                all_articles.extend(result)
            elif isinstance(result, Exception):
                logger.error(f"Error in fetch task: {result}")
        
        # Sort by publication date (newest first)
        all_articles.sort(key=lambda x: x['published'], reverse=True)
        
        # Remove duplicates based on title similarity
        unique_articles = self._remove_duplicates(all_articles)
        
        logger.info(f"Fetched total of {len(unique_articles)} unique articles from all sources")
        return unique_articles[:50]  # Return top 50 most recent

    def _remove_duplicates(self, articles: List[Dict]) -> List[Dict]:
        """Remove duplicate articles based on title similarity"""
        unique_articles = []
        seen_titles = set()
        
        for article in articles:
            # Create a normalized title for comparison
            normalized_title = re.sub(r'[^\w\s]', '', article['title'].lower()).strip()
            
            # Check if we've seen a very similar title
            is_duplicate = False
            for seen_title in seen_titles:
                # Calculate simple similarity
                words1 = set(normalized_title.split())
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
                seen_titles.add(normalized_title)
        
        return unique_articles
    
    async def enhance_articles_with_full_content(self, articles: List[Dict], commodity_focus: Optional[str] = None, max_enhance: int = 5) -> List[Dict]:
        """Enhance articles by fetching full content and generating NLTK summaries"""
        if not self.enable_full_content or not self.content_extractor:
            logger.warning("Full content extraction not enabled")
            return articles
        
        # Import source config for intelligent enhancement
        try:
            from source_config import SOURCE_ACCESS_MAP, SourceAccessLevel, get_fallback_strategy
        except ImportError:
            logger.warning("Source config not available, using default enhancement")
            SOURCE_ACCESS_MAP = {}
            SourceAccessLevel = None
        
        enhanced_articles = []
        enhance_count = 0
        
        for article in articles:
            try:
                # Only enhance up to max_enhance articles due to processing time
                if enhance_count >= max_enhance:
                    enhanced_articles.append(article)
                    continue
                
                url = article.get('url', '')
                source = article.get('source', '').lower().replace(' ', '_')
                
                if not url:
                    enhanced_articles.append(article)
                    continue
                
                # Check if source is known to be paywalled/blocked
                if SOURCE_ACCESS_MAP and SourceAccessLevel:
                    access_level = SOURCE_ACCESS_MAP.get(source, SourceAccessLevel.LIMITED)
                    if access_level == SourceAccessLevel.RSS_ONLY:
                        logger.info(f"Skipping enhancement for {source} (known paywall/blocked)")
                        article['enhancement_skipped'] = 'paywall'
                        enhanced_articles.append(article)
                        continue
                
                logger.info(f"Enhancing article: {article.get('title', 'Unknown')}")
                
                # Fetch full content
                content_data = await self.content_extractor.fetch_article_content(url)
                
                if content_data.get('error') or not content_data.get('content'):
                    logger.warning(f"Failed to extract content from {url}: {content_data.get('error', 'Unknown error')}")
                    enhanced_articles.append(article)
                    continue
                
                full_content = content_data['content']
                
                # Generate NLTK summary if enabled
                enhanced_summary = article.get('summary', '')
                if self.enable_nltk_summary and self.nltk_summarizer and len(full_content) > 200:
                    # Get commodity-specific keywords for better summarization
                    focus_keywords = get_commodity_keywords(commodity_focus) if commodity_focus else []
                    
                    summary_result = self.nltk_summarizer.summarize_text(
                        full_content, 
                        num_sentences=3, 
                        focus_keywords=focus_keywords
                    )
                    
                    if not summary_result.get('error'):
                        enhanced_summary = summary_result['summary']
                        logger.info(f"Generated NLTK summary ({summary_result['sentences_summary']} sentences from {summary_result['sentences_original']})")
                
                # Create enhanced article
                enhanced_article = {
                    **article,
                    'summary': enhanced_summary,
                    'full_content': full_content,
                    'word_count': content_data.get('word_count', 0),
                    'enhanced': True,
                    'enhancement_method': 'nltk_summarization' if self.enable_nltk_summary else 'full_content_only',
                    'extraction_time': content_data.get('extraction_time')
                }
                
                enhanced_articles.append(enhanced_article)
                enhance_count += 1
                
                # Small delay to be respectful to source servers
                await asyncio.sleep(0.5)
                
            except Exception as e:
                logger.error(f"Error enhancing article {article.get('url', '')}: {e}")
                enhanced_articles.append(article)
        
        logger.info(f"Enhanced {enhance_count} articles with full content")
        return enhanced_articles


# Singleton instance
news_sources = NewsDataSources()

async def fetch_latest_news() -> List[Dict]:
    """Main function to fetch latest news from all sources"""
    async with NewsDataSources() as sources:
        return await sources.fetch_all_sources()

# Test function
async def test_news_sources():
    """Test function to verify all news sources are working"""
    print("Testing news data sources...")
    
    async with NewsDataSources() as sources:
        print("Testing Reuters...")
        reuters = await sources.fetch_reuters_commodities()
        print(f"Reuters: {len(reuters)} articles")
        
        print("Testing Yahoo Finance...")
        yahoo = await sources.fetch_yahoo_finance_commodities()
        print(f"Yahoo Finance: {len(yahoo)} articles")
        
        print("Testing EIA...")
        eia = await sources.fetch_eia_reports()
        print(f"EIA: {len(eia)} articles")
        
        print("Testing IEA...")
        iea = await sources.fetch_iea_news()
        print(f"IEA: {len(iea)} articles")
        
        print("Testing Bloomberg...")
        bloomberg = await sources.fetch_bloomberg_commodities()
        print(f"Bloomberg: {len(bloomberg)} articles")
        
        print("Testing S&P Global...")
        sp = await sources.fetch_sp_global_platts()
        print(f"S&P Global: {len(sp)} articles")
        
        print("Testing additional sources...")
        additional = await sources.fetch_additional_sources()
        print(f"Additional: {len(additional)} articles")
        
        print("\nFetching all sources together...")
        all_news = await sources.fetch_all_sources()
        print(f"Total unique articles: {len(all_news)}")
        
        # Print sample articles
        print("\nSample articles:")
        for i, article in enumerate(all_news[:5]):
            print(f"{i+1}. [{article['source']}] {article['title']}")
            print(f"   Published: {article['published']}")
            print(f"   URL: {article['url']}")
            print()

if __name__ == "__main__":
    asyncio.run(test_news_sources())