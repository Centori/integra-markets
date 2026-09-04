"""Request identity and a machine-readable error envelope.

Two problems, one change, because each is half of the other's fix.

**Errors could not be branched on.** Every failure returned FastAPI's default
``{"detail": "..."}`` — consistent, which is more than many APIs manage, but
carrying no stable field. A client that wants to retry on rate limits and
re-authenticate on expiry had to string-match English prose we are free to
reword at any time. The prose is for humans; ``error.type`` is the contract.

**Nothing identified a request.** The only id on a response was Railway's
``x-railway-request-id``: undocumented, absent from error bodies, and gone the
day we move off Railway. A customer reporting "your API failed at 14:32" handed
us a timestamp and a tier, and the answer was to read logs by hand.

The envelope carries the id, so a support conversation starts with a value the
customer can copy and we can grep:

    {
      "type": "error",
      "error": {
        "type": "rate_limit_error",
        "message": "monthly request limit reached for the api_basic tier",
        "request_id": "req_9f2c1ab84e7d4c0b"
      }
    }

Compatibility: ``detail`` is preserved alongside the new shape. The mobile app,
the dashboard and both SDKs read it today, and this must not be the change that
breaks them. It can be dropped once no client depends on it — not before.
"""

from __future__ import annotations

import logging
import secrets
from contextvars import ContextVar
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Header name. Lowercase and unprefixed: `x-` prefixes for non-standard headers
# were deprecated by RFC 6648, and every major API has since dropped it.
REQUEST_ID_HEADER = "request-id"

# Set by the middleware at the start of every request, read by the exception
# handlers and by any code that wants to log with correlation. A ContextVar
# rather than a global because the app is async and a global would leak the id
# of whichever request happened to set it last.
_request_id: ContextVar[Optional[str]] = ContextVar("integra_request_id", default=None)


def new_request_id() -> str:
    """A short, sortable-enough, copy-pasteable id.

    Prefixed so it is recognisable in a screenshot or a support email, and
    hex so it survives being read aloud or retyped without ambiguity between
    l/1/O/0.
    """
    return f"req_{secrets.token_hex(8)}"


def set_request_id(value: str) -> None:
    _request_id.set(value)


def get_request_id() -> Optional[str]:
    """The current request's id, or None outside a request (jobs, tests)."""
    return _request_id.get()


# HTTP status -> stable machine-readable error type.
#
# These strings are a public contract: clients branch on them, so they may be
# added to but never renamed. The names follow the convention used across the
# industry (`*_error`) so they read as expected to anyone who has integrated
# an API before.
_STATUS_TYPES: Dict[int, str] = {
    400: "invalid_request_error",
    401: "authentication_error",
    403: "permission_error",
    404: "not_found_error",
    405: "invalid_request_error",
    409: "conflict_error",
    413: "request_too_large",
    422: "invalid_request_error",
    429: "rate_limit_error",
    500: "api_error",
    502: "upstream_error",
    503: "service_unavailable_error",
    504: "upstream_timeout_error",
}

FALLBACK_CLIENT_TYPE = "invalid_request_error"
FALLBACK_SERVER_TYPE = "api_error"


def error_type_for_status(status: int) -> str:
    """Map an HTTP status onto its stable error type."""
    known = _STATUS_TYPES.get(status)
    if known:
        return known
    return FALLBACK_CLIENT_TYPE if 400 <= status < 500 else FALLBACK_SERVER_TYPE


def _stringify(detail: Any) -> str:
    """FastAPI's `detail` is whatever the raiser passed.

    Usually a string. For a 422 it is a list of pydantic validation dicts, and
    for hand-rolled raises it can be a dict. `message` is documented as human
    prose, so it must always end up a string — the structured form stays
    available under `error.detail` for clients that want it.
    """
    if isinstance(detail, str):
        return detail
    if isinstance(detail, list) and detail:
        first = detail[0]
        if isinstance(first, dict):
            loc = ".".join(str(p) for p in first.get("loc", []) if p != "body")
            msg = first.get("msg", "invalid request")
            return f"{loc}: {msg}" if loc else str(msg)
    if isinstance(detail, dict):
        return str(detail.get("message") or detail.get("detail") or detail)
    return str(detail)


def error_body(
    status: int,
    detail: Any,
    *,
    request_id: Optional[str] = None,
    error_type: Optional[str] = None,
) -> Dict[str, Any]:
    """The response body for any error, in one place.

    `detail` is kept at the top level for backwards compatibility — the mobile
    app, the dashboard and both SDKs read it today.
    """
    rid = request_id or get_request_id()
    err: Dict[str, Any] = {
        "type": error_type or error_type_for_status(status),
        "message": _stringify(detail),
    }
    if rid:
        err["request_id"] = rid
    # Structured validation errors stay reachable rather than being flattened
    # into prose and lost.
    if not isinstance(detail, str):
        err["detail"] = detail

    body: Dict[str, Any] = {"type": "error", "error": err}
    body["detail"] = err["message"]  # legacy shape, still consumed by clients
    if rid:
        body["request_id"] = rid
    return body
