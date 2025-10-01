#!/usr/bin/env python3
"""
Test script for DQN Authority Scoring Integration

This script tests the integration between the DQN authority scoring system
and the TwitterNewsSource to verify KOL identification functionality.
"""

import asyncio
import sys
import os
from datetime import datetime
from typing import List, Dict

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the news fetcher with DQN integration
from news_aggregator.news_fetcher import TwitterNewsSource, NewsItem, NewsFetcher

def print_separator(title: str):
    """Print a formatted separator"""
    print("\n" + "="*60)
    print(f" {title} ")
    print("="*60)

def print_news_item_details(item: NewsItem, index: int):
    """Print detailed information about a news item"""
    print(f"\n📰 News Item #{index + 1}:")
    print(f"   Title: {item.title}")
    print(f"   Source: {item.source}")
    print(f"   Type: {item.source_type}")
    print(f"   Published: {item.published}")
    print(f"   Summary: {item.summary[:100]}...")
    
    if item.authority_score is not None:
        print(f"   🎯 Authority Score: {item.authority_score:.3f}")
        
        if item.kol_indicators:
            print(f"   📊 KOL Classification: {item.kol_indicators.get('classification', 'Unknown')}")
            print(f"   ✅ Verified Account: {item.kol_indicators.get('verified_account', False)}")
            print(f"   🎓 Financial Expert: {item.kol_indicators.get('is_financial_expert', False)}")
            print(f"   🏢 Institutional Background: {item.kol_indicators.get('has_institutional_background', False)}")
            print(f"   📈 High Engagement Quality: {item.kol_indicators.get('high_engagement_quality', False)}")
        
        if item.influence_metrics:
            print(f"   📊 Influence Metrics:")
            print(f"      - Content Authority: {item.influence_metrics.get('content_authority', 0):.3f}")
            print(f"      - Engagement Authority: {item.influence_metrics.get('engagement_authority', 0):.3f}")
            print(f"      - Network Authority: {item.influence_metrics.get('network_authority', 0):.3f}")
            print(f"      - Temporal Authority: {item.influence_metrics.get('temporal_authority', 0):.3f}")
            print(f"      - Follower Count: {item.influence_metrics.get('follower_count', 0):,}")
            print(f"      - Account Age: {item.influence_metrics.get('account_age_days', 0)} days")
    else:
        print(f"   ⚠️  Authority Score: Not available (DQN system disabled)")

def analyze_authority_distribution(news_items: List[NewsItem]):
    """Analyze and display authority score distribution"""
    twitter_items = [item for item in news_items if item.source_type == 'twitter']
    
    if not twitter_items:
        print("No Twitter items found for analysis.")
        return
    
    authority_scores = [item.authority_score for item in twitter_items if item.authority_score is not None]
    
    if not authority_scores:
        print("No authority scores available for analysis.")
        return
    
    print(f"\n📈 Authority Score Analysis:")
    print(f"   Total Twitter Sources: {len(twitter_items)}")
    print(f"   Average Authority Score: {sum(authority_scores) / len(authority_scores):.3f}")
    print(f"   Highest Authority Score: {max(authority_scores):.3f}")
    print(f"   Lowest Authority Score: {min(authority_scores):.3f}")
    
    # Count by authority levels
    high_authority = len([s for s in authority_scores if s >= 0.8])
    medium_authority = len([s for s in authority_scores if 0.6 <= s < 0.8])
    low_authority = len([s for s in authority_scores if 0.4 <= s < 0.6])
    minimal_authority = len([s for s in authority_scores if s < 0.4])
    
    print(f"\n🏆 Authority Level Distribution:")
    print(f"   High Authority (≥0.8): {high_authority} sources")
    print(f"   Medium Authority (0.6-0.8): {medium_authority} sources")
    print(f"   Low Authority (0.4-0.6): {low_authority} sources")
    print(f"   Minimal Authority (<0.4): {minimal_authority} sources")
    
    # KOL indicators analysis
    verified_count = len([item for item in twitter_items if item.kol_indicators and item.kol_indicators.get('verified_account', False)])
    expert_count = len([item for item in twitter_items if item.kol_indicators and item.kol_indicators.get('is_financial_expert', False)])
    institutional_count = len([item for item in twitter_items if item.kol_indicators and item.kol_indicators.get('has_institutional_background', False)])
    
    print(f"\n🎯 KOL Indicators:")
    print(f"   Verified Accounts: {verified_count}/{len(twitter_items)}")
    print(f"   Financial Experts: {expert_count}/{len(twitter_items)}")
    print(f"   Institutional Background: {institutional_count}/{len(twitter_items)}")

