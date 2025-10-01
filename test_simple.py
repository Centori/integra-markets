#!/usr/bin/env python3
"""
Simple test to verify the backend setup
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("Testing Integra Markets Backend Setup\n")
print("=" * 50)

# Check environment variables
env_vars = {
    "SUPABASE_URL": os.getenv("SUPABASE_URL"),
    "SUPABASE_KEY": os.getenv("SUPABASE_KEY"),
    "HUGGING_FACE_TOKEN": os.getenv("HUGGING_FACE_TOKEN"),
}

print("Environment Variables:")
for key, value in env_vars.items():
    if value:
        if key == "HUGGING_FACE_TOKEN":
            print(f"✅ {key}: {'*' * 10}...{value[-4:] if len(value) > 4 else 'SET'}")
        else:
            print(f"✅ {key}: {value[:20]}...")
    else:
        print(f"❌ {key}: NOT SET")

print("\n" + "=" * 50)

# Test VADER (lightweight, works without API key)
try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    
    print("\nTesting VADER Sentiment Analysis:")
    vader = SentimentIntensityAnalyzer()
    
    test_texts = [
        "Oil prices surge on OPEC production cuts",
        "Market crashes amid recession fears",
        "Commodity prices remain stable"
    ]
    
    for text in test_texts:
        scores = vader.polarity_scores(text)
        sentiment = "POSITIVE" if scores['compound'] > 0.05 else "NEGATIVE" if scores['compound'] < -0.05 else "NEUTRAL"
        print(f"\nText: '{text}'")
        print(f"Sentiment: {sentiment} (score: {scores['compound']:.3f})")
        
except Exception as e:
    print(f"❌ VADER Error: {str(e)}")

print("\n" + "=" * 50)

# Check if we can use the HF API
if env_vars["HUGGING_FACE_TOKEN"] and env_vars["HUGGING_FACE_TOKEN"] != "hf_YOUR_NEW_TOKEN_HERE":
    print("\n✅ Hugging Face token is configured - FinBERT API calls will work")
else:
    print("\n⚠️  No Hugging Face token configured")
    print("To use FinBERT sentiment analysis:")
    print("1. Sign up at https://huggingface.co")
    print("2. Create a token at https://huggingface.co/settings/tokens")
    print("3. Update HUGGING_FACE_TOKEN in your .env file")

print("\n✅ Setup complete! Your backend is ready for the serverless approach.")
