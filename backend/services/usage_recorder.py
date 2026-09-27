"""Write the api_key_usage row AFTER the response status is known.

The bug this replaces
---------------------
``_record_usage_async`` wrote the usage row from inside ``verify_api_key`` — a
dependency that runs before the handler. At that moment the status code does not
exist yet, so the column was left NULL on every row ever written. The schema has
had ``status_code integer`` since launch and it has never held a value.

Two consequences, both of which matter for a paid API:

  * **No error rate.** A customer whose integration is returning 403 on every
    call sees a healthy-looking request count and nothing else. The one question
    they actually have — "is it me or is it you" — was unanswerable from the
    data we were collecting.
  * **Refusals were invisible.** The write sat after the entitlement check and
    after metering, so a request refused with 401, 403 or 429 was never recorded
    at all. Rate-limited calls did not appear in usage, which is precisely
    backwards: being throttled is the event a customer most needs to see.

How
---
``verify_api_key`` stashes the facts it knows on ``request.state`` as soon as the
key row is identified — before the checks that can refuse it. This middleware
flushes that record once a response exists, with the real status attached. A
request refused at 429 therefore lands in the log as a 429.

Requests refused BEFORE the key is identified (malformed header, unknown key)
are still not recorded, and should not be: ``api_key_usage.key_id`` is a foreign
key, and there is no account to attribute an unidentifiable request to.
"""

from __future__ import annotations

import logging
import threading
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

STATE_ATTR = "integra_api_usage"


def stage(request: Any, key_id: str, endpoint: str, method: str) -> None:
    """Record the intent to log this request. Called from verify_api_key."""
    try:
        setattr(request.state, STATE_ATTR, {
            "key_id": key_id,
            "endpoint": endpoint,
            "method": method,
            "latency_ms": None,
        })
    except Exception:  # noqa: BLE001 — a stash failure must not fail the request
        logger.debug("usage_recorder: could not stage usage record", exc_info=True)


def set_latency(request: Any, latency_ms: int) -> None:
    """Attach the auth-path latency measured inside verify_api_key.

    Kept separate from the middleware's own timing because they answer different
    questions: this one is what authentication cost, which is the part we can
    act on. The middleware overwrites it with total request time when available,
    since that is what the customer experiences.
    """
    record = pending(request)
    if record is not None:
        record["latency_ms"] = latency_ms


def pending(request: Any) -> Optional[Dict[str, Any]]:
    return getattr(getattr(request, "state", None), STATE_ATTR, None)


def _write(supabase: Any, record: Dict[str, Any]) -> None:
    try:
        supabase.table("api_key_usage").insert({
            "key_id": record["key_id"],
            "endpoint": record["endpoint"],
            "method": record["method"],
            "status_code": record.get("status_code"),
            "latency_ms": record.get("latency_ms"),
        }).execute()
        supabase.table("api_keys").update({
            "last_used_at": "now()",
        }).eq("id", record["key_id"]).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning("api_key usage logging failed: %s", exc)


def flush(request: Any, status_code: int, latency_ms: Optional[int] = None) -> None:
    """Write the staged record, if any. Never raises.

    Off-thread: two Supabase writes on the way out of every authenticated
    request would otherwise be added to the response the customer is waiting
    for. The original code made them inline; moving them off the path is a
    latency win as well as a correctness one.
    """
    record = pending(request)
    if not record:
        return
    # Clear first so a retried or re-entered response cannot double-log.
    try:
        setattr(request.state, STATE_ATTR, None)
    except Exception:  # noqa: BLE001
        pass

    record["status_code"] = status_code
    if latency_ms is not None:
        record["latency_ms"] = latency_ms

    from services._supabase import get_supabase_client

    supabase = get_supabase_client()
    if supabase is None:
        logger.warning("api_key usage logging skipped: no supabase client")
        return

    threading.Thread(
        target=_write, args=(supabase, record), name="usage-write", daemon=True
    ).start()


def install(app: Any) -> None:
    """Register the flush as HTTP middleware on `app`."""
    import time

    @app.middleware("http")
    async def _usage_middleware(request, call_next):  # type: ignore[no-untyped-def]
        started = time.monotonic()
        try:
            response = await call_next(request)
        except Exception:
            # An unhandled exception is a 500 the customer was charged a request
            # for. Log it as such rather than losing the row.
            flush(request, 500, int((time.monotonic() - started) * 1000))
            raise
        flush(request, response.status_code, int((time.monotonic() - started) * 1000))
        return response

    return None
