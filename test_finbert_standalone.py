#!/usr/bin/env python3
"""
Standalone test for FinBERT sentiment analysis using Hugging Face Inference API
"""
import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get HF token
HF_TOKEN = os.getenv("HUGGING_FACE_TOKEN")

def test_finbert_api(text):
    """Test FinBERT via Hugging Face Inference API"""
    
    API_URL = "https://api-inference.huggingface.co/models/ProsusAI/finbert"
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    
    response = requests.post(API_URL, headers=headers, json={"inputs": text})
    
    if response.status_code == 503:
        print("Model is loading... waiting 20 seconds...")
        import time
        time.sleep(20)
        response = requests.post(API_URL, headers=headers, json={"inputs": text})
    
    return response.json()

def main():
    print("Testing FinBERT via Hugging Face Inference API")
    print("=" * 60)
    
    if not HF_TOKEN or HF_TOKEN == "hf_YOUR_NEW_TOKEN_HERE":
        print("❌ No Hugging Face token found!")
        return
    
    print(f"✅ Using HF token: {HF_TOKEN[:10]}...{HF_TOKEN[-4:]}\n")
    
    # Test cases
    test_texts = [
        "Oil prices surge as OPEC announces unexpected production cuts.",
        "Tech stocks plummet amid recession fears and rising interest rates.",
        "Gold prices remain stable as investors await Federal Reserve decision.",
        "Natural gas futures jump 15% on pipeline explosion in major hub.",
        "Wheat prices fall as harvest reports show bumper crop yields."
    ]
    
    for i, text in enumerate(test_texts, 1):
        print(f"\nTest {i}: {text}")
        try:
            result = test_finbert_api(text)
            
            if isinstance(result, list) and len(result) > 0:
                # Parse the response
                scores = {item['label'].lower(): item['score'] for item in result[0]}
                
                # Map to trading sentiment
                bullish = scores.get('positive', 0)
                bearish = scores.get('negative', 0)
                neutral = scores.get('neutral', 0)
                
                # Determine primary sentiment
                if bullish > bearish and bullish > neutral:
                    sentiment = "BULLISH"
                    confidence = bullish
                elif bearish > bullish and bearish > neutral:
                    sentiment = "BEARISH"
                    confidence = bearish
                else:
                    sentiment = "NEUTRAL"
                    confidence = neutral
                
                print(f"Sentiment: {sentiment} (confidence: {confidence:.2f})")
                print(f"Scores: Bullish={bullish:.2f}, Bearish={bearish:.2f}, Neutral={neutral:.2f}")
            else:
                print(f"Unexpected response: {result}")
                
        except Exception as e:
            print(f"Error: {str(e)}")
        
        print("-" * 60)

if __name__ == "__main__":
    main()
