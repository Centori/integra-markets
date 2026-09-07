"""Reads the news feed out of `raw_documents` — the store the ingest cron writes.

The inconsistency this fixes
----------------------------
Before this module the two surfaces read from two different corpora:

    notifications  ->  GET  /api/news/latest  ->  raw_documents  (cron-written)
    the news feed  ->  POST /api/news/feed    ->  live RSS fetched per request

`alertMonitoringService.js` polls /news/latest, so a push notification could
only ever be about a story in the database. The feed, meanwhile, re-fetched
five RSS feeds inside the request and applied its own filter. Nothing
guaranteed the two sets overlapped, which is exactly the reported symptom:
notifications arrive for stories that open fine in Integra Analysis (that view
resolves from the database) but never appear as cards in the feed.

Measured on production 2026-08-17, POST /api/news/feed returned:

  #  source               published            headline
  0  oilprice             Mon 17 Aug 02:50     Indian Oil Giant Secures U.S. License...
  6  reuters_commodities  Fri 24 Apr 07:00     Kalshi Taps Pyth Network To Settle...
  7  reuters_commodities  Mon 09 Mar 07:00     First Thing Today | Grain markets rally...
 13  reuters_commodities  Sun 01 Mar 08:00     What the Iran attack means for oil...
 14  investing            Aug 17, 2026 07:37   Oil Near $90 on Escalating Middle East Risks

Five-month-old articles above a story published ninety minutes earlier, and
28.5 seconds to answer. Three separate causes:

  * `_fetch_from_rss` sorted by `relevance_score`, which is only ever 0.9 or
    0.5. Every returned article scored 0.9, so the sort was a no-op and the
    order was really "whichever feed I looped over first" — a stable sort over
    a constant key.
  * `published` was passed through as the publisher's raw string in four
    mutually incompatible formats and never parsed, so neither server nor
    client could order by it.
  * `hours_back` was clamped per tier, reported back in `applied_limits`, and
    then never applied to anything.

The fix is the ordinary shape of a real-time feed: one writer (the ingest
cron), many readers, and the read path does nothing but order, window, filter
and page a store that is already populated. No upstream fetch inside a user
request.

`raw_documents` turns out to be strictly the better source anyway — real
`timestamptz` publish dates, a `url_hash` dedup key, article body text
averaging 384 characters, sentiment already scored in `sentiment_scores`, and
four live sources including Reuters, which the request-time path cannot reach
at all (Google News answers 503 to datacenter IPs).
"""

from __future__ import annotations

import datetime as dt
import logging
import re
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple

logger = logging.getLogger(__name__)

# Fetch this many candidate rows per requested article so that preference
# filtering and dedup still have material to work with. Preference matching
# needs word boundaries, which PostgREST cannot express, so it happens here
# over a candidate page rather than in the query.
_CANDIDATE_MULTIPLIER = 12
_CANDIDATE_CEILING = 600

# Widening ladder, in hours. A strict 12-hour window currently holds only 17
# articles (production, 2026-08-17) and cannot fill a 20-card feed, so we widen
# until the target is met — never past the tier's own history allowance, which
# stays the hard ceiling. Freshest content still sorts to the top; widening
# only decides how far down the list continues.
_WIDEN_LADDER_HOURS = (12, 24, 48, 168, 720)

# Sentiment vocabulary the mobile client switches on. NewsCard.tsx maps
# BULLISH/BEARISH/NEUTRAL to colour and icon and falls through to grey for
# anything else — so the request-time path's POSITIVE/NEGATIVE labels rendered
# every directional article as an unstyled grey card reading "POSITIVE".
# `sentiment_scores` already stores the right three words.
_SENTIMENT_LABELS = {
    "bullish": "BULLISH",
    "bearish": "BEARISH",
    "neutral": "NEUTRAL",
    # Tolerated aliases from older rows / other writers.
    "positive": "BULLISH",
    "negative": "BEARISH",
}


def _normalize_sentiment(raw: Any) -> str:
    return _SENTIMENT_LABELS.get(str(raw or "").strip().lower(), "NEUTRAL")


