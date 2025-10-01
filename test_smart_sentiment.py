#!/usr/bin/env python3
"""
Test the Smart Sentiment Analyzer (Preprocessing + VADER + ML)
This works without any API keys or external dependencies
"""
import os
import sys
import asyncio

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.smart_sentiment import analyze_financial_text, record_user_feedback

def test_smart_sentiment():
    """Test the smart sentiment analyzer"""
    
    print("Testing Smart Sentiment Analyzer (No API Keys Required!)")
    print("=" * 60)
    
    test_cases = [
        {
            "text": "Oil prices surge as OPEC announces unexpected production cuts of 1.1 million barrels per day.",
            "expected": "BULLISH"
        },
        {
            "text": "Tech stocks crash amid recession fears and rising interest rates.",
            "expected": "BEARISH"
        },
        {
            "text": "Gold prices remain stable as investors await Federal Reserve decision.",
            "expected": "NEUTRAL"
        },
        {
            "text": "Natural gas futures jump 15% on pipeline explosion in major hub.",
            "expected": "BULLISH"
        },
        {
            "text": "Wheat prices fall as harvest reports show bumper crop yields.",
            "expected": "BEARISH"
        },
        {
            "text": "Chile copper mine workers begin indefinite strike, disrupting global supply.",
            "expected": "BULLISH"
        },
        {
            "text": "Iran sanctions targeting oil exports could reduce supply by 2 million barrels.",
            "expected": "BULLISH"
        },
        {
            "text": "Severe drought in Brazil threatens coffee harvest, prices expected to rise.",
            "expected": "BULLISH"
        }
    ]
    
    correct = 0
    
    for i, test in enumerate(test_cases, 1):
        print(f"\nTest {i}: {test['text'][:80]}...")
        
        # Analyze
        result = analyze_financial_text(test['text'])
        
        # Display results
        print(f"Sentiment: {result['sentiment']} (confidence: {result['confidence']:.3f})")
        print(f"Scores: Bullish={result['bullish']:.3f}, Bearish={result['bearish']:.3f}, Neutral={result['neutral']:.3f}")
        
        # Show preprocessing insights
        if 'commodity' in result:
            print(f"Commodity: {result['commodity']}")
        if 'event_type' in result:
            print(f"Event Type: {result['event_type']}")
        if 'market_impact' in result:
            print(f"Market Impact: {result['market_impact']}")
        if 'severity' in result:
            print(f"Severity: {result['severity']}")
        if 'keywords' in result and result['keywords']:
            print(f"Keywords: {', '.join(result['keywords'][:5])}")
        
        # Check accuracy
        if result['sentiment'] == test['expected']:
            print(f"✅ Correct! Expected {test['expected']}")
            correct += 1
        else:
            print(f"❌ Wrong. Expected {test['expected']}, got {result['sentiment']}")
        
        print("-" * 60)
    
    # Summary
    accuracy = (correct / len(test_cases)) * 100
    print(f"\n\nAccuracy: {correct}/{len(test_cases)} ({accuracy:.1f}%)")
    
    # Test feedback mechanism
    print("\n\nTesting Feedback Mechanism:")
    print("Recording sample feedback...")
    
    # Simulate user feedback
    record_user_feedback(
        text="Oil prices surge on OPEC cuts",
        predicted="BULLISH",
        actual="UP",
        price_change=5.2
    )
    
    print("✅ Feedback recorded successfully!")
    print("\nThe system will learn from user feedback over time to improve accuracy.")

if __name__ == "__main__":
    test_smart_sentiment()
