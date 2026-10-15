"""WAF source registry and redistribution policy.

One place that answers two questions for every WAF source:
  1. Where do we read it from, and how?
  2. What are we allowed to show customers from it?

Phase 0 (free proof-of-concept) sources are RSS feeds and official publications
only. petroleumprice.ng is licence-gated: its terms prohibit reproduction without
written permission, so nothing derived from it may leave the building until
PPNG_LICENSED is set — see `redistribution_mode` and `filter_for_public`.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional

PPNG_SOURCE = "petroleumprice.ng"


@dataclass(frozen=True)
class FeedSource:
    name: str                  # value written to raw_documents.source
    tier: int                  # 1 = energy-specific / official, 2 = national press, 3 = aggregator
    gated: bool                # True = general feed, keep only WAF-relevant items
    query: Optional[str] = None  # Google News query (fetched via NewsDataSources._fetch_google_news)
    url: Optional[str] = None    # direct RSS URL


# Google News queries target WAF energy topics directly. Outlet feeds are general
# news, so they are relevance-gated before anything reaches the archive.
FEEDS: List[FeedSource] = [
    FeedSource("WAF Wire: Dangote", 3, False, query='"Dangote refinery" OR "Dangote Petroleum" when:7d'),
    FeedSource("WAF Wire: NNPC", 3, False, query="NNPC crude OR petrol when:7d"),
    FeedSource("WAF Wire: Regulators", 3, False, query="NUPRC OR NMDPRA when:7d"),
    FeedSource("WAF Wire: Depot prices", 3, False, query="Nigeria depot price petrol OR diesel when:7d"),
    FeedSource("WAF Wire: NPA shipping position", 3, False, query='NPA "shipping position" when:7d'),
    FeedSource("WAF Wire: Nigerian grades", 3, False,
               query='"Bonny Light" OR "Qua Iboe" OR Forcados OR Escravos OR Agbami when:7d'),
    FeedSource("WAF Wire: Marketers", 3, False, query="MEMAN OR IPMAN OR DAPPMAN when:7d"),
    FeedSource("WAF Wire: West Africa crude", 3, False,
               query='"West Africa" crude cargoes OR differentials when:7d'),
    FeedSource("Punch", 2, True, url="https://punchng.com/feed/"),
    FeedSource("Vanguard", 2, True, url="https://www.vanguardngr.com/feed/"),
    FeedSource("Premium Times", 2, True, url="https://www.premiumtimesng.com/feed"),
    FeedSource("Nairametrics", 2, True, url="https://nairametrics.com/feed/"),
    FeedSource("The Guardian Nigeria", 2, True, url="https://guardian.ng/feed/"),
    FeedSource("BusinessDay", 2, True, url="https://businessday.ng/feed/"),
]

MEMAN_SOURCE = "MEMAN"
SOURCE_TIERS: Dict[str, int] = {f.name: f.tier for f in FEEDS}
SOURCE_TIERS.update({MEMAN_SOURCE: 1, PPNG_SOURCE: 1})
WAF_SOURCES = tuple(SOURCE_TIERS)


def tier_of(source: str) -> int:
    return SOURCE_TIERS.get(source, 2)


def ppng_licensed() -> bool:
    return os.environ.get("PPNG_LICENSED", "").strip().lower() in ("1", "true", "yes")


def redistribution_mode(source: str) -> str:
    """'full' | 'headline_only'. Only petroleumprice.ng is restricted, until licensed."""
    if source == PPNG_SOURCE and not ppng_licensed():
        return "headline_only"
    return "full"


_HEADLINE_FIELDS = ("id", "source", "title", "url", "published_at")


def filter_for_public(rows: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Apply redistribution rights to rows about to leave the API.

    Restricted sources keep only headline fields; everything else passes through
    unchanged (never rebuilt field-by-field, so no key is silently dropped).
    """
    out: List[Dict[str, Any]] = []
    for row in rows:
        if redistribution_mode(row.get("source", "")) == "headline_only":
            out.append({k: row.get(k) for k in _HEADLINE_FIELDS if k in row} | {"restricted": True})
        else:
            out.append(row)
    return out


def is_public_source(source: str) -> bool:
    """False for sources whose DATA (not headlines) may not be published yet."""
    return redistribution_mode(source) == "full"
