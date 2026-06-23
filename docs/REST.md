# REST Guide

Simple HTTP endpoints for ingestion and reading sentiment.

## Ingest Articles
- `POST /v1/ingest/articles`
- Headers: `Content-Type: application/json`, `X-Api-Key: <TENANT_API_KEY>`
- Body: single object or array of objects using the Canonical Ingest Schema (docs/INGEST_SCHEMA.md).

Example (single item):
```
curl -X POST https://api.yourdomain.com/v1/ingest/articles \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: <TENANT_API_KEY>" \
  -H "Idempotency-Key: BBG_ABC_123" \
  -d '{
    "source": "bloomberg",
    "source_id": "BBG_ABC_123",
    "title": "Energy markets move on OPEC rumors",
    "tickers": ["CL=F"],
    "time_published": "2026-03-04T15:12:00Z"
  }'
```
Response (200):
```json
{
  "id": "BBG_ABC_123",
  "score": 0.62,
  "label": "positive",
  "trigger_keywords": ["OPEC","output"],
  "insights": ["Potential tightening supports prices"],
  "drivers": ["Supply","Cartel policy"],
  "tickers": ["CL=F"],
  "time_published": "2026-03-04T15:12:00Z"
}
```
- If you post an array, the response is an array of `AnalysisResult`.
- Items with unparseable timestamps are skipped.

## Query Sentiment
- `GET /v1/sentiment`
- Params:
  - `ticker` (string)
  - `topics` (comma‑separated)
  - `since` (ISO‑8601 `Z`)
  - `until` (ISO‑8601 `Z`)
  - `limit` (default 100, max may apply)
  - `sort` (`time_desc` | `time_asc` | implementation‑specific)

Example:
```
curl "https://api.yourdomain.com/v1/sentiment?ticker=CL=F&since=2026-03-03T00:00:00Z&limit=50" \
  -H "X-Api-Key: <TENANT_API_KEY>"
```

## Jobs (async/batch)
- `GET /v1/jobs/{job_id}` → returns job status and results when ready.

## Errors & Limits
- 401: missing/invalid API key
- 403: insufficient scopes
- 429: rate limit exceeded (see `Retry-After`)
- 5xx: transient server errors; use exponential backoff with jitter

## Time & Sorting
- All times are normalized to UTC; responses return `Z` timestamps.
- Sorting uses impact score and then time; identical scores break by time.