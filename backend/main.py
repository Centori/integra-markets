from fastapi import FastAPI
import os
from supabase import create_client, Client

app = FastAPI()

# Get Supabase URL and Key from environment variables
supabase_url: str = os.getenv("SUPABASE_URL")
supabase_key: str = os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

@app.get('/')
def read_root():
    return {"Hello": "World"}

@app.post('/analyze-sentiment')
def analyze_sentiment(data: dict):
    text = data.get('text')
    if not text:
        return {"error": "No text provided"}
    # Here you would use your NLTK and FinBERT models to analyze
    # Since this is an example, we'll just return mock data
    return {
        "text": text,
        "sentiment": "positive",
        "confidence": 0.98
    }
