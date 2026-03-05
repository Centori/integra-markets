# Rate Limits & Quotas

Limits protect service stability and enable predictable usage. Actual values may vary by plan or deployment.

## Default Rate Limits (per API key)
- Ingest: 120 requests per minute
- Read/Query: 300 requests per minute
- Bursts may be allowed within a short window.

Headers (if enabled):
- `X-RateLimit-Limit`: total allowed in the window
- `X-RateLimit-Remaining`: remaining in the window
- `Retry-After`: seconds until you may retry

## Quotas (per tenant / monthly)
- Articles processed: plan‑based quota (e.g., 100k / 1M / 3M)
- Connectors: max active vendor connectors by plan
- Seats: team members with dashboard access

When a quota is exceeded, the service may return `429 Too Many Requests` or defer processing to the next period.

## Best Practices
- Use idempotency for ingestion to enable safe retries.
- Implement exponential backoff with jitter for 429/5xx.
- Monitor usage via the dashboard’s Developer → Usage page.