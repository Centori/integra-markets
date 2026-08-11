"""Per-article divergence enrichment for news endpoints.

For each article in a news payload, detects the most-relevant topic via
`topic_taxonomy.detect_topics`, looks up the current `DivergenceReading`
for that topic, and attaches three fields the mobile NewsCard renders:

    divergenceProvider   "polymarket" | "kalshi"
    divergenceStatus     "DIVERGENCE" | "ALIGNED" | "NO_DATA"
    divergenceDelta      float in [-2, +2]

Only articles whose strongest signal is DIVERGENCE get the footer
(NewsCard checks `item.divergenceStatus === 'DIVERGENCE'`).

Cost: one divergence.compute() call per unique topic per request.
Market data inside compute() is already cached for 10 min by
polymarket_public/kalshi_public, so the per-request cost is bounded
by the number of distinct topics in the response (~3-8 typically).
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def _pick_strongest_signal(reading) -> Optional[Dict[str, Any]]:
    """Return the (provider, delta, status) with the largest |delta|.

    Returns None if neither provider has a delta (both NO_DATA).
    """
    candidates = []
    if reading.delta_polymarket is not None:
        candidates.append(("polymarket", reading.delta_polymarket, reading.status_polymarket))
    if reading.delta_kalshi is not None:
        candidates.append(("kalshi", reading.delta_kalshi, reading.status_kalshi))
    if not candidates:
        return None
    provider, delta, status = max(candidates, key=lambda c: abs(c[1]))
    return {"provider": provider, "delta": delta, "status": status}


def _cross_market_signal(reading, threshold: float) -> Optional[Dict[str, Any]]:
    """Kalshi-vs-Polymarket disagreement (market vs market), independent of news.

    Returns None unless BOTH providers priced this topic. `crossDelta` is signed
    (kalshi_implied - polymarket_implied), both in [-1, +1]; DIVERGENCE when the
    two prediction markets disagree by more than `threshold` — the "the crowd
    can't even agree with itself" signal, distinct from news-vs-market divergence.
    """
    poly = reading.polymarket_implied
    kal = reading.kalshi_implied
    if poly is None or kal is None:
        return None
    delta = round(kal - poly, 4)
    return {
        "polymarketImplied": poly,
        "kalshiImplied": kal,
        "crossDelta": delta,
        "crossStatus": "DIVERGENCE" if abs(delta) >= threshold else "ALIGNED",
    }


def enrich_articles_with_divergence(
    supabase,
    articles: List[Dict[str, Any]],
    *,
    threshold: Optional[float] = None,
    lookback_hours: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Attach divergence fields to each article. Returns the same list
    (mutated in place) for chainable use.

    Wrapped in try/except so a divergence-service hiccup never blocks
    the news response — articles just go out without the extra fields.
    """
    if not articles:
        return articles

    try:
        from services.divergence import (
            DEFAULT_LOOKBACK_HOURS,
            DEFAULT_THRESHOLD,
            compute,
        )
        from services.topic_taxonomy import detect_topics
    except ImportError as exc:
        logger.debug("news_enricher: divergence/taxonomy unavailable: %s", exc)
        return articles

    thr = threshold if threshold is not None else DEFAULT_THRESHOLD
    lb = lookback_hours if lookback_hours is not None else DEFAULT_LOOKBACK_HOURS

    article_topics: List[List[str]] = []
    unique_topics: set[str] = set()
    for art in articles:
        title = str(art.get("title") or "")
        text = " ".join([
            title,
            str(art.get("summary") or art.get("description") or ""),
        ])
        # Title-aware: a headline hit tags the topic; body-only needs ≥2
        # keyword hits, so passing mentions/boilerplate don't get stamped.
        topics = detect_topics(text, title=title) if text.strip() else []
        article_topics.append(topics)
        unique_topics.update(topics)

    readings: Dict[str, Any] = {}
    for topic_key in unique_topics:
        try:
            reading = compute(
                supabase,
                topic_key=topic_key,
                threshold=thr,
                lookback_hours=lb,
            )
            if reading is not None:
                readings[topic_key] = reading
        except Exception as exc:  # noqa: BLE001
            logger.warning("news_enricher: compute failed for %s: %s", topic_key, exc)

    # Pass 1 — resolve each article's best signal WITHOUT writing it yet.
    # A divergence reading belongs to a topic, not to an article, so if we
    # stamped every matching article the badge would land on every card in a
    # single-theme feed ("Oil…", "Gold…", "Oil…") and read as wallpaper rather
    # than signal. We therefore choose one owner article per topic below.
    candidates: List[Optional[Dict[str, Any]]] = []
    for art, topics in zip(articles, article_topics):
        best_signal: Optional[Dict[str, Any]] = None
        best_topic: Optional[str] = None
        best_cross: Optional[Dict[str, Any]] = None
        best_cross_topic: Optional[str] = None
        for topic_key in topics:
            reading = readings.get(topic_key)
            if reading is None:
                continue
            # News-vs-market divergence (strongest provider wins the card).
            signal = _pick_strongest_signal(reading)
            if signal is not None and (
                best_signal is None or abs(signal["delta"]) > abs(best_signal["delta"])
            ):
                best_signal = signal
                best_topic = topic_key
            # Market-vs-market (Kalshi vs Polymarket) — independent of news, so
            # it can surface even when one provider has no news-sentiment delta.
            cross = _cross_market_signal(reading, thr)
            if cross is not None and (
                best_cross is None or abs(cross["crossDelta"]) > abs(best_cross["crossDelta"])
            ):
                best_cross = cross
                best_cross_topic = topic_key
        candidates.append({
            "signal": best_signal, "topic": best_topic,
            "cross": best_cross, "cross_topic": best_cross_topic,
            "topics": topics,
        })

    # Pass 2 — pick the single owner article per topic: the one whose title
    # is most specifically about that topic (title hit beats body-only, then
    # earlier position = fresher). Every other article stays clean.
    def _owner(topic_key: str, field: str) -> Optional[int]:
        best_idx, best_rank = None, None
        for idx, (art, cand) in enumerate(zip(articles, candidates)):
            if cand[field] is None or cand["topic" if field == "signal" else "cross_topic"] != topic_key:
                continue
            title = str(art.get("title") or "")
            in_title = bool(detect_topics(title, title=title) and topic_key in detect_topics(title, title=title))
            rank = (0 if in_title else 1, idx)
            if best_rank is None or rank < best_rank:
                best_rank, best_idx = rank, idx
        return best_idx

    signal_owners = {
        c["topic"]: _owner(c["topic"], "signal")
        for c in candidates if c["signal"] is not None and c["topic"]
    }
    cross_owners = {
        c["cross_topic"]: _owner(c["cross_topic"], "cross")
        for c in candidates if c["cross"] is not None and c["cross_topic"]
    }

    for idx, (art, cand) in enumerate(zip(articles, candidates)):
        best_signal, best_cross = cand["signal"], cand["cross"]
        if best_signal is not None and signal_owners.get(cand["topic"]) == idx:
            art["divergenceProvider"] = best_signal["provider"]
            art["divergenceStatus"] = best_signal["status"]
            art["divergenceDelta"] = best_signal["delta"]
            art["divergenceTopic"] = cand["topic"]
        if best_cross is not None and cross_owners.get(cand["cross_topic"]) == idx:
            art["crossMarketStatus"] = best_cross["crossStatus"]
            art["crossMarketDelta"] = best_cross["crossDelta"]
            art["polymarketImplied"] = best_cross["polymarketImplied"]
            art["kalshiImplied"] = best_cross["kalshiImplied"]
            art["crossMarketTopic"] = cand["cross_topic"]

    return articles
