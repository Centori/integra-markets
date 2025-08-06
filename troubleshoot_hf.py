#!/usr/bin/env python3
"""
Troubleshoot Hugging Face FinBERT API integration
"""
import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get HF token
HF_TOKEN = os.getenv("HUGGING_FACE_TOKEN")

def check_token_validity():
    """Check if the HF token is valid"""
    print("1. Checking token validity...")
    
    # Check whoami endpoint
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    response = requests.get("https://huggingface.co/api/whoami", headers=headers)
    
    if response.status_code == 200:
        user_info = response.json()
        print(f"✅ Token is valid for user: {user_info.get('name', 'Unknown')}")
        print(f"   Username: {user_info.get('name')}")
        print(f"   Type: {user_info.get('type', 'Unknown')}")
        return True
    else:
        print(f"❌ Token validation failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def test_model_info():
    """Get information about the FinBERT model"""
    print("\n2. Checking FinBERT model accessibility...")
    
    # Check model info
    response = requests.get("https://huggingface.co/api/models/ProsusAI/finbert")
    
    if response.status_code == 200:
        model_info = response.json()
        print(f"✅ FinBERT model found")
        print(f"   Model ID: {model_info.get('modelId')}")
        print(f"   Pipeline: {model_info.get('pipeline_tag', 'Unknown')}")
        print(f"   Library: {model_info.get('library_name', 'Unknown')}")
        print(f"   Downloads: {model_info.get('downloads', 'Unknown')}")
        return True
    else:
        print(f"❌ Model info request failed: {response.status_code}")
        return False

def test_inference_api_direct():
    """Test the Inference API directly without token"""
    print("\n3. Testing Inference API without authentication...")
    
    test_text = "Oil prices surge on OPEC production cuts"
    
    # Try without auth first
    response = requests.post(
        "https://api-inference.huggingface.co/models/ProsusAI/finbert",
        json={"inputs": test_text}
    )
    
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("✅ Public access works!")
        result = response.json()
        print(f"   Result: {json.dumps(result, indent=2)}")
        return True
    else:
        print(f"❌ Public access failed: {response.text}")
        return False

def test_inference_api_with_token():
    """Test the Inference API with token"""
    print("\n4. Testing Inference API with authentication...")
    
    test_text = "Oil prices surge on OPEC production cuts"
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    
    response = requests.post(
        "https://api-inference.huggingface.co/models/ProsusAI/finbert",
        headers=headers,
        json={"inputs": test_text}
    )
    
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("✅ Authenticated access works!")
        result = response.json()
        print(f"   Result: {json.dumps(result, indent=2)}")
        return True
    elif response.status_code == 503:
        print("⏳ Model is loading... This is normal for first request")
        print("   The model needs to be loaded into memory (can take 20-30 seconds)")
        return "loading"
    else:
        print(f"❌ Authenticated access failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def test_alternative_endpoints():
    """Test alternative ways to access FinBERT"""
    print("\n5. Testing alternative endpoints...")
    
    alternatives = [
        {
            "name": "FinBERT-tone (alternative)",
            "url": "https://api-inference.huggingface.co/models/yiyanghkust/finbert-tone",
            "desc": "Another popular FinBERT variant"
        },
        {
            "name": "DistilBERT Financial",
            "url": "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english",
            "desc": "Lighter alternative for sentiment"
        }
    ]
    
    test_text = "Oil prices surge on OPEC production cuts"
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    
    for alt in alternatives:
        print(f"\n   Testing {alt['name']}...")
        print(f"   Description: {alt['desc']}")
        
        response = requests.post(
            alt['url'],
            headers=headers,
            json={"inputs": test_text}
        )
        
        if response.status_code == 200:
            print(f"   ✅ Works! Status: {response.status_code}")
            result = response.json()
            print(f"   Sample result: {result[0] if isinstance(result, list) else result}")
        else:
            print(f"   ❌ Failed: {response.status_code}")

def main():
    print("Hugging Face FinBERT Troubleshooting")
    print("=" * 60)
    
    if not HF_TOKEN or HF_TOKEN == "hf_YOUR_NEW_TOKEN_HERE":
        print("❌ No Hugging Face token found!")
        print("\nTo fix this:")
        print("1. Go to https://huggingface.co/settings/tokens")
        print("2. Create a new token with 'read' access")
        print("3. Update HUGGING_FACE_TOKEN in your .env file")
        return
    
    print(f"Token: {HF_TOKEN[:10]}...{HF_TOKEN[-4:]}")
    
    # Run tests
    token_valid = check_token_validity()
    
    if token_valid:
        test_model_info()
        test_inference_api_direct()
        result = test_inference_api_with_token()
        
        if result == "loading":
            print("\n⏳ Waiting 30 seconds for model to load...")
            import time
            time.sleep(30)
            print("Retrying...")
            test_inference_api_with_token()
        
        test_alternative_endpoints()
    
    print("\n" + "=" * 60)
    print("Troubleshooting complete!")
    
    print("\nRecommendations:")
    if not token_valid:
        print("1. ❌ Your token appears to be invalid or revoked")
        print("   → Create a new token at https://huggingface.co/settings/tokens")
    else:
        print("1. ✅ Your token is valid")
        print("2. If the model is 'loading', this is normal - it takes 20-30 seconds on first use")
        print("3. Consider using the finbert-tone variant if ProsusAI/finbert has issues")

if __name__ == "__main__":
    main()