def _term_pattern(term: str) -> Optional[re.Pattern]:
    """Word-boundary matcher for one preference term.

    Substring matching is what made the web surface flag every article
    containing "Tin" — including *pla{tin}um*, *rou{tin}e* and *un{tin}ted*.
    Word boundaries keep "Tin" matching "tin prices" and not "platinum",
    while still allowing multi-word terms like "natural gas".
    """
    cleaned = (term or "").strip()
    if not cleaned:
        return None
    try:
        return re.compile(r"\b" + r"\s+".join(re.escape(p) for p in cleaned.split()) + r"\b",
                          re.IGNORECASE)
    except re.error:  # pathological user input
        return None


def _compile_terms(terms: Iterable[str]) -> List[Tuple[str, re.Pattern]]:
    out: List[Tuple[str, re.Pattern]] = []
    for t in terms or []:
        pat = _term_pattern(t)
        if pat is not None:
            out.append((t, pat))
    return out


def _searchable_text(row: Dict[str, Any]) -> str:
    """Everything worth matching a preference against.

    Title and body, plus the metadata the ingest cron already extracted into
    `raw_payload` (commodity, keywords, categories, tickers) — matching only
    the title, as the old path did, dropped any article that named its
    commodity solely in the body.
    """
    parts: List[str] = [str(row.get("title") or ""), str(row.get("content") or "")]
    payload = row.get("raw_payload")
    if isinstance(payload, dict):
        for key in ("commodity", "keywords", "categories", "tickers"):
            value = payload.get(key)
            if isinstance(value, str):
                parts.append(value)
            elif isinstance(value, (list, tuple)):
                parts.extend(str(v) for v in value if v)
    return " ".join(parts)


def _title_key(title: str) -> str:
    """Normalised title, for catching the same story syndicated twice."""
    return re.sub(r"\W+", " ", str(title or "")).strip().lower()


def _to_article(row: Dict[str, Any],
                sentiment: Optional[Dict[str, Any]],
                matched: Sequence[str]) -> Dict[str, Any]:
    """Map a `raw_documents` row into the shape the clients already consume.

    Field names are unchanged from the request-time response so no client
    rebuild is needed: mobile `fetchNewsAnalysis` reads title/summary/source/
    url/sentiment/sentiment_score, and NewsCard renders them directly.
    """
    published = row.get("published_at")
    content = (row.get("content") or "").strip()
    title = row.get("title") or ""

    score = None
    label = None
    if sentiment:
        label = sentiment.get("sentiment")
        raw_score = sentiment.get("score")
        if raw_score is not None:
            try:
                score = round(float(raw_score), 2)
            except (TypeError, ValueError):
                score = None

    return {
        "id": row.get("id"),
        "title": title,
        # Body text where we have it, else the headline — same contract as
        # before, but sourced from the cron's stored content rather than a
        # per-request scrape that kept returning publisher disclaimers.
        "summary": content or title,
        "source": row.get("source") or "unknown",
        "url": row.get("url"),
        # Card image. The store reader emitted no image_url key at all, so
        # NewsCard fell back to the brand mark on 100% of cards rather than
        # on the articles that genuinely have no image. Rows archived before
        # image capture landed carry no image and still fall back — correctly.
        "image_url": (row.get("raw_payload") or {}).get("image_url") or None,
        # ISO 8601 UTC, always. The old response mixed '-0500', ' EST ',
        # 'GMT' and 'Aug 17, 2026 07:37 GMT' in one payload.
        "published": published,
        "time_published": published,
        "sentiment": _normalize_sentiment(label),
        "sentiment_score": score if score is not None else 0.5,
        # Retained for client compatibility. Ordering is by time now, so this
        # is a match-strength hint, not a sort key.
        "relevance_score": 0.9 if matched else 0.5,
        "related_commodities": list(matched),
        "is_alert": bool(matched) and _normalize_sentiment(label) != "NEUTRAL",
        "alert_type": "high_impact" if matched and label in ("bullish", "bearish") else None,
    }


