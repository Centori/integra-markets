# Integra Markets SDKs

Generated from [`openapi.json`](../openapi.json) with
[openapi-generator](https://openapi-generator.tech) **7.22.0**.

| language | package | path |
|---|---|---|
| Python | `integra-markets` | [`python/`](python/) |
| TypeScript | `@integra-markets/sdk` | [`typescript/`](typescript/) |
| curl | — | see [`docs/REST.md`](../docs/REST.md) |

## Regenerating

The spec is **not** hand-written and it is **not** the app's raw `/openapi.json`.
It is built by filtering the live FastAPI schema down to the `/v1` surface:

```bash
curl -s https://api.integramarkets.app/openapi.json -o live_openapi.json
python3 scripts/build_openapi_spec.py          # writes openapi.json

npx @openapitools/openapi-generator-cli@2.20.0 generate \
  -i openapi.json -g python -o sdk/python \
  --package-name integra_markets \
  --additional-properties=packageVersion=1.0.0,projectName=integra-markets

npx @openapitools/openapi-generator-cli@2.20.0 generate \
  -i openapi.json -g typescript-fetch -o sdk/typescript \
  --additional-properties=npmName=@integra-markets/sdk,npmVersion=1.0.0,supportsES6=true
```

**Why filtered.** The live app serves 61 paths, most of them internal —
`/kalshi/*` trades against Integra's own account, `/api/stripe/*` and
`/api/subscriptions/webhook` move money and entitlements. Generating a customer
SDK from all of them would hand every API subscriber typed client methods for
placing Kalshi orders. The published spec is the 15 `/v1` endpoints a customer
actually buys.

**Why operation IDs are pinned.** FastAPI derives them from the function name
plus the route, which produced `sentiment_v1_sentiment_get`. The generator turns
those verbatim into method names, and once customers write against them they
cannot change. `scripts/build_openapi_spec.py` pins all 15 so the ergonomics are
a decision rather than an artefact.

## Quickstart

```python
from integra_markets import ApiClient, Configuration
from integra_markets.api.public_v1_api import PublicV1Api

cfg = Configuration(host="https://api.integramarkets.app")
cfg.access_token = "ik_live_..."          # dashboard.integramarkets.app/account/api

api = PublicV1Api(ApiClient(cfg))
print(api.get_sentiment(commodity="oil", window="7d"))
```

```ts
import { Configuration, PublicV1Api } from "@integra-markets/sdk";

const api = new PublicV1Api(new Configuration({
  basePath: "https://api.integramarkets.app",
  accessToken: "ik_live_...",
}));
console.log(await api.getSentiment({ commodity: "oil", window: "7d" }));
```

## Reading the numbers

`sentiment_score` is **signed, −1..+1, 0 = neutral** — that is the field to
chart. `confidence` is a separate magnitude and is **not** directional.

Before 2026-09-02 the API exposed the confidence value under the name `score`;
bearish articles scored *higher* than bullish ones, so any values cached from
before that date must be discarded.

Valid `commodity` values are the stored entity names — `oil`, `gas`, `gold`,
`silver`, `uranium`, `wheat`, `corn`, `forex`, `bitcoin`, `macro`, `weather`.
Call `list_commodities()` for the live list. Futures tickers (`brent`, `wti`,
`ng`, `CL=F`) match nothing and return an empty 200.
