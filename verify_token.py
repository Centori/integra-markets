#!/usr/bin/env python3
"""
Simple token verification
"""
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get token
token = os.getenv("HUGGING_FACE_TOKEN")

print("Token Verification")
print("=" * 60)
print(f"Token from .env: '{token}'")
print(f"Token length: {len(token) if token else 0}")
print(f"Token starts with 'hf_': {token.startswith('hf_') if token else False}")
print(f"First 10 chars: {token[:10] if token else 'None'}")
print(f"Last 4 chars: {token[-4:] if token else 'None'}")

# Try a simple API call
print("\nTesting API call...")
headers = {"Authorization": f"Bearer {token}"}
response = requests.get("https://huggingface.co/api/whoami", headers=headers)

print(f"Status code: {response.status_code}")
print(f"Response: {response.text[:200]}")

# Also try without Bearer prefix (some APIs accept this)
print("\nTrying without Bearer prefix...")
headers2 = {"Authorization": token}
response2 = requests.get("https://huggingface.co/api/whoami", headers=headers2)
print(f"Status code: {response2.status_code}")

# Try the inference API directly
print("\nTrying inference API...")
response3 = requests.post(
    "https://api-inference.huggingface.co/models/ProsusAI/finbert",
    headers={"Authorization": f"Bearer {token}"},
    json={"inputs": "Test"}
)
print(f"Inference API status: {response3.status_code}")
print(f"Response: {response3.text[:200]}")
