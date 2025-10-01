"""
News aggregator module for financial news and headlines
"""

import feedparser
import asyncio
from typing import List, Dict
from datetime import datetime
from pydantic import BaseModel

class NewsItem(BaseModel):
    """News item model"""
    title: str
    source: str
    link: str
    published: str
    summary: str

class NewsFetcher:
    """News fetcher class for aggregating financial news"""
    
    FINANCIAL_RSS_FEEDS = {
        'MarketWatch': 'http://feeds.marketwatch.com/marketwatch/topstories/',
        'Reuters_Markets': 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best',
        'Yahoo_Finance': 'https://finance.yahoo.com/news/rssindex',
    }

    def __init__(self):
        self.latest_news: List[NewsItem] = []

    async def fetch_rss_feed(self, source: str, url: str) -> List[NewsItem]:
        """Fetch news from RSS feed"""
        try:
            feed = feedparser.parse(url)
            news_items = []
            
            for entry in feed.entries[:10]:  # Get latest 10 articles
                news_item = NewsItem(
                    title=entry.title,
                    source=source,
                    link=entry.link,
                    published=entry.get('published', datetime.now().isoformat()),
                    summary=entry.get('summary', 'No summary available')
                )
                news_items.append(news_item)
            
            return news_items
        except Exception as e:
            print(f"Error fetching {source} RSS feed: {str(e)}")
            return []

    async def fetch_all_news(self) -> List[NewsItem]:
        """Fetch news from all sources"""
        tasks = []
        for source, url in self.FINANCIAL_RSS_FEEDS.items():
            tasks.append(self.fetch_rss_feed(source, url))
        
        results = await asyncio.gather(*tasks)
        self.latest_news = [item for sublist in results for item in sublist]
        return self.latest_news

    def get_latest_news(self) -> List[NewsItem]:
        """Get cached news items"""
        return self.latest_news

# Singleton instance
news_fetcher: NewsFetcher = None

async def get_news_fetcher() -> NewsFetcher:
    """Get or create news fetcher instance"""
    global news_fetcher
    if news_fetcher is None:
        news_fetcher = NewsFetcher()
        await news_fetcher.fetch_all_news()  # Initial fetch
    return news_fetcher
