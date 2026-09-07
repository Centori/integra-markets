"""Card images: pull the image URL out of an RSS entry, with no extra HTTP.

Why this exists
---------------
Every article card in production renders the Integra brand mark. That mark is
meant to be the fallback shown *in the absence of* an image, but on 2026-08-25
it was showing on 100% of cards because there was no image to fall back from.

Three things had gone missing when the feed was rewritten to read from the
store:

  * `data_sources.enrich_images` / `_extract_image` were deleted outright --
    `build64-exact` had 15 references, `main` had none anywhere in the backend;
  * the og:image backfill call in `api/news_feed.py` went with them;
  * `feed_store._to_article` never emitted an `image_url` key at all.

And the image could not be recovered from storage either: `archive_writer` put
categories/tickers/keywords/commodity/enhanced/word_count into `raw_payload`,
never an image, so the URL was discarded at ingest and never persisted.

This module restores the cheap half. It reads fields feedparser has already
parsed -- no network call, no added latency -- so capturing at ingest costs
nothing and fixes the archive going forward. The expensive half (scraping
og:image for rows that have no stored image) is deliberately not reintroduced
here: it belongs behind a decision about whether RSS media fields already
cover enough sources.

Returns "" rather than None when a feed carries no image, so callers can treat
the value as a plain string and the client keeps rendering the brand mark.
"""

from __future__ import annotations

import re
from typing import Any, Optional

# An <img> inside the description, which is how several commodity feeds ship
# their lede image when they set no media element.
_IMG_SRC_RE = re.compile(r"""<img[^>]+src=["']([^"']+)["']""", re.IGNORECASE)

# Tracking pixels and spacers are common in RSS descriptions and are worse than
# no image: they render as a 1x1 smudge rather than falling back to the brand.
_JUNK_RE = re.compile(
    r"(?:^|/)(?:pixel|spacer|blank|dot|1x1|transparent)\.(?:gif|png)|"
    r"doubleclick\.net|"
    r"feedburner|feeds\.feedburner\.com/~ff|"
    r"stats\.wordpress\.com|"
    r"\.gif\?",
    re.IGNORECASE,
)


def _usable(url: Optional[str]) -> bool:
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    if not url.lower().startswith(("http://", "https://")):
        return False
    return not _JUNK_RE.search(url)


def extract_image_url(entry: Any) -> str:
    """Best-effort image URL from a feedparser entry. Zero extra HTTP.

    Checks media:content, media:thumbnail, image enclosures, then an <img> in
    the summary HTML, in that order -- most explicit signal first. Returns ""
    when the feed carries no usable image.

    Never raises: a malformed entry must not take a whole fetch down with it.
    """
    try:
        for media in (getattr(entry, "media_content", None) or []):
            if isinstance(media, dict) and _usable(media.get("url")):
                return media["url"].strip()

        for thumb in (getattr(entry, "media_thumbnail", None) or []):
            if isinstance(thumb, dict) and _usable(thumb.get("url")):
                return thumb["url"].strip()

        for enc in (getattr(entry, "enclosures", None) or []):
            if not isinstance(enc, dict):
                continue
            href = enc.get("href") or enc.get("url")
            if str(enc.get("type", "")).startswith("image") and _usable(href):
                return href.strip()

        summary = getattr(entry, "summary", "") or ""
        match = _IMG_SRC_RE.search(str(summary))
        if match and _usable(match.group(1)):
            return match.group(1).strip()
    except Exception:  # noqa: BLE001 - best-effort by contract
        pass
    return ""
