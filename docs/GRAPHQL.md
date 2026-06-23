# GraphQL Guide

GraphQL provides typed, flexible access to ingestion and sentiment queries.

- Endpoint: `POST /v1/graphql`
- Header: `X-Api-Key: <TENANT_API_KEY>`
- Content-Type: `application/json`

## Schema (high-level)
- Mutation
  - `ingestArticles(articles: [ArticleInput!]!): [AnalysisResult!]!`
- Query
  - `sentiment(ticker: String, topics: [String!], since: DateTime, until: DateTime, limit: Int, sort: String): [AnalysisResult!]!`

`ArticleInput` matches the Canonical Ingest Schema (docs/INGEST_SCHEMA.md). `AnalysisResult` typically contains:
- `id` (string?)
- `score` (float)
- `label` (string: positive|neutral|negative)
- `trigger_keywords` (string[])
- `insights` (string[])
- `drivers` (string[])
- `tickers` (string[])
- `time_published` (DateTime; returned as ISO‑8601 `Z`)

## Example: Ingest
```
mutation Ingest($articles: [ArticleInput!]!) {
  ingestArticles(articles: $articles) {
    id score label trigger_keywords insights drivers tickers time_published
  }
}
```
Variables:
```json
{
  "articles": [{
    "source": "platts",
    "source_id": "PLT-12345",
    "title": "OPEC discusses output adjustments",
    "tickers": ["CL=F"],
    "time_published": "2026-03-04T15:12:00Z"
  }]
}
```

## Example: Query sentiment
```
query Sentiment($ticker: String, $since: DateTime) {
  sentiment(ticker: $ticker, since: $since, limit: 100, sort: "time_desc") {
    id score label time_published trigger_keywords
  }
}
```
Variables:
```json
{ "ticker": "CL=F", "since": "2026-03-03T00:00:00Z" }
```

## Limits & Best Practices
- Timestamps must be UTC `Z`. Naive times are treated as UTC.
- Use pagination parameters (`limit`, `sort`).
- Query depth/complexity limits may apply in production deployments.
- Prefer persisted queries from public clients.