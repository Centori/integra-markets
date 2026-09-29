"""API key generation, hashing, and verification.

Format: ``ik_live_<22 cryptographically random urlsafe chars>``. The full key
value leaves the server exactly once (on create). Only the prefix (first 11
chars, unique-indexed) and ``sha256(key)`` are stored.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import math
import secrets
import time
from typing import Any, Dict, Optional

from fastapi import Depends, Header, HTTPException, Request, Response

logger = logging.getLogger(__name__)

KEY_PREFIX_VISIBLE_LENGTH = 11  # "ik_live_xxx"
PUBLIC_PREFIX = "ik_live_"
KEY_BODY_BYTES = 24  # 24 random bytes → ~32 urlsafe chars

# --- Scope model -----------------------------------------------------------
# Scopes are DERIVED SERVER-SIDE from the caller's live subscription, in
# services/entitlement.py. The `api_keys.scopes` column is a display cache for
# the dashboard and is never an authorization input: a key minted while the
# owner was subscribed must stop working when that subscription lapses, and
# freezing scopes at mint time made that structurally impossible.
from services.entitlement import (  # noqa: E402  (kept beside the scope model it replaces)
    ARCHIVE_SCOPE,
    HISTORY_DEPTH_CAP_DAYS,
    HISTORY_SCOPE,
    export_depth_days,
    query_depth_days,
    resolve as resolve_entitlement,
)
from services import rate_limit  # noqa: E402
from services.rate_limit import (  # noqa: E402
    check_and_consume,
    check_burst,
    rate_limit_headers,
    retry_after_seconds,
)
from services import usage_alerts, usage_recorder  # noqa: E402


def effective_scopes(auth_row: Dict[str, Any]) -> set:
    """The caller's live scopes, resolved during verify_api_key.

    Returns the empty set if no entitlement was attached, so a caller that
    somehow bypasses verify_api_key is unprivileged rather than unrestricted.
    """
    ent = auth_row.get("_entitlement")
    return set(ent.scopes) if ent is not None else set()


# The tier that grants the deepest access, named in 403s as the upgrade path.
ARCHIVE_TIER = "api_history"


def tier_of(auth_row: Dict[str, Any]) -> str:
    """The caller's live tier, resolved during verify_api_key.

    Returns "" when no entitlement was attached, which every depth lookup
    treats as the most restrictive tier rather than the least.
    """
    ent = auth_row.get("_entitlement")
    return getattr(ent, "tier", "") if ent is not None else ""


def _assert_depth(
    auth_row: Dict[str, Any], lookback_days: float, axis: str, allowed: float
) -> None:
    """Shared body for the query and export depth gates.

    ``lookback_days`` must be the AGE of the earliest requested timestamp
    (now - start), not the WIDTH of the window (end - start). Width let
    ``from=2015-01-01&to=2015-03-01`` — 59 days wide — pass a 90-day cap and
    reach eleven-year-old data.
    """
    if lookback_days <= allowed:
        return
    if allowed == math.inf:  # pragma: no cover — unreachable, kept explicit
        return

    if allowed == 0:
        detail = f"{axis} is not available on this plan"
    else:
        detail = (
            f"{axis} beyond {int(allowed)} days is not available on this plan "
            f"(requested {int(lookback_days)} days)"
        )

    # Name the plan that WOULD serve the request. A 403 that only says "no"
    # makes the caller guess, and the guess is usually "the API is broken".
    # Only suggested when it is actually an upgrade: telling an archive
    # customer to buy the archive tier is worse than saying nothing.
    if query_depth_days(ARCHIVE_TIER) > allowed:
        detail += f". The {ARCHIVE_SCOPE} tier ({ARCHIVE_TIER}) reaches further"

        # And say what "further" is worth. A refusal that names the cap but not
        # the prize is how a caller concludes the dataset ends where their plan
        # does — which is the mistake this whole change exists to stop. Best
        # effort: if coverage cannot be read, the 403 is unchanged rather than
        # trailing off mid-claim.
        try:
            from services import archive_coverage
            from services._supabase import get_supabase_client

            extent = archive_coverage.earliest_readable_label(get_supabase_client())
            if extent:
                detail += f" — {extent}"
        except Exception:  # noqa: BLE001 — a 403 must not become a 500
            logger.debug("could not attach coverage to depth refusal", exc_info=True)

    raise HTTPException(
        status_code=403,
        detail=f"{detail}. See https://dashboard.integramarkets.app/api-tier",
    )


def assert_history_depth(auth_row: Dict[str, Any], lookback_days: float) -> None:
    """Raise 403 if the oldest point QUERIED is beyond the key's query depth.

    Previously this compared against one global constant and exempted anything
    holding the archive scope. Depth is now per tier, so api_trial can be 24
    hours while api_basic is 30 days without a second mechanism — and the
    archive tier's allowance is expressed as its own unlimited query depth
    rather than as a scope that bypasses the check.
    """
    _assert_depth(auth_row, lookback_days, "history", query_depth_days(tier_of(auth_row)))


def assert_export_depth(auth_row: Dict[str, Any], lookback_days: float) -> None:
    """Raise 403 if the oldest point EXPORTED is beyond the key's export depth.

    Deliberately separate from assert_history_depth. An archive key may query
    the full archive and export only the last year of it: the point is that a
    customer can ask any question and cannot carry the database away. Calling
    the query gate here would reopen exactly that.
    """
    _assert_depth(auth_row, lookback_days, "export", export_depth_days(tier_of(auth_row)))


def require_scopes(*required: str):
    """Dependency factory: verify the key AND assert it carries every required
    scope. Returns 403 (not 401) on a valid-but-under-privileged key so clients
    can distinguish 'bad key' from 'upgrade needed'.
    """

    async def _dep(auth: Dict[str, Any] = Depends(verify_api_key)) -> Dict[str, Any]:
        have = effective_scopes(auth)
        missing = [s for s in required if s not in have]
        if missing:
            raise HTTPException(
                status_code=403,
                detail=f"API key missing required scope(s): {', '.join(missing)}",
            )
        return auth

    return _dep


def generate_key() -> tuple[str, str, str]:
    """Returns (full_key, prefix, sha256_hex)."""
    full_key = PUBLIC_PREFIX + secrets.token_urlsafe(KEY_BODY_BYTES)
    prefix = full_key[:KEY_PREFIX_VISIBLE_LENGTH]
    key_hash = hashlib.sha256(full_key.encode("utf-8")).hexdigest()
    return full_key, prefix, key_hash


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    if not authorization.startswith("Bearer "):
        return None
    return authorization.removeprefix("Bearer ").strip()


async def verify_api_key(
    request: Request,
    response: Response,
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    """FastAPI dependency: validate Authorization header against api_keys table.

    Returns the api_keys row on success. Raises 401 on failure.
    """
    from services._supabase import get_supabase_client

    key = _extract_bearer(authorization)
    if not key or not key.startswith(PUBLIC_PREFIX):
        raise HTTPException(status_code=401, detail="missing or malformed API key")

    supabase = get_supabase_client()
    if supabase is None:
        raise HTTPException(status_code=503, detail="auth backend unavailable")

    started = time.monotonic()
    row = _lookup_row(supabase, key)
    if row is None:
        raise HTTPException(status_code=401, detail="invalid API key")

    # Staged HERE — before any check that can refuse — so the usage log records
    # refusals too. Written by the middleware in services/usage_recorder once the
    # response status exists; see that module for why it cannot be written from
    # inside this dependency.
    usage_recorder.stage(request, row["id"], request.url.path, request.method)

    # The key's own lifetime, independent of the subscription, so a beta key can
    # carry a hard stop even if the tier outlives it.
    expires_at = row.get("expires_at")
    if expires_at and _is_past(expires_at):
        raise HTTPException(
            status_code=401,
            detail="API key expired; generate a new one in the dashboard",
        )

    # Authorization from live subscription state, not from the stored row.
    ent = resolve_entitlement(supabase, row.get("user_id"))
    if ent.is_expired_tier or not ent.scopes:
        raise HTTPException(
            status_code=403,
            detail=(
                "no active API entitlement for this account. If your beta "
                "window or subscription ended, renew at "
                "https://dashboard.integramarkets.app/api-tier"
            ),
        )
    row["_entitlement"] = ent
    row["_tier"] = ent.tier

    # Metering. api_key_usage has recorded every request since launch and
    # nothing has ever read it — one key could issue unlimited calls, and at
    # 1,000 rows per /history call the whole archive was extractable by
    # anyone willing to write a loop.
    #
    # Deliberately AFTER the entitlement check (no point metering a request
    # we are about to 403) and BEFORE the usage write, so the request that
    # trips the limit is itself refused rather than counted and served.
    allowed, meter = check_and_consume(supabase, row["id"], ent.tier)
    headers = rate_limit_headers(meter)
    if not allowed:
        retry = retry_after_seconds(meter)
        logger.info(
            "metering: key %s exhausted %s allowance (%s/%s)",
            row.get("key_prefix"), ent.tier, meter.get("used"), meter.get("limit"),
        )
        raise HTTPException(
            status_code=429,
            detail=(
                f"monthly request limit reached for the {ent.tier} tier "
                f"({meter.get('limit')} requests). The allowance resets at the "
                f"start of next month (UTC). Raise it at "
                f"https://dashboard.integramarkets.app/api-tier"
            ),
            headers={**headers, "Retry-After": str(retry)},
        )

    # Per-second burst, checked after the monthly cap. Order matters: a key that
    # is out of monthly allowance should be told that, not told to slow down and
    # try again in 40ms when trying again will not help.
    #
    # In-process token bucket, so this is a floor rather than a ceiling when the
    # image runs on more than one replica — see the note in services/rate_limit.
    burst_ok, burst = check_burst(row["id"], ent.tier)
    headers["X-RateLimit-Rate"] = str(int(burst["rate"]))
    if not burst_ok and rate_limit.ENFORCED:
        wait = burst["retry_after"]
        raise HTTPException(
            status_code=429,
            detail=(
                f"rate limit exceeded: the {ent.tier} tier allows "
                f"{int(burst['rate'])} requests/second per key "
                f"(bursts of {int(burst['capacity'])}). Retry in "
                f"{wait:.2f}s, or raise the limit at "
                f"https://dashboard.integramarkets.app/api-tier"
            ),
            # Retry-After must be an integer per RFC 9110, and 0 would invite an
            # immediate retry that fails again. Ceil to 1 for a sub-second wait.
            headers={**headers, "Retry-After": str(max(1, math.ceil(wait)))},
        )

    # Success path carries the same headers so clients can self-throttle
    # instead of discovering the ceiling by hitting it.
    for header, value in headers.items():
        response.headers[header] = value

    usage_recorder.set_latency(request, int((time.monotonic() - started) * 1000))

    # Threshold notification. Off-thread and only past the lowest configured
    # threshold, so the common case costs nothing.
    usage_alerts.evaluate_async(
        supabase,
        row.get("user_id"),
        ent.tier,
        meter.get("used"),
        meter.get("limit", 0),
    )
    return row


def _is_past(value: Any) -> bool:
    """True if `value` is a timestamp in the past. Unparseable → True.

    An expiry check that cannot read its own input must fail closed; treating a
    malformed timestamp as "not expired" would make a corrupt row a permanent key.
    """
    import datetime as _dt

    if isinstance(value, _dt.datetime):
        ts = value
    else:
        try:
            ts = _dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            logger.error("api key expires_at unparseable: %r", value)
            return True
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=_dt.timezone.utc)
    return ts < _dt.datetime.now(_dt.timezone.utc)


def _lookup_row(supabase: Any, key: str) -> Optional[Dict[str, Any]]:
    prefix = key[:KEY_PREFIX_VISIBLE_LENGTH]
    try:
        rows = (
            supabase.table("api_keys")
            .select("*")
            .eq("key_prefix", prefix)
            .is_("revoked_at", "null")
            .limit(1)
            .execute()
            .data
            or []
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("api_keys lookup failed: %s", exc)
        return None
    if not rows:
        return None
    if not hmac.compare_digest(hash_key(key), rows[0]["key_hash"]):
        return None
    return rows[0]


# `_record_usage_async` used to live here. It wrote the usage row from inside
# this dependency, which is before a status code exists — so status_code was
# NULL on every row since launch, and requests refused at 401/403/429 were never
# logged at all. The write now happens in services/usage_recorder, from HTTP
# middleware, where the response is in hand.
