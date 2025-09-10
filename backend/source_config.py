"""
Source Configuration for Integra Markets
Defines which sources support full-text extraction vs RSS-only
"""

from typing import Dict, List, Optional
from enum import Enum

class SourceAccessLevel(Enum):
    """Defines the level of content access for each source"""
    FULL_TEXT = "full_text"  # Can fetch and parse full article HTML
    RSS_ONLY = "rss_only"     # Only RSS summaries available (paywall/blocking)
    LIMITED = "limited"       # Some articles accessible, others blocked

# Source accessibility mapping based on empirical testing
SOURCE_ACCESS_MAP = {
    # Generally accessible for full-text
    "reuters": SourceAccessLevel.FULL_TEXT,
    "yahoo_finance": SourceAccessLevel.FULL_TEXT,
    "eia": SourceAccessLevel.FULL_TEXT,  # US Energy Information Admin
    "iea": SourceAccessLevel.FULL_TEXT,  # International Energy Agency
    "marketwatch": SourceAccessLevel.FULL_TEXT,
    "cnbc": SourceAccessLevel.LIMITED,
    
    # Usually paywalled or block scrapers
    "bloomberg": SourceAccessLevel.RSS_ONLY,
    "financial_times": SourceAccessLevel.RSS_ONLY,
    "wall_street_journal": SourceAccessLevel.RSS_ONLY,
    "economist": SourceAccessLevel.RSS_ONLY,
    
    # Limited access (some articles work, others don't)
    "sp_global": SourceAccessLevel.LIMITED,
    "forbes": SourceAccessLevel.LIMITED,
}

# RSS feed URLs for each source
SOURCE_RSS_FEEDS = {
    "reuters": "https://feeds.reuters.com/reuters/businessNews",
    "yahoo_finance": "https://feeds.finance.yahoo.com/rss/2.0/headline",
    "bloomberg": "https://feeds.bloomberg.com/markets/news.rss",
    "eia": "https://www.eia.gov/rss/press_releases.xml",
    "iea": "https://www.iea.org/api/articles/rss",
    "marketwatch": "https://feeds.marketwatch.com/marketwatch/realtimeheadlines/",
    "cnbc": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664",
    "financial_times": "https://www.ft.com/markets?format=rss",
}

# Commodity focus keywords for each source (for better filtering)
SOURCE_COMMODITY_FOCUS = {
    "reuters": ["oil", "gas", "gold", "silver", "copper", "wheat", "corn", "commodity", "energy", "metal"],
    "bloomberg": ["oil", "gas", "gold", "silver", "copper", "wheat", "corn", "commodity", "energy", "metal", "futures"],
    "yahoo_finance": ["crude", "oil", "natural gas", "gold", "silver", "copper", "wheat", "corn", "soybeans", "commodity", "futures", "energy"],
    "eia": ["oil", "petroleum", "gas", "energy", "crude", "gasoline", "diesel", "production"],
    "iea": ["oil", "gas", "energy", "renewable", "coal", "electricity", "climate"],
    "marketwatch": ["oil", "gas", "energy", "crude", "natural gas", "commodity", "futures", "gold", "silver", "copper"],
}

class UserSourcePreferences:
    """Manages user-specific source preferences and accessibility"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.preferred_sources: List[str] = []
        self.excluded_sources: List[str] = []
        self.commodity_interests: List[str] = []
    
    def load_from_database(self, supabase_client):
        """Load user preferences from Supabase"""
        try:
            # Fetch user preferences
            result = supabase_client.table('user_preferences').select('*').eq('user_id', self.user_id).single().execute()
            if result.data:
                self.preferred_sources = result.data.get('news_sources', [])
                self.excluded_sources = result.data.get('excluded_sources', [])
                self.commodity_interests = result.data.get('commodities', [])
                return True
        except Exception as e:
            print(f"Error loading user preferences: {e}")
            return False
    
    def get_enabled_sources(self) -> List[str]:
        """Get list of sources enabled for this user"""
        if not self.preferred_sources:
            # Default to high-quality, accessible sources
            return ["reuters", "yahoo_finance", "eia", "marketwatch"]
        return [s for s in self.preferred_sources if s not in self.excluded_sources]
    
    def should_enhance_source(self, source: str) -> bool:
        """Determine if full-text extraction should be attempted for a source"""
        access_level = SOURCE_ACCESS_MAP.get(source.lower(), SourceAccessLevel.RSS_ONLY)
        
        # Only attempt enhancement for FULL_TEXT sources
        # For LIMITED sources, could add logic to track success rates
        return access_level == SourceAccessLevel.FULL_TEXT
    
    def filter_by_commodity_interest(self, articles: List[Dict]) -> List[Dict]:
        """Filter articles based on user's commodity interests"""
        if not self.commodity_interests:
            return articles
        
        filtered = []
        for article in articles:
            title = article.get('title', '').lower()
            summary = article.get('summary', '').lower()
            
            # Check if any user commodity interest appears in article
            for commodity in self.commodity_interests:
                if commodity.lower() in title or commodity.lower() in summary:
                    filtered.append(article)
                    break
        
        return filtered

def get_optimal_sources_for_enhancement(user_sources: List[str]) -> Dict[str, bool]:
    """
    Returns a mapping of user sources to whether they should be enhanced
    
    Args:
        user_sources: List of sources from user preferences
        
    Returns:
        Dict mapping source name to boolean (True = try full-text, False = RSS only)
    """
    source_enhancement_map = {}
    
    for source in user_sources:
        access_level = SOURCE_ACCESS_MAP.get(source.lower(), SourceAccessLevel.RSS_ONLY)
        
        # Recommend enhancement only for FULL_TEXT sources
        should_enhance = access_level == SourceAccessLevel.FULL_TEXT
        source_enhancement_map[source] = should_enhance
    
    return source_enhancement_map

def get_fallback_strategy(source: str) -> str:
    """
    Get the fallback strategy for a source when full-text fails
    
    Returns:
        Strategy string: 'rss_summary', 'amp_version', 'cached_version'
    """
    access_level = SOURCE_ACCESS_MAP.get(source.lower(), SourceAccessLevel.RSS_ONLY)
    
    if access_level == SourceAccessLevel.RSS_ONLY:
        return "rss_summary"  # Don't even try, just use RSS
    elif access_level == SourceAccessLevel.LIMITED:
        return "amp_version"  # Try AMP or mobile version as fallback
    else:
        return "rss_summary"  # Default fallback