async def test_twitter_news_source():
    """Test TwitterNewsSource with DQN integration"""
    print_separator("Testing TwitterNewsSource with DQN Authority Scoring")
    
    try:
        # Initialize TwitterNewsSource
        twitter_source = TwitterNewsSource()
        print("✅ TwitterNewsSource initialized successfully")
        
        # Check if DQN system is available
        if twitter_source.dqn_scorer is not None:
            print("✅ DQN Authority Scoring System is available")
        else:
            print("⚠️  DQN Authority Scoring System is not available (missing dependencies)")
        
        # Fetch trending topics with authority analysis
        print("\n🔄 Fetching trending topics with authority analysis...")
        news_items = await twitter_source.fetch_trending_topics()
        
        print(f"✅ Successfully fetched {len(news_items)} news items")
        
        # Display detailed information for each news item
        print_separator("News Items with Authority Analysis")
        
        for i, item in enumerate(news_items):
            print_news_item_details(item, i)
        
        # Analyze authority distribution
        print_separator("Authority Score Analysis")
        analyze_authority_distribution(news_items)
        
        # Get authority insights
        if twitter_source.dqn_scorer is not None:
            insights = twitter_source.get_authority_insights(news_items)
            if insights:
                print_separator("Authority Insights Summary")
                print(f"📊 Authority Insights:")
                for key, value in insights.items():
                    print(f"   {key.replace('_', ' ').title()}: {value}")
        
        return news_items
        
    except Exception as e:
        print(f"❌ Error testing TwitterNewsSource: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

async def test_news_fetcher_integration():
    """Test NewsFetcher with Twitter integration"""
    print_separator("Testing NewsFetcher with Twitter Integration")
    
    try:
        # Initialize NewsFetcher
        news_fetcher = NewsFetcher()
        print("✅ NewsFetcher initialized successfully")
        
        # Test fetching news from all sources including Twitter
        print("\n🔄 Fetching news from all sources (including Twitter)...")
        all_news = await news_fetcher.fetch_all_news()
        
        print(f"✅ Successfully fetched {len(all_news)} total news items")
        
        # Separate by source type
        rss_items = [item for item in all_news if item.source_type == 'rss']
        twitter_items = [item for item in all_news if item.source_type == 'twitter']
        
        print(f"   📰 RSS Items: {len(rss_items)}")
        print(f"   🐦 Twitter Items: {len(twitter_items)}")
        
        # Show Twitter items with authority scores
        if twitter_items:
            print("\n🐦 Twitter Items with Authority Scoring:")
            for i, item in enumerate(twitter_items[:3]):  # Show first 3
                print(f"\n   Item {i+1}:")
                print(f"      Title: {item.title}")
                print(f"      Source: {item.source}")
                if item.authority_score is not None:
                    print(f"      Authority Score: {item.authority_score:.3f}")
                    if item.kol_indicators:
                        print(f"      Classification: {item.kol_indicators.get('classification', 'Unknown')}")
        
        return all_news
        
    except Exception as e:
        print(f"❌ Error testing NewsFetcher: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

async def test_dqn_components():
    """Test individual DQN components"""
    print_separator("Testing Individual DQN Components")
    
    try:
        # Test imports
        from ml_models.dqn_authority_scorer import DQNAuthorityScorer, UserProfile, AuthorityState
        from ml_models.agents.content_analysis_agent import ContentAnalysisAgent
        from ml_models.agents.engagement_pattern_agent import EngagementPatternAgent
        from ml_models.agents.network_authority_agent import NetworkAuthorityAgent
        from ml_models.agents.temporal_behavior_agent import TemporalBehaviorAgent
        
        print("✅ All DQN components imported successfully")
        
        # Test component initialization
        dqn_scorer = DQNAuthorityScorer()
        content_agent = ContentAnalysisAgent()
        engagement_agent = EngagementPatternAgent()
        network_agent = NetworkAuthorityAgent()
        temporal_agent = TemporalBehaviorAgent()
        
        print("✅ All DQN components initialized successfully")
        
        # Test with sample data
        sample_user = UserProfile(
            user_id="test_user",
            username="test_financial_expert",
            follower_count=50000,
            verified=True,
            bio="Senior Financial Analyst at Goldman Sachs | CFA",
            account_age_days=1200
        )
        
        sample_state = AuthorityState(
            content_quality=0.8,
            engagement_quality=0.7,
            network_authority=0.9,
            temporal_consistency=0.6,
            overall_authority=0.0
        )
        
        # Test authority calculation
        authority_score = dqn_scorer.calculate_authority_score(sample_user, sample_state)
        print(f"✅ Authority score calculation successful: {authority_score:.3f}")
        
        # Test individual agents
        content_score = content_agent.calculate_content_authority_score(
            "Federal Reserve signals dovish pivot in monetary policy. Key economic indicators suggest rate cuts ahead.",
            ["Fed", "MonetaryPolicy", "RateCuts"],
            ["@federalreserve"]
        )
        print(f"✅ Content analysis successful: {content_score:.3f}")
        
        engagement_score = engagement_agent.calculate_engagement_authority_score([
            {'likes': 1500, 'retweets': 800, 'comments': 200, 'quote_tweets': 150}
        ])
        print(f"✅ Engagement analysis successful: {engagement_score:.3f}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing DQN components: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function"""
    print("🚀 Starting DQN Integration Tests")
    print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test 1: DQN Components
    components_ok = await test_dqn_components()
    
    # Test 2: TwitterNewsSource
    if components_ok:
        twitter_news = await test_twitter_news_source()
    else:
        print("⚠️  Skipping TwitterNewsSource test due to component failures")
        twitter_news = None
    
    # Test 3: NewsFetcher Integration
    if components_ok:
        all_news = await test_news_fetcher_integration()
    else:
        print("⚠️  Skipping NewsFetcher test due to component failures")
        all_news = None
    
    # Final summary
    print_separator("Test Summary")
    
    if components_ok:
        print("✅ DQN Components: PASSED")
    else:
        print("❌ DQN Components: FAILED")
    
    if twitter_news is not None:
        print("✅ TwitterNewsSource Integration: PASSED")
        print(f"   - Fetched {len(twitter_news)} Twitter news items")
        authority_items = [item for item in twitter_news if item.authority_score is not None]
        print(f"   - {len(authority_items)} items with authority scores")
    else:
        print("❌ TwitterNewsSource Integration: FAILED")
    
    if all_news is not None:
        print("✅ NewsFetcher Integration: PASSED")
        print(f"   - Fetched {len(all_news)} total news items")
        twitter_items = [item for item in all_news if item.source_type == 'twitter']
        print(f"   - {len(twitter_items)} Twitter items with authority analysis")
    else:
        print("❌ NewsFetcher Integration: FAILED")
    
    print(f"\n⏰ Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n🎉 DQN Integration Testing Complete!")

if __name__ == "__main__":
    asyncio.run(main())