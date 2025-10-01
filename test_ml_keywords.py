#!/usr/bin/env python3
"""
Test script to demonstrate ML-based keyword extraction and catalogue building.
Shows how the system learns from article analysis and improves over time.
"""

import asyncio
import json
from app.services.sentiment import sentiment_analyzer
from app.services.keyword_ml_processor import (
    extract_ml_keywords, 
    train_on_market_outcome,
    get_keyword_analysis,
    get_event_patterns,
    keyword_processor
)

# Test articles with various geopolitical and market events
test_articles = [
    {
        "text": "Iran attacks oil facilities causing major supply disruption. Tensions escalate as sanctions imposed on Russian oil exports. Saudi Arabia responds with production cuts, sending crude prices surging above $95 per barrel.",
        "expected_keywords": ["iran", "attacks", "oil", "facilities", "supply disruption", "tensions", "sanctions", "russia", "saudi arabia", "production cuts", "crude", "prices", "surging"],
        "actual_outcome": {"price_direction": "bullish", "price_change": 5.2}
    },
    {
        "text": "Severe drought threatens wheat harvest in major producing regions. Ukraine grain exports halted due to port blockade. Food security concerns rise as inventory levels drop to decade lows.",
        "expected_keywords": ["drought", "wheat", "harvest", "ukraine", "grain", "exports", "port", "blockade", "food security", "inventory", "decade lows"],
        "actual_outcome": {"price_direction": "bullish", "price_change": 3.8}
    },
    {
        "text": "OPEC announces surprise production increase amid weakening demand. Oversupply fears grow as recession concerns mount. Oil prices plunge 8% in biggest single-day decline this year.",
        "expected_keywords": ["opec", "production increase", "weakening demand", "oversupply", "recession", "oil prices", "plunge", "decline"],
        "actual_outcome": {"price_direction": "bearish", "price_change": -8.0}
    },
    {
        "text": "Pipeline explosion in Nigeria disrupts oil flow to terminals. Force majeure declared on crude shipments. Facilities shutdown expected to last weeks as repairs begin.",
        "expected_keywords": ["pipeline", "explosion", "nigeria", "disrupts", "oil flow", "terminals", "force majeure", "crude shipments", "facilities", "shutdown", "repairs"],
        "actual_outcome": {"price_direction": "bullish", "price_change": 2.5}
    },
    {
        "text": "China announces strategic petroleum reserve release to combat inflation. Demand destruction fears rise as lockdowns continue. Market sentiment turns bearish on growth concerns.",
        "expected_keywords": ["china", "strategic petroleum reserve", "release", "inflation", "demand destruction", "lockdowns", "bearish", "growth concerns"],
        "actual_outcome": {"price_direction": "bearish", "price_change": -3.2}
    }
]

