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

import asyncio
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin

import aiohttp

logger = logging.getLogger(__name__)

# Some publishers serve a stripped page, or a 403, to an unfamiliar client.
# feedparser already identifies itself; this fetch should be equally honest.
_UA = os.getenv(
    "OG_IMAGE_USER_AGENT",
    "Mozilla/5.0 (compatible; IntegraMarketsBot/1.0; +https://integramarkets.app)",
)

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


# =====================================================================
# og:image — the expensive half
#
# `extract_image_url` above costs nothing but only works when the feed ships a
# media element. Measured against the live feeds on 2026-09-07:
#
#   finance.yahoo.com   50 items   50 x media:content    <- covered
#   oilprice.com        15 items   none
#   www.cnbc.com        30 items   none
#   feeds.bloomberg.com 20 items   none
#   www.investing.com   10 items   none
#   www.kitco.com       feed 404s entirely
#
# So RSS media fields cover Yahoo and essentially nothing else. #33 deferred
# this pending exactly that measurement; the measurement says it is required.
#
# The original implementation was removed for a good reason: it scraped
# og:image on the REQUEST path, adding a network round-trip per article to
# every feed load. This runs at INGEST instead, in the scheduler process, so
# the cost lands on a background job that already takes seconds and never on a
# user waiting for cards.
#
# Bounded on every axis, because an ingest tick must finish inside its
# 10-minute interval no matter how badly a publisher misbehaves:
#   per-request timeout, a cap on bytes read, a ceiling on concurrency, and a
#   whole-batch deadline after which the remaining articles simply keep their
#   brand-mark fallback.

# og:image lives in <head>. Reading the whole article body would multiply
# bandwidth for nothing, so stop once the head is certainly past.
OG_MAX_BYTES = int(os.getenv("OG_IMAGE_MAX_BYTES", "131072"))  # 128 KB
OG_TIMEOUT_S = float(os.getenv("OG_IMAGE_TIMEOUT_S", "6"))
OG_CONCURRENCY = int(os.getenv("OG_IMAGE_CONCURRENCY", "8"))
# Whole-batch ceiling. 50 articles / 8 at a time / 6s worst case is ~40s; this
# leaves generous headroom while still capping a pathological tick.
OG_BATCH_BUDGET_S = float(os.getenv("OG_IMAGE_BATCH_BUDGET_S", "90"))

# Google News RSS links are opaque redirect stubs (news.google.com/rss/articles/
# CBMi...). Fetching one yields a JS redirect shell with no og:image, so it is
# a guaranteed-wasted round trip rather than a possible win.
_OPAQUE_HOSTS = ("news.google.com",)

_META_RE = re.compile(
    r"""<meta[^>]+?
        (?:property|name)\s*=\s*["'](og:image(?::url)?|twitter:image(?::src)?)["']
        [^>]*?>""",
    re.IGNORECASE | re.VERBOSE,
)
_CONTENT_RE = re.compile(r"""content\s*=\s*["']([^"']+)["']""", re.IGNORECASE)
# <head> is closed — anything after it cannot contain the tags we want.
_HEAD_END_RE = re.compile(r"</head\s*>", re.IGNORECASE)


def _parse_og_image(html: str, base_url: str) -> str:
    """Pull og:image (or twitter:image) out of an HTML head fragment.

    Regex rather than BeautifulSoup: this runs over a truncated, frequently
    malformed fragment where a real parser's error recovery buys nothing, and
    the tag shape here is rigid. Attribute order varies between publishers, so
    the property and the content are matched separately.
    """
    for tag in _META_RE.finditer(html):
        content = _CONTENT_RE.search(tag.group(0))
        if not content:
            continue
        url = content.group(1).strip()
        if not url:
            continue
        # Publishers routinely ship protocol-relative or root-relative URLs.
        if url.startswith("//"):
            url = "https:" + url
        elif url.startswith("/"):
            url = urljoin(base_url, url)
        if _usable(url):
            return url
    return ""


async def _fetch_one(session: Any, url: str, semaphore: Any) -> str:
    """og:image for a single article URL. Returns "" on any failure."""
    if not url or any(host in url for host in _OPAQUE_HOSTS):
        return ""
    try:
        async with semaphore:
            timeout = aiohttp.ClientTimeout(total=OG_TIMEOUT_S)
            async with session.get(
                url,
                timeout=timeout,
                allow_redirects=True,
                headers={"User-Agent": _UA},
            ) as resp:
                if resp.status != 200:
                    return ""
                ctype = (resp.headers.get("Content-Type") or "").lower()
                if "html" not in ctype:
                    return ""

                chunks: list[bytes] = []
                total = 0
                async for chunk in resp.content.iter_chunked(16384):
                    chunks.append(chunk)
                    total += len(chunk)
                    # Stop at </head>, or at the byte cap — whichever first.
                    if total >= OG_MAX_BYTES:
                        break
                    if _HEAD_END_RE.search(
                        b"".join(chunks[-2:]).decode("utf-8", "ignore")
                    ):
                        break
                html = b"".join(chunks).decode("utf-8", "ignore")
                return _parse_og_image(html, str(resp.url))
    except Exception as exc:  # noqa: BLE001 — best-effort by contract
        logger.debug("og:image fetch failed for %s: %s", url, exc)
        return ""


async def enrich_missing_images(articles: list) -> dict:
    """Fill in `image_url` for articles the RSS feed gave no image for.

    Mutates `articles` in place and returns counters for the caller to log.
    Articles that already carry an image are never re-fetched, so the cost
    scales with the sources that actually need help — Yahoo pays nothing.

    Never raises: images are decoration, and a publisher being slow or hostile
    must not stop news from being archived.
    """
    counters: Dict[str, Any] = {
        "considered": 0,
        "fetched": 0,
        "found": 0,
        "timed_out": False,
    }

    # Article dicts use `url` in some fetchers and `link` in others.
    pairs: List[Tuple[Dict[str, Any], str]] = []
    for a in articles:
        if not isinstance(a, dict) or a.get("image_url"):
            continue
        link = a.get("url") or a.get("link")
        if link:
            pairs.append((a, link))

    counters["considered"] = len(pairs)
    if not pairs:
        return counters

    try:
        semaphore = asyncio.Semaphore(OG_CONCURRENCY)
        async with aiohttp.ClientSession() as session:
            tasks = [_fetch_one(session, link, semaphore) for _, link in pairs]
            results = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=OG_BATCH_BUDGET_S,
            )
    except asyncio.TimeoutError:
        counters["timed_out"] = True
        logger.warning(
            "og:image: batch exceeded %ss budget for %d articles — "
            "remaining articles keep the brand-mark fallback",
            OG_BATCH_BUDGET_S,
            len(pairs),
        )
        return counters
    except Exception as exc:  # noqa: BLE001
        logger.warning("og:image: batch failed: %s", exc)
        return counters

    counters["fetched"] = len(results)
    for (article, _), image in zip(pairs, results):
        if isinstance(image, str) and image:
            article["image_url"] = image
            counters["found"] += 1

    logger.info(
        "og:image: %d/%d articles gained an image",
        counters["found"],
        counters["considered"],
    )
    return counters
