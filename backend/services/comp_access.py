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

Listing an email therefore unlocks the dashboard but NOT the API keys minted
from it, which would be a confusing half-grant. Both keys exist so a grant can
be complete. ``/api/subscriptions/entitlement`` returns ``user_id`` for exactly
this reason — so the UUID to list can be read off the dashboard instead of
hunted for in Supabase.

REMOVING IT. Delete the variables. Nothing else refers to comp state, no rows
were written, and the next request resolves through the paid path.
"""

from __future__ import annotations

import logging
import os
from typing import Optional, Set

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
    return None


def is_comped(user_id: Optional[str], email: Optional[str] = None) -> bool:
    return comp_tier_for(user_id, email) is not None