async def test_keyword_extraction():
    """Test the ML-based keyword extraction system."""
    
    print("=" * 80)
    print("ML-BASED KEYWORD EXTRACTION SYSTEM TEST")
    print("=" * 80)
    
    # Process each test article
    for i, article_data in enumerate(test_articles, 1):
        print(f"\n--- Article {i} ---")
        print(f"Text: {article_data['text'][:100]}...")
        
        # 1. Extract keywords using sentiment analyzer (which now uses ML)
        result = await sentiment_analyzer.analyze_text(article_data['text'])
        keywords = result.get('keywords', [])
        
        print(f"\nExtracted Keywords (via sentiment analyzer):")
        for kw in keywords[:10]:
            if isinstance(kw, dict):
                print(f"  • {kw.get('word', kw)}: score={kw.get('score', 0):.3f}, type={kw.get('type', 'unknown')}")
            else:
                print(f"  • {kw}")
        
        # 2. Also test direct ML extraction with context
        context = {
            'sentiment': result.get('ensemble', {}).get('sentiment', 'neutral'),
            'event_type': 'supply_shock' if 'disruption' in article_data['text'].lower() else 'market_movement',
            'commodity': 'oil' if 'oil' in article_data['text'].lower() else 'general'
        }
        
        ml_keywords = extract_ml_keywords(article_data['text'], context)
        
        print(f"\nML-Extracted Keywords (direct):")
        for kw in ml_keywords[:10]:
            print(f"  • {kw['word']}: score={kw['score']:.3f}, importance={kw.get('importance', 0):.3f}, cluster={kw.get('cluster_id')}")
        
        # 3. Train the model with the actual outcome
        keyword_list = [kw['word'] for kw in ml_keywords[:10]]
        predicted_sentiment = result.get('ensemble', {}).get('sentiment', 'neutral').lower()
        
        train_on_market_outcome(
            keywords=keyword_list,
            predicted=predicted_sentiment,
            actual=article_data['actual_outcome']
        )
        
        print(f"\nTraining feedback recorded: predicted={predicted_sentiment}, actual={article_data['actual_outcome']['price_direction']}")
    
    print("\n" + "=" * 80)
    print("KEYWORD CATALOGUE ANALYSIS")
    print("=" * 80)
    
    # Show some keyword insights
    important_keywords = ['iran', 'sanctions', 'oil', 'supply', 'disruption', 'drought', 'opec', 'pipeline']
    
    print("\nKeyword Insights:")
    for keyword in important_keywords:
        analysis = get_keyword_analysis(keyword)
        if analysis.get('status') != 'unknown':
            print(f"\n{keyword.upper()}:")
            print(f"  Frequency: {analysis['frequency']}")
            print(f"  Importance: {analysis['importance_score']:.3f}")
            print(f"  Trend: {analysis['trend']}")
            print(f"  Primary Sentiment: {analysis['primary_sentiment']}")
            print(f"  Average Impact: {analysis['average_impact']:.2f}%")
            if analysis['related_keywords']:
                print(f"  Related: {', '.join(analysis['related_keywords'][:3])}")
    
    # Show event patterns
    print("\n" + "=" * 80)
    print("IDENTIFIED EVENT PATTERNS")
    print("=" * 80)
    
    event_patterns = get_event_patterns()
    for event_type, patterns in event_patterns.items():
        if patterns:
            print(f"\n{event_type.upper()}:")
            for pattern in patterns[:3]:
                print(f"  • Keyword: {pattern['keyword']}")
                print(f"    Avg Impact: {pattern['avg_impact']:.2f}%")
                print(f"    Frequency: {pattern['frequency']}")
                print(f"    Co-occurring: {', '.join(pattern['co_occurring'][:3])}")
    
    # Show catalogue statistics
    print("\n" + "=" * 80)
    print("CATALOGUE STATISTICS")
    print("=" * 80)
    
    catalogue_stats = {
        'total_keywords': len(keyword_processor.catalogue.keyword_index),
        'clusters': len(keyword_processor.catalogue.keyword_clusters),
        'event_types': len(keyword_processor.catalogue.event_patterns),
        'high_importance': sum(1 for stats in keyword_processor.catalogue.keyword_stats.values() 
                              if stats['importance_score'] > 0.7)
    }
    
    print(f"\nTotal Keywords in Catalogue: {catalogue_stats['total_keywords']}")
    print(f"Keyword Clusters: {catalogue_stats['clusters']}")
    print(f"Event Types Identified: {catalogue_stats['event_types']}")
    print(f"High Importance Keywords: {catalogue_stats['high_importance']}")
    
    # Save the catalogue
    keyword_processor.catalogue.save_catalogue()
    print("\n✅ Keyword catalogue saved successfully")
    
    # Demonstrate improvement over time
    print("\n" + "=" * 80)
    print("DEMONSTRATION OF LEARNING")
    print("=" * 80)
    
    test_text = "Iran threatens to close Strait of Hormuz amid escalating tensions. Oil facilities targeted in retaliatory strikes."
    
    print(f"\nTest text: {test_text}")
    
    # Extract keywords before and after training
    initial_keywords = extract_ml_keywords(test_text, {'sentiment': 'neutral'})
    
    print("\nKeywords extracted (with learning):")
    for kw in initial_keywords[:8]:
        importance = keyword_processor.catalogue.keyword_stats.get(kw['word'], {}).get('importance_score', 0)
        print(f"  • {kw['word']}: ML score={kw['score']:.3f}, learned importance={importance:.3f}")
    
    # Predict market impact based on keywords
    keyword_list = [kw['word'] for kw in initial_keywords[:10]]
    impact_predictions = keyword_processor.catalogue.predict_keyword_impact(keyword_list)
    
    total_impact = sum(impact_predictions.values())
    print(f"\nPredicted Market Impact: {total_impact:.2f}")
    print(f"Direction: {'Bullish' if total_impact > 0 else 'Bearish' if total_impact < 0 else 'Neutral'}")

if __name__ == "__main__":
    asyncio.run(test_keyword_extraction())
