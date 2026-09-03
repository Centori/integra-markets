"""Polymarket public-read client (no auth required).

Calls `https://gamma-api.polymarket.com/markets` directly using the
public, unauthenticated read endpoints. Used by the divergence service
and the /v1/markets endpoints to fetch live market prices without
requiring per-user BYO credentials.

This intentionally does NOT implement order placement, position
management, or any write operations. Those still require the BYOK
connector path in main_simple_nlp.py — kept separate so retail users
get the free divergence feature and power users get full programmatic
control through the API tier.

Rate-limit note: Polymarket's gamma-api allows ~100 req/min from a
single IP without auth. Combined with the 10-minute TTL cache below
and per-topic filtering, this can serve thousands of consumer users
from a single backend connection.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


GAMMA_BASE = "https://gamma-api.polymarket.com"
DEFAULT_TIMEOUT_S = 12
DEFAULT_LIMIT = 100
DEFAULT_CACHE_TTL_S = 600  # 10 min — markets change slowly enough for this


class _Cache:
    """In-process TTL cache for market fetches.

    Sufficient for a single-process backend; swap for Redis when we
    horizontally scale.
    """

    def __init__(self) -> None:
        self._store: Dict[str, tuple] = {}

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if not entry:
            return None
        expires_at, value = entry
        if expires_at < time.time():
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any, ttl_s: int) -> None:
        self._store[key] = (time.time() + ttl_s, value)


_cache = _Cache()


def _normalize_market(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Reduce the gamma-api market payload to the fields we actually use.

    Keeps the response stable even if Polymarket adds/removes fields.
    """
    # gamma-api returns prices as strings; coerce.
    def _f(v: Any) -> Optional[float]:
        try:
            return float(v) if v is not None and v != "" else None
        except (ValueError, TypeError):
            return None

    # Implied probability = mid of the book, not the bid.
    #
    # `yes_price` was `bestBid or lastTradePrice`, which is wrong twice over.
    # bestBid is the highest price a *buyer* will pay, so it sits below fair
    # value by half the spread on every market. Divergence is computed as
    # (sentiment - market_implied), so understating the market inflated the
    # delta positively on every reading -- which is why cards systematically
    # said "the market is underpricing this" rather than splitting both ways.
    #
    # The `or` was also evaluated on the *raw* value before coercion, and
    # gamma-api returns prices as strings: "0" is truthy and survived, while
    # "" fell through to last trade. And no_price was derived from bestBid
    # even when yes_price had come from lastTradePrice, so the pair could
    # disagree with itself.
    bid = _f(raw.get("bestBid"))
    ask = _f(raw.get("bestAsk"))
    last = _f(raw.get("lastTradePrice"))

    if bid is not None and ask is not None:
        yes_price = (bid + ask) / 2.0
        spread = abs(ask - bid)
    elif bid is not None or ask is not None:
        # One-sided book: the single quote is the best estimate available,
        # but it is a bound rather than a mid, so treat it as wide.
        yes_price = bid if bid is not None else ask
        spread = None
    else:
        yes_price = last
        spread = None

    return {
        "provider": "polymarket",
        "id": raw.get("id"),
        "condition_id": raw.get("conditionId"),
        "question": raw.get("question") or raw.get("title"),
        "title": raw.get("question") or raw.get("title"),
        "slug": raw.get("slug"),
        "url": f"https://polymarket.com/event/{raw.get('slug')}" if raw.get("slug") else None,
        "category": raw.get("category"),
        "tags": raw.get("tags") or [],
        "active": raw.get("active"),
        "closed": raw.get("closed"),
        "end_date": raw.get("endDate"),
        "yes_price": round(yes_price, 6) if yes_price is not None else None,
        "no_price": round(1.0 - yes_price, 6) if yes_price is not None else None,
        # Surfaced so aggregation can down-weight illiquid, wide-spread
        # markets instead of treating every quote as equally informative.
        "spread": round(spread, 6) if spread is not None else None,
        "volume_24h": _f(raw.get("volume24hr")),
        "liquidity": _f(raw.get("liquidity")),
        "outcome": raw.get("umaResolutionStatus"),
    }


def fetch_active_markets(
    *,
    limit: int = DEFAULT_LIMIT,
    cache_ttl_s: int = DEFAULT_CACHE_TTL_S,
) -> List[Dict[str, Any]]:
    """Return active (open) markets, normalized."""
    cache_key = f"active:{limit}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    params = {
        "limit": limit,
        "active": "true",
        "closed": "false",
        "order": "volume24hr",
        "ascending": "false",
    }
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as client:
            response = client.get(f"{GAMMA_BASE}/markets", params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        logger.warning("polymarket fetch_active_markets failed: %s", exc)
        return []

    markets = [_normalize_market(m) for m in (data or [])]
    _cache.set(cache_key, markets, cache_ttl_s)
    return markets


def fetch_settled_markets(
    *,
    limit: int = DEFAULT_LIMIT,
    cache_ttl_s: int = DEFAULT_CACHE_TTL_S,
) -> List[Dict[str, Any]]:
    """Return recently-settled (resolved) markets."""
    cache_key = f"settled:{limit}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    params = {
        "limit": limit,
        "active": "false",
        "closed": "true",
        "order": "endDate",
        "ascending": "false",
    }
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as client:
            response = client.get(f"{GAMMA_BASE}/markets", params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        logger.warning("polymarket fetch_settled_markets failed: %s", exc)
        return []

    markets = [_normalize_market(m) for m in (data or [])]
    _cache.set(cache_key, markets, cache_ttl_s)
    return markets
