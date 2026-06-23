# Quickstart

This quickstart shows how to ingest your own articles/events and retrieve sentiment using REST or GraphQL. Follow these steps:

## 1) Get an API Key
- In the Integra Markets dashboard, open Developer → API Keys and create a key.
- Copy the key once; you won’t be able to view it again. Use it in the `X-Api-Key` header.

## 2) Choose REST or GraphQL
- REST is simple for ingestion and basic reads.
- GraphQL is flexible for complex filters and aggregates.

## 3) Ingest via REST
```
curl -X POST https://api.yourdomain.com/v1/ingest/articles \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: <TENANT_API_KEY>" \
  -d '{
    "source": "platts",
    "source_id": "PLT-12345",
    "title": "OPEC discusses output adjustments",
    "summary": "Delegates signal cautious approach",
    "tickers": ["CL=F","XOM"],
    "topics": ["Energy","OPEC"],
    "time_published": "2026-03-04T15:12:00Z",
    "url": "https://example.com/story"
  }'
```
- Required: `time_published` (UTC ISO‑8601 with `Z`) and at least one of `title`, `summary`, or `body`.
- Recommended: `tickers` and/or `topics` for better routing.

## 4) Read sentiment via REST
```
curl "https://api.yourdomain.com/v1/sentiment?ticker=CL=F&limit=50" \
  -H "X-Api-Key: <TENANT_API_KEY>"
```

## 5) Ingest via GraphQL
```
POST https://api.yourdomain.com/v1/graphql

mutation Ingest($articles: [ArticleInput!]!) {
  ingestArticles(articles: $articles) {
    id score label trigger_keywords insights drivers tickers time_published
  }
}

Variables:
{
  "articles": [{
    "source": "bloomberg",
    "source_id": "BBG_ABC_123",
    "title": "Energy markets move on OPEC rumors",
    "tickers": ["CL=F"],
    "time_published": "2026-03-04T15:12:00Z"
  }]
}
```

## 6) Query via GraphQL
```
query Sentiment($ticker: String, $since: DateTime) {
  sentiment(ticker: $ticker, since: $since, limit: 100, sort: "time_desc") {
    id score label time_published trigger_keywords
  }
}
```

## 7) Time & Idempotency
- Always send UTC (`Z`) timestamps; naive datetimes are treated as UTC.
- Use `Idempotency-Key` header for ingestion to safely retry without duplicates.

## 8) Next Steps
- See docs/INGEST_SCHEMA.md for all fields.
- Use SDKs (Python/TypeScript) to simplify integration: docs/SDKs.md.
- Register a webhook for async results: docs/WEBHOOKS.md.