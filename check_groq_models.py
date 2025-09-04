#!/usr/bin/env python3
"""
Check available GROQ models
"""
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# List available models
try:
    models = client.models.list()
    print("\n🤖 Available GROQ Models:\n" + "="*50)
    for model in models.data:
        if model.active:
            print(f"✓ {model.id}")
            print(f"  - Context: {model.context_window} tokens")
            print(f"  - Created by: {model.owned_by}")
            print()
except Exception as e:
    print(f"Error: {e}")
