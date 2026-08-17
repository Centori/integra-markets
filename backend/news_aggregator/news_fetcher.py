"""
News aggregator module for financial news and headlines
"""

import feedparser
import asyncio
import logging
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class NewsItem(BaseModel):
    """News item model.

    `sentiment` / `sentiment_score` / `category` are additive and optional, so
    no existing consumer breaks. They exist because the mobile notification
    poller has always read them:

        // app/services/alertMonitoringService.js
        impact: article.sentiment === 'bullish' || article.sentiment === 'bearish'
                  ? 'high' : 'medium',
        category: article.category || 'general'

    The model never carried a sentiment field, so that comparison was against
    `undefined` on every article and every notification was graded 'medium'.
    Lowercase labels, matching both that check and the `sentiment_scores`
    column.
    """
    title: str
    source: str
    link: str
    published: str
    summary: str
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    category: Optional[str] = None

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
        """Latest commodity news, read from the same store the feed reads.

        This used to return `self.latest_news` — the three general-finance RSS
        feeds above, fetched ONCE when the singleton was first constructed and
        never refreshed (`get_news_fetcher` only fetches when the global is
        None, and nothing else calls `fetch_all_news` outside POST
        /api/news/refresh).

        The mobile notification poller reads this endpoint, so push
        notifications were driven by a frozen, unfiltered snapshot of general
        finance news taken at process boot. Observed in production
        2026-08-17, the ten articles the poller was working from included
        "Can I claim 50% of my husband's Social Security", "My son does not
        work, yet he pays $500 for ACA health insurance" and "Former Starbucks
        CEO Howard Schultz sells home in Hawaii" — MarketWatch top stories,
        with no commodity filter anywhere in the path.

        Meanwhile the feed reads `raw_documents`. Two disjoint corpora is
        exactly why a notification could point at a story that never appeared
        as a card, and why the feed's newest card could look older than the
        notifications.

        Reading the store makes the two agree by construction. The RSS
        machinery above is kept as a fallback for an empty store.
        """
        store_items = self._from_store()
        if store_items:
            return store_items
        logger.warning(
            "news/latest: store returned nothing, serving the RSS snapshot "
            "(%d items) — check the ingest cron", len(self.latest_news)
        )
        return self.latest_news

    @staticmethod
    def _from_store(hours_back: int = 48, limit: int = 20) -> List[NewsItem]:
        """Read recent scored articles out of raw_documents. Never raises."""
        try:
            from services._supabase import get_supabase_client
            from services.feed_store import fetch_feed

            result = fetch_feed(
                get_supabase_client(), hours_back=hours_back, max_articles=limit
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("news/latest: store read failed: %s", exc)
            return []

        items: List[NewsItem] = []
        for art in result.get("articles") or []:
            try:
                items.append(NewsItem(
                    title=art.get("title") or "",
                    source=art.get("source") or "unknown",
                    link=art.get("url") or "",
                    published=str(art.get("published") or ""),
                    summary=art.get("summary") or art.get("title") or "",
                    # Lowercased for the poller's `=== 'bullish'` comparison.
                    sentiment=(art.get("sentiment") or "").lower() or None,
                    sentiment_score=art.get("sentiment_score"),
                    category=(art.get("related_commodities") or [None])[0],
                ))
            except Exception as exc:  # noqa: BLE001
                logger.debug("news/latest: skipped unmappable article: %s", exc)
        return items

# Singleton instance
news_fetcher: NewsFetcher = None

async def get_news_fetcher() -> NewsFetcher:
    """Get or create news fetcher instance"""
    global news_fetcher
    if news_fetcher is None:
        news_fetcher = NewsFetcher()
        await news_fetcher.fetch_all_news()  # Initial fetch
    return news_fetcher
