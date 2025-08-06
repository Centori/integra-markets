#!/usr/bin/env python3
"""
Test script for the AI-powered alert system with Q-learning.
Demonstrates how the system learns from user behavior and market outcomes.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ai_alert_service import (
    process_news_with_ai,
    record_feedback,
    record_market_data,
    get_user_insights
)
import time
import random

def simulate_user_session():
    """Simulate a complete user session with news, feedback, and market outcomes."""
    
    print("🤖 AI Alert System Test - Q-Learning Demonstration\n")
    
    # Test user
    user_id = "test_user_123"
    
    # Example news items with different characteristics
    news_items = [
        {
            "text": "Breaking: Major drought in Australia threatens wheat production. Experts predict 30% crop loss and significant price increases.",
            "expected_commodity": "wheat",
            "expected_severity": "high",
            "actual_price_change": 12.5
        },
        {
            "text": "Corn futures remain stable as harvest reports show average yields across the Midwest.",
            "expected_commodity": "corn",
            "expected_severity": "low",
            "actual_price_change": 0.3
        },
        {
            "text": "Gold prices surge as investors seek safe haven amid global uncertainty. Analysts forecast continued volatility.",
            "expected_commodity": "gold",
            "expected_severity": "medium",
            "actual_price_change": 3.8
        },
        {
            "text": "OPEC announces production cuts. Oil prices expected to rise sharply in coming weeks.",
            "expected_commodity": "oil",
            "expected_severity": "high",
            "actual_price_change": 8.2
        },
        {
            "text": "Soybean exports reach record levels due to strong international demand.",
            "expected_commodity": "soybeans",
            "expected_severity": "medium",
            "actual_price_change": 4.1
        }
    ]
    
    tracking_ids = []
    
    print("📰 Processing news items and generating recommendations...\n")
    
    # Process each news item
    for i, item in enumerate(news_items):
        print(f"News {i+1}: {item['text'][:60]}...")
        
        # Process through AI system
        result = process_news_with_ai(
            news_text=item["text"],
            user_id=user_id,
            source="test_feed"
        )
        
        if "error" not in result:
            rec = result["recommendation"]
            print(f"  ✓ AI Decision: {'SEND ALERT' if rec['send_alert'] else 'NO ALERT'}")
            if rec["send_alert"]:
                print(f"    Priority: {rec['priority']}")
                print(f"    Confidence: {rec['confidence']:.2f}")
                tracking_ids.append((result.get("tracking_id"), item))
        print()
    
    print("\n💭 Simulating user interactions...\n")
    
    # Simulate user feedback
    for tracking_id, item in tracking_ids:
        if tracking_id:
            # Simulate different user behaviors
            user_action = random.choice([
                ("clicked", {"response_time": random.randint(5, 60)}),
                ("dismissed", {}),
                ("clicked", {"response_time": random.randint(10, 120), "found_helpful": True})
            ])
            
            feedback_type, additional = user_action
            print(f"User {feedback_type} alert for {item['expected_commodity']}")
            
            record_feedback(tracking_id, feedback_type, **additional)
            
            # If user found it helpful, record that too
            if additional.get("found_helpful"):
                record_feedback(tracking_id, "helpful")
    
    print("\n📈 Recording market outcomes...\n")
    
    # Simulate market outcomes
    time.sleep(1)  # Small delay to simulate time passing
    
    for item in news_items:
        commodity = item["expected_commodity"]
        price_change = item["actual_price_change"]
        
        # Add some randomness to simulate real market
        price_change += random.uniform(-1, 1)
        
        print(f"{commodity.capitalize()}: {'+' if price_change > 0 else ''}{price_change:.2f}%")
        record_market_data(commodity, price_change)
    
    print("\n📊 User Insights After Learning:\n")
    
    # Get user insights
    insights = get_user_insights(user_id)
    
    print(f"Total alerts sent: {insights['stats']['total_alerts']}")
    print(f"Alerts clicked: {insights['stats']['clicked_alerts']}")
    print(f"Click rate: {insights['stats']['click_rate']:.2%}")
    print(f"Preferred commodities: {', '.join(insights['preferences']['commodities'])}")
    print(f"Recommended alert frequency: {insights['preferences']['alert_frequency']} per day")
    
    if insights['commodity_interests']:
        print("\nCommodity interests (by engagement):")
        for commodity, clicks in insights['commodity_interests'].items():
            print(f"  - {commodity}: {clicks} clicks")
    
    print("\n🎯 Testing improved recommendations after learning...\n")
    
    # Test with new news to see if the system learned
    test_news = [
        "Wheat prices continue to climb as drought conditions worsen.",
        "Minor fluctuations in corn market remain within normal range.",
        "Gold reaches new highs amid continued market uncertainty."
    ]
    
    for news in test_news:
        result = process_news_with_ai(news, user_id)
        if "error" not in result:
            rec = result["recommendation"]
            print(f"News: {news[:50]}...")
            print(f"  Decision: {'ALERT' if rec['send_alert'] else 'NO ALERT'} "
                  f"(Confidence: {rec['confidence']:.2f})")

def test_model_stats():
    """Test model statistics and learning progress."""
    from app.services.alert_rl_model import alert_agent
    
    print("\n🧠 Q-Learning Model Statistics:\n")
    print(f"Epsilon (exploration rate): {alert_agent.epsilon:.3f}")
    print(f"Learning steps: {alert_agent.learn_step_counter}")
    print(f"Memory buffer size: {len(alert_agent.memory)}")
    print(f"Device: {alert_agent.device}")
    
    # Show action mappings
    print("\nAction space:")
    for action_id, action_info in alert_agent.action_mappings.items():
        print(f"  Action {action_id}: {action_info}")

if __name__ == "__main__":
    print("=" * 60)
    print("AI Alert System with Q-Learning - Test Suite")
    print("=" * 60)
    
    # Run the simulation
    simulate_user_session()
    
    # Show model stats
    test_model_stats()
    
    print("\n✅ Test completed! The Q-learning model has learned from:")
    print("   - User preferences and behavior")
    print("   - Market outcomes vs predictions")
    print("   - Feedback on alert relevance")
    print("\nThe system will continue to improve with more data!")
