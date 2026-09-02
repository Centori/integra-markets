"""The one place the sentiment analyser is built.

Why this module exists
----------------------
The lexicon-enriched VADER analyser used to be constructed inside
`main_simple_nlp.lifespan()` — a FastAPI startup hook — and assigned to a
module-level global that starts as `None`:

    vader_analyzer = None            # main_simple_nlp.py, import time

    async def lifespan(app):
        global vader_analyzer
        vader_analyzer = SentimentIntensityAnalyzer()
        vader_analyzer.lexicon.update(...)   # Henry + SentiBignomics

`jobs/archive_scorer.py` then did:

    from main_simple_nlp import vader_analyzer

A `from X import y` copies the value **at import time**. The scorer is a
standalone job, so `lifespan()` never ran, the copy was `None` forever, and
`if vader:` silently routed every document to `basic_sentiment_analysis` — a
20-word keyword list. 96% of the archive (60,225 of 62,771 rows) was scored
that way while carrying `model_name="vader_v2_commodity"`.

The failure was invisible because every layer degraded quietly: the global was
legitimately `None` before startup, the `if` was a legitimate guard, and the
fallback returned well-formed output. Nothing raised.

So: construction lives here, behind a function, and callers ask for it by
calling. There is no importable global to copy, and no way to get a
lexicon-less analyser by accident — `get_analyzer()` raises if the lexicons
cannot be loaded rather than returning a weaker engine that looks the same.
"""
from __future__ import annotations

import html
import logging
import re
import threading
from typing import Optional

logger = logging.getLogger(__name__)

# Tuning constants. These belong with the analyser, not with the web app.
# Changing any of them changes scores and REQUIRES a new model version — see
# services/archive_writer.ACTIVE_MODEL_VERSION.
HENRY_SCALE: float = 2.0
SENTIBIG_SCALE: float = 0.1
SENTIMENT_THRESHOLD: float = 0.33

_analyzer = None
_lock = threading.Lock()


class LexiconUnavailable(RuntimeError):
    """Raised when the finance lexicons cannot be loaded.

    Deliberately fatal. A silent downgrade to plain VADER (or worse, to keyword
    matching) is what corrupted the archive: the product's stated accuracy
    comes from the lexicons, so an engine without them is not a degraded
    version of this product, it is a different one.
    """


def get_analyzer():
    """Return the process-wide lexicon-enriched VADER analyser.

    Built once, lazily, and cached. Safe to call from a request handler, a
    cron job, or a test.
    """
    global _analyzer
    if _analyzer is not None:
        return _analyzer

    with _lock:
        if _analyzer is not None:  # another thread won the race
            return _analyzer

        try:
            import nltk
            from nltk.sentiment.vader import SentimentIntensityAnalyzer
        except ImportError as exc:  # pragma: no cover - environment issue
            raise LexiconUnavailable(f"NLTK is not installed: {exc}") from exc

        try:
            nltk.data.find("sentiment/vader_lexicon.zip")
        except LookupError:
            logger.info("downloading VADER lexicon")
            nltk.download("vader_lexicon", quiet=True)

        analyzer = SentimentIntensityAnalyzer()
        base_size = len(analyzer.lexicon)

        try:
            from services.lexicons import HENRY, SENTI_BIG_NOMICS
        except ImportError as exc:
            raise LexiconUnavailable(
                f"finance lexicons could not be imported: {exc}. "
                "Refusing to score with plain VADER."
            ) from exc

        # Merge order matters: SentiBignomics first, Henry second, so Henry's
        # curated values win on the ~40 keys where both define a term.
        analyzer.lexicon.update({k: v * SENTIBIG_SCALE for k, v in SENTI_BIG_NOMICS.items()})
        analyzer.lexicon.update({k: v * (HENRY_SCALE / 1.5) for k, v in HENRY.items()})

        # LAST, so it overrides all three sources: zero out general-English
        # polarity on words that are commodity vocabulary. `crude` (-2.70) and
        # `natural` (+1.50) are the commodity names themselves and biased their
        # own headlines in opposite directions. See domain_neutral.py.
        from services.lexicons.domain_neutral import DOMAIN_NEUTRAL

        analyzer.lexicon.update(DOMAIN_NEUTRAL)

        added = len(analyzer.lexicon) - base_size
        if added < 1000:
            raise LexiconUnavailable(
                f"lexicon merge added only {added} terms (expected thousands) — "
                "refusing to score with an incomplete lexicon"
            )

        logger.info(
            "sentiment engine ready: VADER %d terms + SentiBignomics %d + Henry %d = %d",
            base_size, len(SENTI_BIG_NOMICS), len(HENRY), len(analyzer.lexicon),
        )
        _analyzer = analyzer
        return _analyzer


_ENTITY_RE = re.compile(r"&(?:[a-zA-Z]+|#\d+);")


def clean_text(text: Optional[str]) -> str:
    """Normalise raw archive text before scoring.

    9.1% of stored titles carry raw HTML entities (`&#8217;`, `&amp;`) because
    nothing in the ingest path ever unescaped them. VADER tokenises on
    whitespace and punctuation, so `Gold&#8217;s` is not the token `gold's`
    and the term is simply missed.
    """
    if not text:
        return ""
    out = text
    # Twice: feeds double-encode (`&amp;#8217;`) often enough to matter.
    for _ in range(2):
        if not _ENTITY_RE.search(out):
            break
        out = html.unescape(out)
    return " ".join(out.split())


def vader_only_score(text: Optional[str]) -> dict:
    """VADER + lexicons ONLY. **Not the production scoring path.**

    Production scoring is `main_simple_nlp.analyze_market_sentiment`, which
    blends this lexicon signal with the per-commodity rulebook
    (`analyze_fundamental_direction`, SENTIMENT_RULE_COEF=0.22) that encodes
    domain knowledge general English cannot carry — an OPEC *output cut* is
    bullish for price, an inventory *build* is bearish, and VADER knows
    neither.

    The archive bypassed the lexicon AND the rulebook together, because both
    live behind the same `if vader:` guard. Using this helper as the scorer
    would restore one and keep losing the other, so it exists for diagnostics
    and tests only. Callers that write to `entity_mentions` must go through
    `analyze_market_sentiment`.

    Returns the signed compound alongside the label and confidence so callers
    never have to reconstruct direction from a magnitude — the mistake that
    made `entity_mentions.score` unusable as a signal.
    """
    cleaned = clean_text(text)
    if not cleaned:
        return {"sentiment": "neutral", "compound": 0.0, "confidence": 0.5, "scored": False}

    compound = get_analyzer().polarity_scores(cleaned)["compound"]
    if compound >= SENTIMENT_THRESHOLD:
        sentiment = "bullish"
    elif compound <= -SENTIMENT_THRESHOLD:
        sentiment = "bearish"
    else:
        sentiment = "neutral"

    # Confidence is magnitude mapped onto 0.5..1.0, matching the existing
    # column's meaning so historical and new rows stay comparable.
    confidence = round(0.5 + min(abs(compound), 1.0) / 2.0, 4)
    return {
        "sentiment": sentiment,
        "compound": round(compound, 4),
        "confidence": confidence,
        "scored": True,
    }
