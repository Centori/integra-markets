# Serverless Sentiment Analysis for Integra Markets

This document explains the serverless approach for sentiment analysis that requires no hosting.

## Overview

Instead of hosting heavy ML models (FinBERT ~400MB), we use:
- **Hugging Face Inference API** for FinBERT sentiment analysis
- **Local NLTK VADER** for lightweight sentiment (only 3MB)
- **Result caching** to minimize API calls

## Benefits

1. **No hosting required** - All heavy computation happens on HF servers
2. **Free tier: 30,000 requests/month** - Plenty for MVP
3. **No memory issues** - API calls use minimal RAM
4. **Fast startup** - No model loading delays
5. **Always up-to-date** - HF maintains the models

## Setup

1. **Get a Hugging Face token**:
   - Sign up at https://huggingface.co
   - Go to Settings → Access Tokens
   - Create a new token with "read" permissions

2. **Add to your .env file**:
   ```env
   HUGGING_FACE_TOKEN=hf_your_token_here
   ```

3. **Install lightweight dependencies**:
   ```bash
   pip install -r app/requirements-light.txt
   ```

## Usage

The API works exactly the same as before:

```python
from app.services.finbert import analyze_financial_text

# Analyze sentiment
result = analyze_financial_text("Oil prices surge on OPEC cuts")
print(result)
# {'bullish': 0.85, 'bearish': 0.10, 'neutral': 0.05, 'sentiment': 'BULLISH', 'confidence': 0.85}
```

## API Limits

- **Free tier**: 30,000 requests/month
- **Rate limit**: ~1000 requests/hour
- **Text limit**: 2048 characters per request

## Cost Breakdown

| Users/Day | API Calls/Day | Monthly Calls | Status |
|-----------|---------------|---------------|---------|
| 50        | 500           | 15,000        | ✅ Free tier |
| 100       | 1,000         | 30,000        | ✅ Free tier limit |
| 200       | 2,000         | 60,000        | 💰 Need paid plan ($9/month) |

## Caching Strategy

To maximize free tier usage:
1. Results are cached in memory (LRU cache)
2. Common queries return instantly
3. Cache size: 100 most recent analyses

## Fallback Strategy

If API fails or limits are reached:
1. VADER sentiment provides basic analysis
2. Cached results are returned when available
3. Neutral sentiment returned as last resort

## Testing

Run the test script to verify everything works:

```bash
python test_finbert_api.py
```

## Migration Path

When you're ready to scale:
1. **Option 1**: Upgrade HF plan ($9/month for 1M requests)
2. **Option 2**: Deploy own models on GPU server
3. **Option 3**: Use AWS Comprehend or Google NLP

## Security Notes

- Never commit your HF token to git
- Token is read-only (can't modify models)
- API calls are HTTPS encrypted

## Monitoring

Track your usage at:
https://huggingface.co/settings/billing/usage

## Architecture

```
React Native App
       ↓
   Your API
       ↓
┌─────────────┐     ┌──────────────────┐
│ VADER       │     │ HF Inference API │
│ (Local)     │     │ (FinBERT Cloud)  │
└─────────────┘     └──────────────────┘
```

This serverless approach lets you launch your MVP with zero infrastructure costs!
