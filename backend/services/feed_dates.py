"""Publication-date parsing for the news pipeline.

Why this exists
---------------
A time-ordered feed is only as trustworthy as its timestamps, and the old
parser (`data_sources._parse_date`) silently substituted `datetime.now()`
for anything it could not read:

    for fmt in ('%a, %d %b %Y %H:%M:%S %Z', ...):   # four rigid formats
        ...
    return datetime.now(timezone.utc)               # <-- silent lie

Two of those formats never matched real feeds. EIA's Today in Energy ships
``'Fri, 31 Jul 2026  09:00:00 EST'`` — a *double* space before the time and an
alphabetic zone that ``%Z`` will not read — so all eight EIA articles were
stamped with the ingest time instead. Measured on production
(2026-08-17): 23 of the newest 500 `raw_documents` rows carry a collided
now() timestamp, and the EIA batch was stamped 2026-08-17T08:59:31 for
stories actually published July 22-31.

That is worse than a missing date. `raw_documents` is upserted on
(source, url_hash) every ten minutes, so a story with an unparseable date had
its `published_at` rewritten to now() on *every* tick — it pinned itself to
the top of any recency-ordered feed permanently and never aged out.

So: parse properly, and return None rather than inventing a date.
`email.utils.parsedate_to_datetime` reads all five formats observed across
OilPrice, EIA, Investing.com, Google News and Yahoo Finance (it is tolerant of
the extra whitespace and knows the obsolete US zone abbreviations); ISO 8601
falls to `fromisoformat`. Anything else is unknown, and callers decide what an
unknown date means rather than being handed a plausible-looking fake.
"""

from __future__ import annotations

import datetime as dt
import logging
from email.utils import parsedate_to_datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)

# A publish date outside this band is a parse artefact, not news. Feeds emit
# 1970 epochs on missing fields and occasional far-future typos; either would
# sort to an extreme of the feed and stay there.
_MIN_YEAR = 2000
_FUTURE_TOLERANCE = dt.timedelta(days=2)  # generous for clock skew + timezones


def _bounded(value: dt.datetime) -> Optional[dt.datetime]:
    """Reject implausible dates. Returns a UTC-normalised datetime or None."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=dt.timezone.utc)
    value = value.astimezone(dt.timezone.utc)
    if value.year < _MIN_YEAR:
        return None
    if value > dt.datetime.now(dt.timezone.utc) + _FUTURE_TOLERANCE:
        return None
    return value


def parse_published(raw: Any) -> Optional[dt.datetime]:
    """Best-effort parse of a feed publication date to aware UTC.

    Accepts datetimes, feedparser's 9-tuple `published_parsed`, RFC 2822
    strings and ISO 8601 strings. Returns None when the value cannot be read
    or is implausible — never a substituted "now".
    """
    if raw is None or raw == "":
        return None

    if isinstance(raw, dt.datetime):
        return _bounded(raw)

    # feedparser exposes `entry.published_parsed` as a time.struct_time, which
    # it has already normalised to UTC. Prefer it when present: it is the one
    # form that needs no format guessing at all.
    if isinstance(raw, (tuple, list)) and len(raw) >= 6:
        try:
            return _bounded(dt.datetime(*[int(p) for p in raw[:6]], tzinfo=dt.timezone.utc))
        except (TypeError, ValueError):
            return None

    text = str(raw).strip()
    if not text:
        return None

    # RFC 2822 first — the format every RSS/Atom feed here actually uses.
    try:
        return _bounded(parsedate_to_datetime(text))
    except (TypeError, ValueError):
        pass

    # ISO 8601, including the trailing-Z spelling fromisoformat rejects
    # before Python 3.11.
    try:
        return _bounded(dt.datetime.fromisoformat(text.replace("Z", "+00:00")))
    except ValueError:
        pass

    logger.debug("unparseable publication date: %r", text)
    return None


def parse_published_iso(raw: Any) -> Optional[str]:
    """`parse_published` as an ISO 8601 UTC string, or None."""
    parsed = parse_published(raw)
    return parsed.isoformat() if parsed else None
