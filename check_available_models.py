#!/usr/bin/env python3
"""
Check available Groq models
"""
import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Updated list of potentially available models as of 2025
models_to_test = [
    # Llama 3.3 models
    "llama-3.3-70b-versatile",
    "llama-3.3-70b-specdec",
    
    # Llama 3.2 models
    "llama-3.2-90b-text-preview",
    "llama-3.2-11b-text-preview",
    "llama-3.2-3b-preview",
    "llama-3.2-1b-preview",
    
    # Llama 3.1 models
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    
    # Mixtral models
    "mixtral-8x22b-32768",
    "mixtral-8x7b-32768",
    
    # Gemma models
    "gemma2-9b-it",
    "gemma-7b-it",
    
    # Other models
    "llama3-groq-70b-8192-tool-use-preview",
    "llama3-groq-8b-8192-tool-use-preview",
]

print("Testing available Groq models...\n")
print("=" * 60)

available_models = []
for model_id in models_to_test:
    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": "Hi"}],
            model=model_id,
            max_tokens=1,
            temperature=0
        )
        print(f"✓ {model_id}: Available")
        available_models.append(model_id)
    except Exception as e:
        error_msg = str(e)
        if "decommissioned" in error_msg:
            print(f"❌ {model_id}: Decommissioned")
        elif "not found" in error_msg.lower():
            print(f"❌ {model_id}: Not found")
        else:
            # Don't print full error, just status
            print(f"❌ {model_id}: Not available")

print("\n" + "=" * 60)
print(f"\nAvailable models ({len(available_models)}):")
for model in available_models:
    print(f"  - {model}")

if available_models:
    print(f"\n✓ Recommended model to use: {available_models[0]}")
    
    # Test the recommended model
    print(f"\nTesting {available_models[0]} with a sample query...")
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a commodities market analyst."},
                {"role": "user", "content": "What affects oil prices? (one sentence)"}
            ],
            model=available_models[0],
            max_tokens=50,
            temperature=0.7
        )
        print(f"Response: {response.choices[0].message.content}")
    except Exception as e:
        print(f"Error: {e}")
else:
    print("\n⚠️  No models are currently available. Please check your API key.")
