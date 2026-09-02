# REST Guide

Simple HTTP endpoints for ingestion and reading sentiment.

## Ingest Articles
- `POST /v1/ingest/articles`
- Headers: `Content-Type: application/json`, `X-Api-Key: <TENANT_API_KEY>`
- Body: single object or array of objects using the Canonical Ingest Schema (docs/INGEST_SCHEMA.md).

Example (single item):
```
curl -X POST https://api.integramarkets.app/v1/ingest/articles \
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
- Auth: `Authorization: Bearer <API_KEY>` (keys look like `ik_live_...`)
- Params:
  - `commodity` (required) — a stored entity name, **not** a futures ticker.
    Valid values: `oil`, `gas`, `gold`, `silver`, `uranium`, `wheat`, `corn`,
    `forex`, `bitcoin`, `macro`, `weather`. Call `GET /v1/commodities` for the
    live list. Tickers like `brent`, `wti`, `ng` and `CL=F` match nothing and
    return an empty 200.
  - `window` — one of `24h`, `7d`, `30d`, `90d` (default `7d`). Clamped to your
    tier's depth; `api_basic` is capped at 30 days.

```
curl "https://api.integramarkets.app/v1/sentiment?commodity=oil&window=7d" \
  -H "Authorization: Bearer $INTEGRA_API_KEY"
```

Response (200):
```json
{
  "commodity": "oil",
  "window": "7d",
  "score": 0.0191,
  "label": "neutral",
  "articles_analyzed": 176,
  "updated_at": "2026-09-02T15:58:01Z",
  "top_drivers": [
    {
      "headline": "Iran Dismisses Trump Claim of Kharg Attack as Hostilities Return",
      "source": "OilPrice.com",
      "sentiment": -0.904,
      "url": "https://oilprice.com/..."
    }
  ]
}
```

### Reading the numbers

`score` and `top_drivers[].sentiment` are **signed, -1..+1, 0 = neutral**.
Negative is bearish, positive is bullish. Labels use a ±0.15 band.

> **Changed 2026-09-02.** These fields previously carried a *confidence
> magnitude* rather than a direction, on a 0.5..1.0 scale. Bearish articles
> scored **higher** than bullish ones, so averaging the old field produced a
> value that rose as news worsened, and `label` could never return `bearish`.
> If you cached or persisted values from before this date, discard them.

## Bulk export

- `GET /v1/export/sentiment`
- Requires the `history` scope and an export-capable tier.
- Params: `commodity` (required), `from`, `to` (ISO-8601), `format` (`csv` | `xlsx`).

```
curl "https://api.integramarkets.app/v1/export/sentiment?commodity=oil&format=csv" \
  -H "Authorization: Bearer $INTEGRA_API_KEY" -o oil.csv
```

Columns:

| column | meaning |
|---|---|
| `published_at` | when the **article** was published. The time axis. |
| `commodity` | the stored entity name |
| `sentiment` | `bullish` / `bearish` / `neutral` |
| `sentiment_score` | **signed -1..+1**, 0 = neutral. The column to chart. |
| `confidence` | how sure the model was, 0.5..1.0. Non-directional. |
| `headline`, `source`, `url` | the article the row came from |
| `document_id` | stable internal id |
| `published_at_precision` | `exact`, or `crawl_estimate` where the date came from Internet Archive crawl time |
| `model_version` | which engine scored the row |

Response headers report the applied window and caps:
`X-Integra-Range-From`, `X-Integra-Range-To`, `X-Integra-Row-Limit`.

Rows are returned **oldest first**, so a truncated export is a contiguous period
rather than an arbitrary slice.

> Omitting `from`/`to` returns the last 30 days.
> Exports count against a monthly budget separate from the request quota.

## Jobs (async/batch)
- `GET /v1/jobs/{job_id}` → returns job status and results when ready.

## Errors & Limits
- 401: missing/invalid API key
- 403: insufficient scopes, or a window deeper than your tier allows
- 429: monthly request quota exhausted. `Retry-After` and `X-RateLimit-Reset`
  give the reset. **Do not retry** — the allowance resets at the start of the
  calendar month, not after a backoff.
- 501: endpoint accepted but not yet implemented (`/v1/historical/analogs`)
- 503: an upstream store is unavailable. Retry with backoff.

Successful responses carry `X-RateLimit-Limit`, `X-RateLimit-Remaining` and
`X-RateLimit-Reset`.

## Time & Sorting
- All times are normalized to UTC; responses return `Z` timestamps.
- Sorting uses impact score and then time; identical scores break by time.