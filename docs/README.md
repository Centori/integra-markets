# Integra Markets API Docs

Welcome to the Integra Markets developer documentation. This guide explains how to use the sentiment pipeline from your own data sources via REST or GraphQL, how to authenticate with API keys, and how to consume results via queries, webhooks, or SDKs.

## Contents
- Quickstart: docs/QUICKSTART.md
- Authentication & API Keys: docs/AUTH.md
- Canonical Ingest Schema: docs/INGEST_SCHEMA.md
- GraphQL Guide: docs/GRAPHQL.md
- REST Guide: docs/REST.md
- SDK Quickstarts (Python & TypeScript): docs/SDKs.md
- Webhooks & Streaming: docs/WEBHOOKS.md
- Rate Limits & Quotas: docs/LIMITS.md
- Pricing & Plans (proposal): docs/PRICING.md

## Endpoints (default)
- GraphQL: `/v1/graphql`
- REST Ingest: `POST /v1/ingest/articles` (accepts single item or array)
- REST Query: `GET /v1/sentiment` (filters by ticker/topics/time)
- Jobs: `GET /v1/jobs/{job_id}` (for async/batch)

All times are UTC; ISO‑8601 with `Z` is required in requests and returned in responses.

## Notes
- If you license third‑party feeds (e.g., Bloomberg/Platts), bring your own keys and either push content to our ingest endpoint or run the on‑prem forwarder that posts normalized items to Integra. We recommend storing only derived metrics by default.
- Some features (GraphQL, SDKs) may be disabled in specific deployments until enabled by your admin.