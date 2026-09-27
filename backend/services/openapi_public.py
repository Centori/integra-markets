"""Filter the live FastAPI schema down to the surface a customer buys.

The problem
-----------
`GET https://api.integramarkets.app/openapi.json` served **66 paths**, 23 of
them internal: `/kalshi/markets/{ticker}/orderbook` and the rest of the
trading surface for Integra's own account, `/api/stripe/*`, and
`/api/subscriptions/webhook`. Anyone who found the spec — which is the first
thing a developer looks for, and the thing an SDK generator or an LLM is
pointed at — got a typed description of how to place Kalshi orders.

Meanwhile the *correct* customer spec existed. `scripts/build_openapi_spec.py`
produced it, filtered to `/v1`, and the result was committed at the repo root
and **served nowhere**. So the reachable spec was the wrong one and the right
one was unreachable.

The fix
-------
The filter moves out of the script and into the app, so `/openapi.json` and
`/docs` describe the paid surface and nothing else. The script now imports this
module rather than reimplementing it — the two had to agree about operation IDs
and the security scheme name, and "had to agree" between a runtime path and a
build script is a drift waiting to happen.

This changes documentation only. Filtering a path out of the spec does not
unregister the route; internal endpoints keep working exactly as before and are
still protected by their own auth. What changes is that we stop advertising
them.

The full schema is still available for debugging at `/internal/openapi.json`,
off unless `INTEGRA_INTERNAL_OPENAPI=1`.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, Set

logger = logging.getLogger(__name__)

# The paid surface. Matches scripts/build_openapi_spec.py's original filter.
#
# Account management (/api/keys) is deliberately excluded even though customers
# use it: those endpoints authenticate with a Supabase JWT rather than an API
# key, so they belong to the dashboard, not to a key-holding client. A generated
# client with a `create_key` method that cannot authenticate is worse than no
# method at all.
PUBLIC_PREFIX = "/v1"

_SCHEMA_REF = re.compile(r"^#/components/schemas/(.+)$")

# Stable, human method names.
#
# FastAPI derives operationId from the function name plus the route, giving
# `sentiment_v1_sentiment_get`. Generators turn those verbatim into method
# names, and once a customer writes code against one it cannot be changed
# without breaking them. Pinning makes the ergonomics deliberate.
#
# find_historical_analogs is listed but its endpoint returns 501 until the
# archive backfill lands. Kept so the name is reserved and does not get taken by
# something else; the endpoint's own response is what tells a caller it is not
# ready.
OPERATION_IDS: Dict[tuple, str] = {
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

API_TITLE = "Integra Markets API"
API_VERSION = "1.0.0"
API_SERVER = "https://api.integramarkets.app"

API_DESCRIPTION = (
    "Commodity news sentiment, narratives and prediction-market divergence.\n\n"
    "Authenticate with `Authorization: Bearer <api_key>`; keys look like "
    "`ik_live_...` and are created at "
    "https://dashboard.integramarkets.app/account/api\n\n"
    "**`sentiment_score` is signed, -1..+1, 0 = neutral** — that is the field to "
    "chart. `confidence` is a separate magnitude and is NOT directional. Before "
    "2026-09-02 the API exposed the confidence value under the name `score`; "
    "bearish rows scored higher than bullish ones, so any cached values from "
    "before that date must be discarded.\n\n"
    "Rate limits are per key and are reported on every response as "
    "`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Rate` and "
    "`X-RateLimit-Reset`. A 429 carries `Retry-After` in seconds — honour it "
    "rather than retrying immediately, because both a monthly allowance and a "
    "per-second rate are enforced. Your plan's actual numbers are at "
    "https://dashboard.integramarkets.app/account/usage\n\n"
    "List endpoints paginate with an opaque `cursor`: when a response carries "
    "`has_more: true` it also carries `next_cursor`, which you pass back as "
    "`?cursor=`. Do not construct or parse cursors."
)


def _collect_schema_refs(node: Any, all_schemas: Dict[str, Any], needed: Set[str]) -> None:
    """Walk $refs transitively so only reachable schemas survive the filter."""
    if isinstance(node, dict):
        ref = node.get("$ref")
        if isinstance(ref, str):
            match = _SCHEMA_REF.match(ref)
            if match and match.group(1) not in needed:
                needed.add(match.group(1))
                _collect_schema_refs(all_schemas.get(match.group(1), {}), all_schemas, needed)
        for value in node.values():
            _collect_schema_refs(value, all_schemas, needed)
    elif isinstance(node, list):
        for value in node:
            _collect_schema_refs(value, all_schemas, needed)


def filter_to_public(spec: Dict[str, Any]) -> Dict[str, Any]:
    """Return a new spec containing only the public API surface.

    Raises ValueError if the filter would produce an empty API — that means the
    prefix stopped matching (a router remount, a version bump) and publishing an
    empty spec would tell every customer the product has no endpoints.
    """
    paths = {
        path: item
        for path, item in (spec.get("paths") or {}).items()
        if path.startswith(PUBLIC_PREFIX)
    }
    if not paths:
        raise ValueError(
            f"no {PUBLIC_PREFIX} paths in the schema — refusing to publish an "
            f"empty API. Has the public router been remounted?"
        )

    all_schemas = (spec.get("components") or {}).get("schemas") or {}
    needed: Set[str] = set()
    _collect_schema_refs(paths, all_schemas, needed)

    for path, operations in paths.items():
        for method, operation in operations.items():
            if not isinstance(operation, dict):
                continue
            pinned = OPERATION_IDS.get((path, method.lower()))
            if pinned:
                operation["operationId"] = pinned

    dropped = len(spec.get("paths") or {}) - len(paths)
    logger.info(
        "openapi: published %d public paths, withheld %d internal ones",
        len(paths), dropped,
    )

    return {
        "openapi": spec.get("openapi", "3.1.0"),
        "info": {
            "title": API_TITLE,
            "version": API_VERSION,
            "description": API_DESCRIPTION,
        },
        "servers": [{"url": API_SERVER}],
        "paths": paths,
        # securitySchemes are added by openapi_security.apply_security, which
        # owns the scheme name. Two definitions of one scheme produce generated
        # clients that disagree about which credential they are sending.
        "components": {
            "schemas": {k: all_schemas[k] for k in sorted(needed) if k in all_schemas},
        },
    }