def _fetch_sentiments(supabase, doc_ids: Sequence[str]) -> Dict[str, Dict[str, Any]]:
    """Newest sentiment score per document id. Never raises."""
    if not doc_ids:
        return {}
    out: Dict[str, Dict[str, Any]] = {}
    try:
        resp = (
            supabase.table("sentiment_scores")
            .select("document_id,sentiment,score,confidence,scored_at")
            .in_("document_id", list(doc_ids))
            .order("scored_at", desc=True)
            .execute()
        )
        for row in getattr(resp, "data", None) or []:
            # Rows arrive newest-first, so the first sighting of a document is
            # its current score and later re-scorings are ignored.
            out.setdefault(row["document_id"], row)
    except Exception as exc:  # noqa: BLE001
        logger.warning("sentiment_scores lookup failed, cards will show neutral: %s", exc)
    return out


def _fetch_candidates(supabase, since: dt.datetime, limit: int) -> List[Dict[str, Any]]:
    resp = (
        supabase.table("raw_documents")
        .select("id,title,content,source,url,url_hash,published_at,raw_payload")
        .eq("source_type", "news")
        .gte("published_at", since.isoformat())
        .order("published_at", desc=True)
        .limit(limit)
        .execute()
    )
    return getattr(resp, "data", None) or []


def fetch_feed(
    supabase,
    *,
    hours_back: int,
    max_articles: int,
    commodities: Optional[Sequence[str]] = None,
    keywords: Optional[Sequence[str]] = None,
) -> Dict[str, Any]:
    """The feed: newest first, windowed, deduped, personalised.

    `hours_back` is the tier-clamped ceiling and is genuinely enforced — no
    article older than the window can appear, which is what makes the free
    tier's one-day history limit real.

    Returns {"articles": [...], "window_hours": int, "personalized": bool,
             "matched": int, "total_candidates": int}.
    """
    terms = _compile_terms(list(commodities or []) + list(keywords or []))
    now = dt.datetime.now(dt.timezone.utc)

    # Only widen within what the tier permits; the requested window is the
    # starting point, never something to exceed.
    ladder = [h for h in _WIDEN_LADDER_HOURS if h < hours_back] + [hours_back]

    articles: List[Dict[str, Any]] = []
    window_used = hours_back
    total_candidates = 0
    matched_count = 0

    for window in ladder:
        candidate_limit = min(max_articles * _CANDIDATE_MULTIPLIER, _CANDIDATE_CEILING)
        try:
            rows = _fetch_candidates(supabase, now - dt.timedelta(hours=window), candidate_limit)
        except Exception as exc:  # noqa: BLE001
            logger.warning("raw_documents feed query failed at window=%sh: %s", window, exc)
            rows = []

        total_candidates = len(rows)
        seen_urls: Set[str] = set()
        seen_titles: Set[str] = set()
        matched: List[Dict[str, Any]] = []
        unmatched: List[Dict[str, Any]] = []

        for row in rows:
            # Dedup: the same story reaches us from more than one source, and
            # `raw_documents` is unique only on (source, url_hash) so
            # cross-source duplicates do exist. Rows arrive newest-first, so
            # the copy we keep is the most recently published one.
            url_key = row.get("url_hash") or row.get("url")
            title_key = _title_key(row.get("title"))
            if (url_key and url_key in seen_urls) or (title_key and title_key in seen_titles):
                continue
            if url_key:
                seen_urls.add(url_key)
            if title_key:
                seen_titles.add(title_key)

            if terms:
                text = _searchable_text(row)
                hits = [name for name, pat in terms if pat.search(text)]
            else:
                hits = []

            (matched if hits else unmatched).append((row, hits))

        matched_count = len(matched)

        # Preference matches first, then the rest of the window to fill the
        # list — a personalised feed that renders four cards is worse than one
        # that leads with those four and continues with general market news.
        ordered = matched + unmatched if terms else unmatched
        selected = ordered[:max_articles]

        # Restore strict recency within whatever we selected. Sorting last
        # means the ordering the user sees is always newest-first, regardless
        # of how the selection was assembled.
        selected.sort(key=lambda pair: str(pair[0].get("published_at") or ""), reverse=True)

        sentiments = _fetch_sentiments(supabase, [r.get("id") for r, _ in selected if r.get("id")])
        articles = [
            _to_article(row, sentiments.get(row.get("id")), hits)
            for row, hits in selected
        ]
        window_used = window

        if len(articles) >= max_articles:
            break

    return {
        "articles": articles,
        "window_hours": window_used,
        "personalized": bool(terms),
        "matched": matched_count,
        "total_candidates": total_candidates,
    }
