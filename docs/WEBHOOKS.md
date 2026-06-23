# Webhooks & Streaming

Receive results asynchronously via webhooks or subscribe to a real‑time stream.

## Webhooks
### Register
- Dashboard: Developer → Webhooks → set `webhook_url` and `signing_secret`.
- Programmatic registration may be available depending on deployment.

### Delivery
- Method: `POST` to your `webhook_url`
- Headers: `Content-Type: application/json`, `X-Signature: <hex sha256 hmac>` (if enabled)
- Body:
```json
{
  "event": "analysis.completed",
  "tenant_id": "...",
  "pipeline_version": "v1",
  "data": {
    "id": "PLT-12345",
    "score": 0.62,
    "label": "positive",
    "trigger_keywords": ["OPEC","output"],
    "insights": ["Potential tightening supports prices"],
    "drivers": ["Supply","Cartel policy"],
    "tickers": ["CL=F","XOM"],
    "time_published": "2026-03-04T15:12:00Z"
  },
  "delivered_at": "2026-03-04T15:12:01Z"
}
```

### Retries
- Exponential backoff with jitter on non‑2xx; deliveries are retried a limited number of times.
- Use idempotent processing on your side.

## Streaming (optional)
- SSE: `GET /v1/stream/sentiment` returns server‑sent events.
- Each event includes a compact `AnalysisResult`.
- Authenticate with `X-Api-Key` header.

## Security
- Validate HMAC signatures if enabled.
- Only expose your webhook endpoint over HTTPS and restrict IPs if feasible.