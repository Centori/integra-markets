#!/usr/bin/env python3
"""
Test script to verify NewsDataSources integration with Groq AI Service
"""

import asyncio
import json
import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the services
from backend.groq_ai_service import GroqAIService, ReasoningEffort

async def test_source_integration():
    """Test the integration of NewsDataSources with Groq AI"""
    
    print("=" * 60)
    print("Testing Source Attribution Integration")
    print("=" * 60)
    
    # Initialize the service
    service = GroqAIService()
    
    # Test 1: Basic commodity analysis with sources
    print("\n1. Testing commodity analysis with source attribution...")
    try:
        result = await service.analyze_with_reasoning(
            query="What are the latest developments in the oil market?",
            commodity="oil",
            use_tools=True,
            search_web=True,
            include_sources=True,
            reasoning_effort=ReasoningEffort.MEDIUM
        )
        
        print("\n✅ Analysis completed:")
        print(f"   - Query: {result['query']}")
        print(f"   - Timestamp: {result['timestamp']}")
        
        if 'sources' in result:
            print(f"\n   📚 Sources Used ({len(result['sources'])}):")
            for source in result['sources']:
                print(f"      - {source['name']} ({source['type']})")
        
        if 'analysis' in result:
            analysis = result['analysis']
            if isinstance(analysis, dict):
                print(f"\n   📊 Analysis Summary:")
                print(f"      - Commodity: {analysis.get('commodity', 'N/A')}")
                print(f"      - Sentiment: {analysis.get('sentiment', 'N/A')}")
                print(f"      - Confidence: {analysis.get('confidence', 'N/A')}")
                if 'data_sources' in analysis:
                    print(f"      - Data Sources: {', '.join(analysis['data_sources'])}")
        
        # Display sample news articles
        if 'tool_results' in result:
            for tool_result in result['tool_results']:
                if isinstance(tool_result, dict) and 'articles' in tool_result:
                    print(f"\n   📰 Sample News Articles:")
                    for article in tool_result['articles'][:3]:
                        print(f"      [{article.get('source', 'Unknown')}] {article.get('title', 'No title')[:60]}...")
    
    except Exception as e:
        print(f"❌ Error in analysis: {e}")
    
    # Test 2: Market report with multiple commodities
    print("\n" + "=" * 60)
    print("2. Testing market report generation with sources...")
    try:
        report = await service.generate_market_report(
            commodities=["oil", "gold"],
            include_predictions=True,
            include_news=True,
            include_sources=True,
            reasoning_effort=ReasoningEffort.MEDIUM
        )
        
        print("\n✅ Market Report Generated:")
        print(f"   - Generated at: {report['generated_at']}")
        print(f"   - Commodities analyzed: {list(report['commodities'].keys())}")
        
        if 'sources' in report:
            print(f"\n   📚 Aggregated Sources ({len(report['sources'])}):")
            for source in report['sources']:
                print(f"      - {source['name']}")
        
        # Display insights for each commodity
        for commodity, analysis in report['commodities'].items():
            print(f"\n   💹 {commodity.upper()}:")
            if 'sources' in analysis:
                print(f"      Sources: {len(analysis['sources'])} sources")
            if 'analysis' in analysis and isinstance(analysis['analysis'], dict):
                print(f"      Sentiment: {analysis['analysis'].get('sentiment', 'N/A')}")
    
    except Exception as e:
        print(f"❌ Error in market report: {e}")
    
    # Test 3: Direct news fetching
    print("\n" + "=" * 60)
    print("3. Testing direct news fetching from NewsDataSources...")
    try:
        news_result = await service._search_commodity_news("gold", "week")
        
        print(f"\n✅ News Fetched:")
        print(f"   - Commodity: {news_result['commodity']}")
        print(f"   - Articles found: {len(news_result['articles'])}")
        print(f"   - Sources: {', '.join(news_result['sources_used'])}")
        
        # Show distribution by source
        source_count = {}
        for article in news_result['articles']:
            source = article.get('source', 'Unknown')
            source_count[source] = source_count.get(source, 0) + 1
        
        print(f"\n   📊 Article Distribution by Source:")
        for source, count in source_count.items():
            print(f"      - {source}: {count} articles")
    
    except Exception as e:
        print(f"❌ Error fetching news: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Integration test completed!")
    print("=" * 60)

if __name__ == "__main__":
    # Ensure GROQ_API_KEY is set
    if not os.getenv("GROQ_API_KEY"):
        print("⚠️  Please set GROQ_API_KEY environment variable")
        print("   export GROQ_API_KEY='your-api-key'")
        sys.exit(1)
    
    # Run the test
    asyncio.run(test_source_integration())
