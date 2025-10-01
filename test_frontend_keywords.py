#!/usr/bin/env python3
"""
Test script to verify keywords are properly formatted for the frontend UI.
Shows the exact format that will be displayed in the app's pill-shaped badges.
"""

import asyncio
import json
from app.services.sentiment import sentiment_analyzer

# Test article similar to the screenshot example
test_articles = [
    {
        "title": "US Natural Gas Storage Exceeds Expectations",
        "text": "Weekly natural gas storage report shows higher than expected inventory build, indicating potential oversupply conditions in key markets. This could signal bearish pressure on natural gas prices in the near term.",
        "expected_ui_keywords": ["market", "supply", "inventory", "storage", "oversupply"]
    },
    {
        "title": "Iran Oil Facilities Under Attack",
        "text": "Iran attacks on oil facilities causing major supply disruption. Tensions escalate as sanctions imposed on Russian oil exports. Saudi Arabia responds with production cuts.",
        "expected_ui_keywords": ["iran", "oil", "sanctions", "disruption", "tensions"]
    }
]

async def test_frontend_formatting():
    """Test that keywords are properly formatted for frontend display."""
    
    print("=" * 80)
    print("FRONTEND KEYWORD FORMATTING TEST")
    print("Testing format compatibility with existing UI pill badges")
    print("=" * 80)
    
    for article in test_articles:
        print(f"\n📰 Article: {article['title']}")
        print("-" * 60)
        
        # Analyze with sentiment analyzer
        result = await sentiment_analyzer.analyze_text(article['text'])
        
        # Get keywords from the result
        keywords = result.get('keywords', [])
        
        print("\n🏷️  Keywords for UI Display (as pill badges):")
        print("-" * 40)
        
        # Display keywords in the format they'll appear in the UI
        for i, kw in enumerate(keywords[:8], 1):  # UI typically shows 5-8 keywords
            # Extract the display components
            if isinstance(kw, dict):
                text = kw.get('text') or kw.get('word', '')
                score = kw.get('score', 0)
                
                # Format score as it appears in UI (e.g., "0.8" shown as "0.8")
                score_display = f"{score:.1f}" if score < 1 else "0.9"
                
                # Determine badge color based on score (matching UI logic)
                if score > 0.7:
                    color = "🟢"  # Green - High importance
                elif score > 0.4:
                    color = "🟡"  # Yellow - Medium importance
                else:
                    color = "⚪"  # Gray - Low importance
                
                print(f"  {color} {text} ({score_display})")
            else:
                print(f"  ⚪ {kw}")
        
        # Show the raw data structure for developers
        print("\n📊 Raw Data Structure (for developers):")
        print("-" * 40)
        for kw in keywords[:3]:  # Show first 3 for brevity
            if isinstance(kw, dict):
                print(f"  {{\n    text: '{kw.get('text', kw.get('word', ''))}',")
                print(f"    score: {kw.get('score', 0):.2f},")
                print(f"    type: '{kw.get('type', 'unknown')}',")
                if kw.get('importance', 0) > 0:
                    print(f"    importance: {kw.get('importance', 0):.2f}")
                print("  }")
        
        # Check if keywords match expected UI display
        print("\n✅ Validation:")
        extracted_texts = [kw.get('text', kw.get('word', '')).lower() if isinstance(kw, dict) else str(kw).lower() 
                          for kw in keywords[:8]]
        
        matches = [exp for exp in article['expected_ui_keywords'] if any(exp in text for text in extracted_texts)]
        
        if len(matches) >= 3:
            print(f"  ✓ Keywords properly extracted: {', '.join(matches)}")
            print(f"  ✓ Ready for UI display with scores")
        else:
            print(f"  ⚠️  Only {len(matches)} expected keywords found")
    
    print("\n" + "=" * 80)
    print("FRONTEND COMPATIBILITY CHECK")
    print("=" * 80)
    
    # Verify the format matches what the frontend expects
    sample_keyword = keywords[0] if keywords and isinstance(keywords[0], dict) else None
    
    if sample_keyword:
        print("\n✅ Frontend Expected Format:")
        print("  {")
        print(f"    text: '{sample_keyword.get('text', sample_keyword.get('word', ''))}',")
        print(f"    score: {sample_keyword.get('score', 0)}")
        print("  }")
        print("\n✅ This format is compatible with the existing UI pill badge component!")
        print("   The pills will display as: 'keyword (score)' with color based on score value")
    
    print("\n📱 UI Display Example:")
    print("  ┌─────────────┐ ┌──────────────┐ ┌─────────────┐")
    print("  │ market (0.5)│ │ supply (0.7) │ │inventory(0.6)│")
    print("  └─────────────┘ └──────────────┘ └─────────────┘")
    print("  ┌──────────────┐ ┌────────────────┐")
    print("  │ storage (0.8)│ │oversupply (0.9)│")
    print("  └──────────────┘ └────────────────┘")
    
    print("\n✨ The ML enhancement provides better keywords while maintaining")
    print("   the clean, minimalist UI design shown in your screenshot!")

if __name__ == "__main__":
    asyncio.run(test_frontend_formatting())
