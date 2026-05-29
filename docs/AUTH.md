# Authentication & API Keys

All API calls require an API key in the `X-Api-Key` header. Keys are scoped to a tenant and can be rotated at any time.

## Creating & Managing Keys
- In the dashboard, open Developer → API Keys.
- Create a key and copy it once; only a short prefix is shown afterward.
- You can revoke or rotate keys without downtime (keep multiple active during migration).

## Using Your Key
```
X-Api-Key: sk_live_...redacted...
```
- Send the header with every REST and GraphQL request.
- Responses may include rate‑limit headers (e.g., `X-RateLimit-Remaining`).

## Optional: HMAC Request Signing
For sensitive ingestion, you can enable payload signing.
- Provision a `signing_secret` in the dashboard.
- Compute `sha256` HMAC of the raw request body and send:
```
X-Signature: <hex sha256 hmac>
```
- The server verifies and rejects mismatches.

## Idempotency
To safely retry ingestion without creating duplicates, include:
```
Idempotency-Key: <unique id per request>
```
- Recommended sources: `source+source_id` or hash of `title + time_published`.

## Scopes (optional)
Keys may carry scopes such as `ingest` and `read`. If enabled, requests missing required scopes will be rejected with 403.