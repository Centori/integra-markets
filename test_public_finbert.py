#!/usr/bin/env python3
"""
Test FinBERT using public access (no authentication required for some models)
"""
import requests
import json
import time

def test_finbert_public():
    """Test if FinBERT works without authentication"""
    
    print("Testing FinBERT Public Access")
    print("=" * 60)
    
    test_texts = [
        "Oil prices surge as OPEC announces production cuts",
        "Tech stocks crash amid recession fears",
        "Gold remains stable as investors wait"
    ]
    
    # Try different FinBERT variants
    models = [
        {
            "name": "ProsusAI/finbert",
            "url": "https://api-inference.huggingface.co/models/ProsusAI/finbert",
            "desc": "Original FinBERT"
        },
        {
            "name": "yiyanghkust/finbert-tone",
            "url": "https://api-inference.huggingface.co/models/yiyanghkust/finbert-tone",
            "desc": "FinBERT-tone variant"
        },
        {
            "name": "ahmedrachid/FinancialBERT-Sentiment-Analysis",
            "url": "https://api-inference.huggingface.co/models/ahmedrachid/FinancialBERT-Sentiment-Analysis",
            "desc": "Financial sentiment BERT"
        }
    ]
    
    for model in models:
        print(f"\n\nTesting: {model['name']}")
        print(f"Description: {model['desc']}")
        print("-" * 40)
        
        success = False
        
        for i, text in enumerate(test_texts):
            print(f"\nText: '{text}'")
            
            try:
                # No authentication headers
                response = requests.post(
                    model['url'],
                    json={"inputs": text},
                    timeout=30
                )
                
                if response.status_code == 503:
                    print("⏳ Model is loading... waiting 20 seconds...")
                    time.sleep(20)
                    # Retry
                    response = requests.post(
                        model['url'],
                        json={"inputs": text},
                        timeout=30
                    )
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ Success! Response:")
                    
                    # Parse different response formats
                    if isinstance(result, list) and len(result) > 0:
                        if isinstance(result[0], list):
                            # Format: [[{label, score}, ...]]
                            for item in result[0]:
                                label = item.get('label', 'Unknown')
                                score = item.get('score', 0)
                                print(f"   {label}: {score:.3f}")
                        else:
                            # Format: [{label, score}, ...]
                            for item in result:
                                label = item.get('label', 'Unknown')
                                score = item.get('score', 0)
                                print(f"   {label}: {score:.3f}")
                    
                    success = True
                else:
                    print(f"❌ Failed: {response.status_code}")
                    print(f"   Response: {response.text[:200]}")
                    
            except Exception as e:
                print(f"❌ Error: {str(e)}")
            
            if success:
                break  # Don't test all texts if one works
        
        if success:
            print(f"\n✅ {model['name']} works without authentication!")
            return model
    
    return None

def create_working_config(working_model):
    """Create a configuration for the working model"""
    
    if not working_model:
        print("\n❌ No publicly accessible FinBERT model found")
        return
    
    print(f"\n\n✅ Recommended Configuration")
    print("=" * 60)
    print(f"Model: {working_model['name']}")
    print(f"URL: {working_model['url']}")
    
    print("\nUpdate your finbert.py to use this model:")
    print(f"""
# In app/services/finbert.py, update the API URL:
self.api_url = "{working_model['url']}"

# Or in config:
FINBERT_MODEL = "{working_model['name']}"
""")

if __name__ == "__main__":
    working_model = test_finbert_public()
    create_working_config(working_model)
    
    print("\n\nNOTE: For production use, you should:")
    print("1. Get a valid Hugging Face token from https://huggingface.co/settings/tokens")
    print("2. This will give you higher rate limits and priority access")
    print("3. Some models may require authentication")
