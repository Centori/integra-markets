"""Exhaustive reads for aggregate endpoints, and cursors for list ones.

The bug this exists to remove
-----------------------------
Aggregate endpoints computed their answer from a capped query:

    .select(...).gte("published_at", since).order(...).limit(1000)
    scores = [r["sentiment_score"] for r in rows ...]
    avg = statistics.fmean(scores)

For any window holding more than the cap, `avg` is the mean of a **sample** —
specifically the most recent N rows, which is a biased sample, not a random
one — while `articles_analyzed` reports the sample size as though it were the
population. The response looks complete and is wrong, and it gets *more* wrong
the longer the window, which is precisely the direction that matters for a
product sold on historical context.

Nothing errored, so nothing surfaced it.

Two tools here
--------------
`fetch_all` pages through PostgREST with `.range()` until the window is
exhausted or a hard ceiling is hit, and reports which happened. Callers that
aggregate should use it and pass `truncated` through to the response, so a
capped answer is labelled rather than silently presented as total.

`encode_cursor`/`decode_cursor` implement opaque keyset pagination for
list-shaped endpoints. Keyset rather than offset because rows shift under a
caller between pages: with `OFFSET` a row inserted during paging is skipped and
one is seen twice, which is invisible client-side and unfixable server-side.

Why not do it in SQL
--------------------
`count="exact"` plus a Postgres aggregate would be one round trip instead of
several, and is the right end state. It needs an RPC (PostgREST cannot express
`avg()` over a filtered set without one) and therefore a migration, which is a
separate change with a separate risk profile — production has no migration
runner. This is the correctness fix that ships without one.
"""

from __future__ import annotations

import base64
import binascii
import json
import logging
from typing import Any, Callable, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# PostgREST refuses ranges wider than its own max-rows setting; 1000 is the
# default and is safe to assume.
PAGE_SIZE = 1000

# Ceiling on one aggregate request. A window holding more rows than this
# returns truncated=True rather than an unbounded read that would tie up a
# worker and the database behind it. Raise it when the aggregation moves into
# SQL and the row count stops mattering.
DEFAULT_MAX_ROWS = 20_000


def fetch_all(
    build_query: Callable[[int, int], Any],
    *,
    max_rows: int = DEFAULT_MAX_ROWS,
    page_size: int = PAGE_SIZE,
) -> Tuple[List[Dict[str, Any]], bool]:
    """Page a PostgREST query to exhaustion. Returns (rows, truncated).

    `build_query` is called with (start, end) inclusive offsets and must return
    a query with `.range(start, end)` already applied — a callable rather than
    a query object because supabase-py builders are single-use.

    `truncated` is True only when the ceiling stopped us, never when the data
    simply ran out. Callers must surface it: a capped aggregate presented as a
    total is the bug this module exists to remove.
    """
    rows: List[Dict[str, Any]] = []
    start = 0
    while start < max_rows:
        end = min(start + page_size, max_rows) - 1
        page = (build_query(start, end).execute()).data or []
        rows.extend(page)
        # Short page means the filter is exhausted. Checking the page length
        # rather than issuing one more request saves a round trip per call.
        if len(page) < (end - start + 1):
            return rows, False
        start = end + 1
    return rows, True


def encode_cursor(payload: Dict[str, Any]) -> str:
    """Opaque cursor. Base64 so callers do not parse or construct it.

    Deliberately opaque: a cursor whose shape is guessable becomes a contract,
    and the keyset columns then cannot change without breaking clients.
    """
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def decode_cursor(cursor: Optional[str]) -> Optional[Dict[str, Any]]:
    """Decode a cursor, or None if absent. Raises ValueError if malformed.

    Malformed must be a 400, not a silent restart from the beginning — a client
    that corrupts its cursor should be told, not handed page one forever while
    it believes it is advancing.
    """
    if not cursor:
        return None
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        return json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
    except (ValueError, binascii.Error, UnicodeDecodeError) as exc:
        raise ValueError("malformed cursor") from exc


def page_response(
    rows: List[Dict[str, Any]],
    *,
    limit: int,
    cursor_from: Callable[[Dict[str, Any]], Dict[str, Any]],
) -> Dict[str, Any]:
    """Shape a list response with keyset pagination.

    Callers fetch `limit + 1` rows; the extra one is not returned, it only
    proves another page exists. That avoids the "has_more is wrong on the exact
    boundary" bug that a separate count query invites.
    """
    has_more = len(rows) > limit
    page = rows[:limit]
    out: Dict[str, Any] = {"data": page, "has_more": has_more}
    if has_more and page:
        out["next_cursor"] = encode_cursor(cursor_from(page[-1]))
    return out
