import sys
import os
import asyncio
import logging
from datetime import datetime, timezone
from pprint import pprint

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from data_sources import NewsDataSources

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_basic_news_fetch():
    """Test basic news fetching functionality"""
    print("\nTesting basic news fetching...")
    print("=" * 80)
    
    async with NewsDataSources() as sources:
        # Test Reuters
        print("\nTesting Reuters Commodities:")
        reuters = await sources.fetch_reuters_commodities()
        print(f"Retrieved {len(reuters)} articles")
        if reuters:
            print("Sample article:")
            pprint(reuters[0])
        
        # Test OilPrice
        print("\nTesting OilPrice.com:")
        oilprice = await sources.fetch_oilprice_news()
        print(f"Retrieved {len(oilprice)} articles")
        if oilprice:
            print("Sample article:")
            pprint(oilprice[0])
        
        # Test Yahoo Finance
        print("\nTesting Yahoo Finance:")
        yahoo = await sources.fetch_yahoo_finance_commodities()
        print(f"Retrieved {len(yahoo)} articles")
        if yahoo:
            print("Sample article:")
            pprint(yahoo[0])
        
        # Test EIA
        print("\nTesting EIA Reports:")
        eia = await sources.fetch_eia_reports()
        print(f"Retrieved {len(eia)} articles")
        if eia:
            print("Sample article:")
            pprint(eia[0])


async def main():
    """Run basic news fetching test"""
    print("\nStarting news fetching tests...")
    print("=" * 80)
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    
    try:
        await test_basic_news_fetch()
    except Exception as e:
        logger.error(f"Error during testing: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
