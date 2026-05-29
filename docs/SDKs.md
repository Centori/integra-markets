# SDK Quickstarts

Lightweight SDKs make it easy to ingest and query sentiment. Until packages are published, you can integrate via REST/GraphQL directly (see Quickstart). The snippets below illustrate the planned SDKs.

## Python (planned: `integra-markets-sdk`)
```python
from datetime import datetime, timezone
from integra_sdk.client import IntegraClient, ArticleInput

client = IntegraClient(api_key="sk_live_xxx", base_url="https://api.yourdomain.com")

# Ingest
res = client.ingest_articles([
    ArticleInput(
        source="platts",
        title="OPEC discusses output",
        summary="Delegates signal cautious approach",
        tickers=["CL=F","XOM"],
        time_published=datetime.now(timezone.utc),
    )
])
print(res[0].score, res[0].label)

# Query
recent = client.sentiment(ticker="CL=F", limit=50)
for r in recent:
    print(r.time_published, r.score, r.label)
```

## TypeScript (planned: `@integra/markets-sdk`)
```ts
import { IntegraClient } from "@integra/markets-sdk";

const client = new IntegraClient({ apiKey: process.env.INTEGRA_API_KEY!, baseUrl: "https://api.yourdomain.com" });

await client.ingestArticles([{ 
  source: "bloomberg", 
  time_published: new Date().toISOString(), 
  title: "Energy markets move on OPEC rumors", 
  tickers: ["CL=F"]
}]);

const items = await client.sentiment({ ticker: "CL=F", limit: 50 });
console.log(items[0].score, items[0].label);
```

## Notes
- Timestamps: always send/receive ISO‑8601 `Z` (UTC). Naive times are treated as UTC.
- Retries: clients should retry on 429/5xx with exponential backoff.
- Idempotency: provide `Idempotency-Key` on ingest to avoid duplicates.