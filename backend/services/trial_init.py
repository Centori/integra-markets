"""Free-trial initialization.

When a new user first hits any JWT-protected endpoint, we ensure a
`user_subscriptions` row exists for them with:
    tier            = 'free_trial'
    trial_ends_at   = now + FREE_TRIAL_DAYS

Existing rows are untouched. This is intentionally idempotent so it's
safe to call on every request; the underlying insert is
``on_conflict=user_id`` DO NOTHING which is a no-op for known users.
"""

from __future__ import annotations

import datetime as dt
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

FREE_TRIAL_DAYS = int(os.environ.get("INTEGRA_FREE_TRIAL_DAYS", "7"))


def ensure_trial_started(supabase, user_id: str) -> None:
    """Idempotently insert a free_trial row for a user.

    No-op if a row already exists for this user_id (any tier) — we don't
    want to reset a paying user's state or refresh a lapsed trial.
    """
    if supabase is None or not user_id:
        return
    now = dt.datetime.now(dt.timezone.utc)
    trial_ends = now + dt.timedelta(days=FREE_TRIAL_DAYS)
    row = {
        "user_id": user_id,
        "tier": "free_trial",
        "source": "none",
        "trial_ends_at": trial_ends.isoformat(),
        "last_synced_at": now.isoformat(),
    }
    try:
        # `ignore_duplicates` semantics: if user_id already exists, insert
        # is a no-op. The supabase-py client uses `upsert(..., ignore_duplicates=True)`.
        (
            supabase.table("user_subscriptions")
            .upsert(row, on_conflict="user_id", ignore_duplicates=True)
            .execute()
        )
    except Exception as exc:  # noqa: BLE001
        # Non-fatal: never break the request path for this. Worst case,
        # user just doesn't see a trial. They can be repaired later via
        # a backfill script.
        logger.debug("ensure_trial_started skipped for %s: %s", user_id, exc)
