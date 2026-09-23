"""Complimentary entitlement, granted by configuration rather than by payment.

WHY THIS EXISTS. Stripe is not live yet, so there is no way for anyone —
including the people building the product — to reach a paid tier through the
normal path. Without this, the owner's own account resolves to ``free_trial``
and the dashboard correctly refuses to show key management, because the same
gate that keeps strangers out keeps everyone out.

WHY CONFIG AND NOT A DATABASE ROW. A row in ``user_subscriptions`` claiming a
paid plan nobody paid for is a lie the billing system will later have to
reconcile: it looks exactly like a real subscription to every report, webhook
and cancellation path. A comp grant is not a subscription and should not be
recorded as one. Held in env vars it is visible in one place, reversible by
deleting a variable, and impossible to confuse with revenue.

WHY TWO KEYS. The two authentication surfaces know different things:

  * A dashboard request carries a Supabase JWT, so it knows the EMAIL.
  * An API-key request carries only ``api_keys.user_id``, so it knows the UUID
    and can never know the email without another round trip.

Listing an email used to unlock the dashboard but NOT the API keys minted
from it: a grant that looks complete, mints keys happily, and answers 403 on
every call made with them. The documented remedy was to paste the UUID into
the second variable as well — a manual step nothing verifies and nothing
complains about skipping, which is the same class of silent half-configuration
this module was written to remove. So an email grant now resolves the UUID's
account email through the GoTrue admin API and matches on that. Both variables
remain: the UUID list still works offline, costs no lookup, and is the only
thing that can comp a key when the admin API is unreachable.

REMOVING IT. Delete the variables. Nothing else refers to comp state, no rows
were written, and the next request resolves through the paid path.
"""

from __future__ import annotations

import logging
import os
import threading
import time
from typing import Dict, Optional, Set, Tuple

logger = logging.getLogger(__name__)

# The tier a comp grant resolves to. api_history is the full product: it is
# what you want when the point is to exercise everything before selling it.
DEFAULT_COMP_TIER = "api_history"

_EMAILS_VAR = "INTEGRA_COMP_EMAILS"
_USER_IDS_VAR = "INTEGRA_COMP_USER_IDS"
_TIER_VAR = "INTEGRA_COMP_TIER"


def _split(raw: Optional[str]) -> Set[str]:
    """Parse a comma- or whitespace-separated list, case-folded.

    Read on every call rather than cached at import: Railway restarts the
    process on a variable change, but a stale module-level constant would also
    survive a reload during local development, and the cost here is a string
    split on a short string.
    """
    if not raw:
        return set()
    parts = (p.strip().strip('"').strip("'") for p in raw.replace("\n", ",").split(","))
    return {p.casefold() for p in parts if p}


def comp_tier() -> str:
    """The tier comped accounts resolve to."""
    return (os.environ.get(_TIER_VAR) or DEFAULT_COMP_TIER).strip() or DEFAULT_COMP_TIER


def _allowlist() -> Set[str]:
    """Every comped identifier, from both variables, as one set.

    The two variables exist to document WHICH identifier reaches which surface
    — an API-key request has no email, so a UUID is the only thing that can
    comp it. They are deliberately NOT two separate matches, because a value in
    the wrong variable would then match nothing at all, silently: the grant
    would look configured and do nothing, which is the failure mode this whole
    module was written in response to.

    Putting an email in INTEGRA_COMP_USER_IDS now simply works. It still will
    not comp API-key requests — nothing can, without the UUID — but it will not
    quietly do nothing either.
    """
    return _split(os.environ.get(_USER_IDS_VAR)) | _split(os.environ.get(_EMAILS_VAR))


# --- Resolving a user_id back to its account email ------------------------
# Spoken to over HTTP rather than through the supabase client: this runs on the
# API-key path, where the client that main.py built may be absent, and GoTrue's
# admin route is a stable HTTP contract while the client library's admin
# surface has moved between versions.
_EMAIL_TTL_S = 900  # The mapping is immutable; the TTL only bounds staleness.
_LOOKUP_TIMEOUT_S = 4

_email_cache: Dict[str, Tuple[float, Optional[str]]] = {}
_email_lock = threading.Lock()


def _cached_email(user_id: str) -> Tuple[bool, Optional[str]]:
    """(hit, email). Misses are cached too — see email_for_user_id."""
    with _email_lock:
        entry = _email_cache.get(user_id)
    if entry is None or (time.monotonic() - entry[0]) > _EMAIL_TTL_S:
        return False, None
    return True, entry[1]


def email_for_user_id(user_id: str) -> Optional[str]:
    """The account email behind a user_id, or None if it cannot be determined.

    Requires SUPABASE_SERVICE_ROLE_KEY; returns None without it rather than
    attempting an anon call that would answer 401 on every request.

    A *resolved* answer is cached whether or not it matched, so a stranger's
    id costs one admin call and not one per request. A *failed* call is not
    cached: a transient outage must not pin "not comped" for the next quarter
    of an hour, which would look exactly like a revoked grant.
    """
    if not user_id:
        return None

    hit, cached = _cached_email(user_id)
    if hit:
        return cached

    base = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base or not service_key:
        return None

    try:
        import requests

        response = requests.get(
            f"{base}/auth/v1/admin/users/{user_id}",
            headers={"apikey": service_key, "Authorization": f"Bearer {service_key}"},
            timeout=_LOOKUP_TIMEOUT_S,
        )
        if response.status_code == 404:
            email = None  # A real answer: no such user. Worth caching.
        elif response.status_code != 200:
            logger.warning(
                "comp: admin lookup for %s returned %s", user_id, response.status_code
            )
            return None
        else:
            email = (response.json() or {}).get("email")
    except Exception as exc:  # noqa: BLE001
        logger.warning("comp: admin lookup for %s failed: %s", user_id, exc)
        return None

    with _email_lock:
        _email_cache[user_id] = (time.monotonic(), email)
    return email


def comp_tier_for(user_id: Optional[str], email: Optional[str] = None) -> Optional[str]:
    """The comped tier for this caller, or None if they are not comped.

    Returning None rather than a tier string keeps this a pure override: a
    caller that is not on a list is unaffected, and no code path can mistake
    "not comped" for a tier of its own.
    """
    allowed = _allowlist()
    if not allowed:
        return None
    for identifier in (user_id, email):
        if identifier and identifier.strip().casefold() in allowed:
            return comp_tier()

    # Only the caller who arrived without an email — the API-key path — and
    # only when an email grant is actually configured. A deployment comping
    # nobody, or comping by UUID alone, makes no admin call at all.
    if email is None and user_id and _split(os.environ.get(_EMAILS_VAR)):
        resolved = email_for_user_id(user_id)
        if resolved and resolved.strip().casefold() in allowed:
            return comp_tier()
    return None


def is_comped(user_id: Optional[str], email: Optional[str] = None) -> bool:
    return comp_tier_for(user_id, email) is not None
