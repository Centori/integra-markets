#!/usr/bin/env python3
"""
Test script for FinBERT sentiment analysis using Hugging Face Inference API
"""
import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up the environment
os.environ['FINBERT_MODEL'] = 'ProsusAI/finbert'
os.environ['FINBERT_CACHE_DIR'] = './models/finbert'

# Import after setting environment
from app.services.finbert import analyze_financial_text
from app.services.sentiment import analyze_text

async def test_finbert_api():
    """Test the FinBERT API implementation"""
    
    print("Testing FinBERT via Hugging Face Inference API...\n")
    
    # Test cases
    test_texts = [
        "Oil prices surge as OPEC announces unexpected production cuts.",
        "Tech stocks plummet amid recession fears and rising interest rates.",
        "Gold prices remain stable as investors await Federal Reserve decision.",
        "Natural gas futures jump 15% on pipeline explosion in major hub.",
        "Wheat prices fall as harvest reports show bumper crop yields."
    ]
    
    for i, text in enumerate(test_texts, 1):
        print(f"Test {i}: {text}")
        try:
            # Test FinBERT directly
            result = analyze_financial_text(text)
            print(f"FinBERT Result: {result['sentiment']} (confidence: {result['confidence']:.2f})")
            print(f"Scores: Bullish={result['bullish']:.2f}, Bearish={result['bearish']:.2f}, Neutral={result['neutral']:.2f}")
            
            # Test ensemble sentiment (includes VADER)
            ensemble_result = await analyze_text(text)
            if ensemble_result.get('ensemble'):
                print(f"Ensemble Result: {ensemble_result['ensemble']['sentiment']} (confidence: {ensemble_result['ensemble']['confidence']:.2f})")
            
        except Exception as e:
            print(f"Error: {str(e)}")
        
        print("-" * 80)
        print()

if __name__ == "__main__":
    # Check for HF token
    if not os.environ.get('HUGGING_FACE_TOKEN'):
        print("WARNING: No HUGGING_FACE_TOKEN found in environment.")
        print("Please add it to your .env file for better API access.")
        print()
    
    # Run the test
    asyncio.run(test_finbert_api())
