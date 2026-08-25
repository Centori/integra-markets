"""Declare how the public API authenticates, in the published spec.

The /v1 surface is gated by `services.api_key_auth.verify_api_key`, which reads
a plain `Authorization: Bearer <key>` header. Because that dependency is
declared with `Header()` rather than one of `fastapi.security`'s classes,
FastAPI documents it as an ordinary string parameter and emits no
`securitySchemes` at all -- the live spec on 2026-08-25 carried 14 /v1 paths
and zero security blocks.

That is not cosmetic. An SDK generated from such a spec has no way to send the
key, on precisely the endpoints customers pay for, which is why neither
`integra_markets` nor `@integra-markets/sdk` can call them.

This is applied as a post-processing step rather than by swapping the
dependency for `HTTPBearer`, deliberately. `HTTPBearer(auto_error=True)` would
replace the 401 bodies ("missing or malformed API key", "invalid API key",
"API key expired; generate a new one in the dashboard") with a generic "Not
authenticated", changing the observable behaviour of a live API. Here the
runtime path is untouched and only the published contract changes.

Lives in its own module so it is testable without importing `main`, which
pulls in supabase, torch and the background scheduler.
"""

from __future__ import annotations

import logging
from typing import Any, Callable, Dict

logger = logging.getLogger(__name__)

PUBLIC_API_TAG = "public-v1"
PUBLIC_API_PREFIX = "/v1/"

SECURITY_SCHEME_NAME = "ApiKeyBearer"

SECURITY_SCHEMES: Dict[str, Dict[str, Any]] = {
    SECURITY_SCHEME_NAME: {
        "type": "http",
        "scheme": "bearer",
        "description": (
            "Integra API key, sent as `Authorization: Bearer <key>`. Keys are "
            "issued per account and carry the scopes of the subscription that "
            "created them; a request with a valid key but no active entitlement "
            "receives 403 rather than 401. Manage keys at "
            "https://dashboard.integramarkets.app/account/api"
        ),
    }
}

_HTTP_METHODS = ("get", "post", "put", "patch", "delete", "head", "options")


def _is_public_api(path: str, operation: Dict[str, Any]) -> bool:
    """Whether this operation is part of the key-gated public API.

    Keyed on the path prefix, not only the tag. The `public-v1` tag covers just
    4 of the 14 live /v1 operations -- the rest are tagged by subject
    (`divergence`, `agent`, `sentiment-history`, `market-sentiment`), so tag
    alone would leave ten paying endpoints documented as unauthenticated.

    The prefix is the real contract: every /v1 path was probed on 2026-08-25
    and all thirteen returned 401 without a key. The tag is kept as a second
    trigger so a future public route outside /v1 can opt in by tagging.
    """
    return path.startswith(PUBLIC_API_PREFIX) or PUBLIC_API_TAG in (
        operation.get("tags") or []
    )


def apply_security(schema: Dict[str, Any]) -> Dict[str, Any]:
    """Add the API-key scheme and attach it to every public-API operation.

    Mutates and returns `schema`. Attaching per-operation rather than setting a
    document-level `security` block is deliberate: a global block would mark
    /health and the mobile endpoints as authenticated too, and generated
    clients would then demand a key to call endpoints that take none.
    """
    (
        schema
        .setdefault("components", {})
        .setdefault("securitySchemes", {})
        .update(SECURITY_SCHEMES)
    )

    tagged = 0
    for path, path_item in (schema.get("paths") or {}).items():
        for method, operation in path_item.items():
            if method.lower() not in _HTTP_METHODS or not isinstance(operation, dict):
                continue
            if _is_public_api(path, operation):
                operation["security"] = [{SECURITY_SCHEME_NAME: []}]
                tagged += 1

    logger.info(
        "openapi: declared %s on %d %s operations",
        SECURITY_SCHEME_NAME, tagged, PUBLIC_API_TAG,
    )
    return schema


def build_schema(app, get_openapi: Callable[..., Dict[str, Any]]) -> Dict[str, Any]:
    """`app.openapi` replacement: the generated schema, plus security."""
    if getattr(app, "openapi_schema", None):
        return app.openapi_schema
    schema = apply_security(
        get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
    )
    app.openapi_schema = schema
    return schema
