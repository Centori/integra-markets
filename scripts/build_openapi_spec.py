"""Build the customer-facing OpenAPI spec from the live FastAPI schema.

Why filtered rather than a straight copy of /openapi.json
--------------------------------------------------------
The live app serves 61 paths. Most are internal: /kalshi/* (trading against
Integra's own account), /api/stripe/*, /api/subscriptions/webhook, /health.
Generating a customer SDK from all of them would hand every API subscriber typed
client methods for placing Kalshi orders and firing subscription webhooks.

So the published spec is the /v1 surface only — the endpoints an API customer
actually buys. Account-management endpoints (/api/keys) are deliberately out
too: they authenticate with a Supabase JWT, not an API key, so they belong to
the dashboard rather than to a key-holding client.

The previously committed openapi.json described neither: 29 paths, ZERO under
/v1, plus 21 routes that no longer exist at all (/ai/analyze, /api/lexicon/*).
Both SDKs were generated from it, which is why neither had a single method for
the product being sold.
"""
import json
import re
import sys

LIVE = "live_openapi.json"
OUT = "openapi.json"

spec = json.load(open(LIVE))

paths = {p: v for p, v in spec.get("paths", {}).items() if p.startswith("/v1")}
if not paths:
    sys.exit("no /v1 paths in the live spec — refusing to write an empty API")

# Walk $refs transitively so only schemas the /v1 surface actually uses survive.
all_schemas = spec.get("components", {}).get("schemas", {})
needed: set[str] = set()


def walk(node) -> None:
    if isinstance(node, dict):
        ref = node.get("$ref")
        if isinstance(ref, str):
            m = re.match(r"#/components/schemas/(.+)$", ref)
            if m and m.group(1) not in needed:
                needed.add(m.group(1))
                walk(all_schemas.get(m.group(1), {}))
        for v in node.values():
            walk(v)
    elif isinstance(node, list):
        for v in node:
            walk(v)


walk(paths)


# Clean, stable method names.
#
# FastAPI derives operationId from the function name plus the route, giving
# `sentiment_v1_sentiment_get` and `export_sentiment_v1_export_sentiment_get`.
# The generator turns those verbatim into SDK method names, and once a customer
# writes code against them they cannot be changed without breaking that code.
# Pinning them here makes the ergonomics a deliberate choice rather than an
# artefact of how a Python function happened to be named.
OPERATION_IDS = {
    ("/v1/sentiment", "get"): "get_sentiment",
    ("/v1/sentiment/{commodity}/now", "get"): "get_sentiment_now",
    ("/v1/sentiment/{commodity}/history", "get"): "get_sentiment_history",
    ("/v1/sentiment/{commodity}/daily", "get"): "get_sentiment_daily",
    ("/v1/commodities", "get"): "list_commodities",
    ("/v1/narratives", "get"): "get_narratives",
    ("/v1/brief", "get"): "get_brief",
    ("/v1/export/sentiment", "get"): "export_sentiment",
    ("/v1/topics", "get"): "list_topics",
    ("/v1/markets/divergence", "get"): "get_divergence",
    ("/v1/markets/divergence/{topic}", "get"): "get_divergence_for_topic",
    ("/v1/markets/overlay", "get"): "get_market_overlay",
    ("/v1/historical/analogs", "get"): "find_historical_analogs",
    ("/v1/agent/templates", "get"): "list_agent_templates",
    ("/v1/agent/ask", "post"): "ask_agent",
}

renamed = 0
for path, ops in paths.items():
    for method, op in ops.items():
        if not isinstance(op, dict):
            continue
        new_id = OPERATION_IDS.get((path, method.lower()))
        if new_id:
            op["operationId"] = new_id
            renamed += 1
print(f"pinned {renamed} operationIds")

out = {
    "openapi": spec.get("openapi", "3.1.0"),
    "info": {
        "title": "Integra Markets API",
        "version": "1.0.0",
        "description": (
            "Commodity news sentiment, narratives and prediction-market divergence.\n\n"
            "Authenticate with `Authorization: Bearer <api_key>`; keys look like "
            "`ik_live_...` and are created at "
            "https://dashboard.integramarkets.app/account/api\n\n"
            "**`sentiment_score` is signed, -1..+1, 0 = neutral** — that is the field to "
            "chart. `confidence` is a separate magnitude and is NOT directional. Before "
            "2026-09-02 the API exposed the confidence value under the name `score`; "
            "bearish rows scored higher than bullish ones, so any cached values from "
            "before that date must be discarded."
        ),
    },
    "servers": [{"url": "https://api.integramarkets.app"}],
    "paths": paths,
    "components": {
        "schemas": {k: all_schemas[k] for k in sorted(needed) if k in all_schemas},
        "securitySchemes": {
            "ApiKeyAuth": {
                "type": "http",
                "scheme": "bearer",
                "description": "An Integra API key, e.g. ik_live_...",
            }
        },
    },
    "security": [{"ApiKeyAuth": []}],
}

json.dump(out, open(OUT, "w"), indent=2)
print(f"wrote {OUT}")
print(f"  paths:   {len(paths)}")
print(f"  schemas: {len(out['components']['schemas'])}")
for p in sorted(paths):
    print("   ", p)
