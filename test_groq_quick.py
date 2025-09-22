#!/usr/bin/env python3
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

try:
    completion = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[{"role": "user", "content": "Say 'API Active' in 3 words"}],
        max_tokens=10,
        temperature=0
    )
    print(f"✅ GROQ API with GPT-OSS-120B-128k is ACTIVE!")
    print(f"Response: {completion.choices[0].message.content}")
except Exception as e:
    print(f"❌ Error: {e}")
