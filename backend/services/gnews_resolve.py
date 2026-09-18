"""Turn a Google News redirect URL into the publisher's real one.

WHY THIS IS THE ROOT OF FOUR BUGS. Google News RSS gives every item a URL on
news.google.com whose path is an opaque signed token:

    https://news.google.com/rss/articles/CBMixgFBVV95cUxNcURZNjNnNmxfaFdu…

Nothing can be read from that. Measured against the live feed on 2026-09-11,
8 of 12 cards were affected, and every downstream symptom traces to it:

  * `summary` equals `title` — there is no body to store, so best_summary()
    correctly falls back to the headline, and the card prints it twice.
  * `image_url` is empty — feed_images lists news.google.com in _OPAQUE_HOSTS
    and skips it, because scraping og:image off a redirect shell yields Google's
    own artwork.
  * `key_drivers` are generic ("oil", "supply") — the engine is scoring a
    headline, since that is all it was given.
  * The archive stores a link that will rot, not the publisher's canonical URL.

Fixing the URL at ingest fixes all four, because all four are the same missing
fact.

HOW IT WORKS, AND WHY IT LOOKS LIKE THIS. The token used to be base64 of the
target URL; that format is gone. The current one decodes to a protobuf carrying
an `AU_yqL…` payload with no URL in it, so resolution requires asking Google:

  1. GET the article page. It carries `data-n-a-sg` (a signature) and
     `data-n-a-ts` (a timestamp) for that token.
  2. POST both to /_/DotsSplashUi/data/batchexecute, whose response contains
     the publisher URL.

Two round trips per article. That is why this runs at ingest on a cron and
never on a request path.

THIS WILL BREAK EVENTUALLY. It is an undocumented internal endpoint and Google
has already changed the scheme once. Every failure path therefore returns the
ORIGINAL url unchanged: an unresolved article is exactly as good as it is today,
never worse, and the pipeline does not care. `resolve_batch` reports counters so
the health job can notice the success rate collapsing rather than discovering it
through a customer.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

GNEWS_HOST = "news.google.com"
_BATCH_URL = "https://news.google.com/_/DotsSplashUi/data/batchexecute"

# Bounded the same way feed_images is, and for the same reason: a background
# tick must not be stallable by a slow upstream.
GN_TIMEOUT_S = float(os.getenv("GNEWS_RESOLVE_TIMEOUT_S", "8"))
GN_CONCURRENCY = int(os.getenv("GNEWS_RESOLVE_CONCURRENCY", "4"))
GN_BATCH_BUDGET_S = float(os.getenv("GNEWS_RESOLVE_BATCH_BUDGET_S", "120"))
GN_MAX_BYTES = int(os.getenv("GNEWS_RESOLVE_MAX_BYTES", "1048576"))  # 1 MB

# A browser UA. The endpoint serves a different, useless page to obvious bots,
# and the signature attributes are absent from it.
_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Consent interstitial. From an EU/UK/NG egress — which is where this runs —
# a plain request is redirected to consent.google.com and served a cookie wall
# instead of the article page, so the signature attributes are simply absent.
# The first version of this failed exactly there, and (correctly) returned the
# unresolved URL rather than guessing.
#
# `ucbcb=1` on the request skips it. The SOCS cookie does the same job and is
# sent as well: two independent bypasses, because either could be retired
# without notice and the cost of carrying both is nothing.
_CONSENT_PARAM = "ucbcb=1"
_CONSENT_COOKIE = "SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg"

_SIG_RE = re.compile(r'data-n-a-sg="([^"]+)"')
_TS_RE = re.compile(r'data-n-a-ts="([^"]+)"')
# Any absolute URL that is not Google's own. The batchexecute response is a
# JSON-ish blob with escaping, so this is more robust than parsing it.
_TARGET_RE = re.compile(r'https?://(?!news\.google\.|www\.google\.|lh\d\.google)[^\s"\\\']+')


def is_google_news_url(url: Optional[str]) -> bool:
    return bool(url) and GNEWS_HOST in url and "/articles/" in url


def _token(url: str) -> Optional[str]:
    try:
        return url.split("/articles/")[1].split("?")[0]
    except IndexError:
        return None


async def _read_capped(response: Any) -> str:
    """Read a response body up to GN_MAX_BYTES.

    The article page is ~600 KB of Google's app shell. Without a cap a single
    oversized response could hold a slot for the whole batch budget.
    """
    chunks: List[bytes] = []
    total = 0
    async for chunk in response.content.iter_chunked(16384):
        chunks.append(chunk)
        total += len(chunk)
        if total >= GN_MAX_BYTES:
            break
    return b"".join(chunks).decode("utf-8", "replace")


async def _resolve_one(session: Any, url: str, semaphore: Any) -> str:
    """Resolve one URL, or return it unchanged. Never raises."""
    import aiohttp

    if not is_google_news_url(url):
        return url
    token = _token(url)
    if not token:
        return url

    timeout = aiohttp.ClientTimeout(total=GN_TIMEOUT_S)
    headers = {"User-Agent": _UA, "Cookie": _CONSENT_COOKIE}
    article_url = url + ("&" if "?" in url else "?") + _CONSENT_PARAM

    async with semaphore:
        try:
            async with session.get(article_url, timeout=timeout, headers=headers, allow_redirects=True) as resp:
                if resp.status != 200:
                    return url
                html = await _read_capped(resp)

            sig = _SIG_RE.search(html)
            ts = _TS_RE.search(html)
            if not sig or not ts:
                # Loud: this means the resolver has stopped working entirely,
                # not that one article is odd. Two known causes — Google
                # changed the page shape, or the consent bypass above stopped
                # working and we are reading consent.google.com's cookie wall.
                logger.warning(
                    "gnews_resolve: signature attributes missing (served by %s) — "
                    "scheme or consent bypass may have changed",
                    resp.url.host if hasattr(resp, "url") else "unknown",
                )
                return url

            inner = json.dumps(
                [
                    "garturlreq",
                    [
                        ["X", "X", ["X", "X"], None, None, 1, 1, "US:en", None, 1,
                         None, None, None, None, None, 0, 1],
                        "X", "X", 1, [1, 1, 1], 1, 1, None, 0, 0, None, 0,
                    ],
                    token,
                    int(ts.group(1)),
                    sig.group(1),
                ]
            )
            payload = json.dumps([[["Fbv4je", inner, None, "generic"]]])

            async with session.post(
                _BATCH_URL,
                data=urlencode({"f.req": payload}),
                timeout=timeout,
                headers={
                    **headers,
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                },
            ) as resp:
                if resp.status != 200:
                    return url
                body = await _read_capped(resp)

            match = _TARGET_RE.search(body)
            if not match:
                return url
            # Trailing punctuation from the surrounding JSON escaping.
            return match.group(0).rstrip('\\",')
        except Exception as exc:  # noqa: BLE001 — resolution must never break ingest
            logger.debug("gnews_resolve: %s failed: %s", url[:80], exc)
            return url


async def resolve_batch(articles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Rewrite `url` in place for every Google News item. Returns counters.

    Articles are mutated rather than rebuilt: rebuilding a dict field-by-field
    is how image_url was silently dropped from this same pipeline once already.
    """
    import aiohttp

    targets = [a for a in articles if is_google_news_url(a.get("url"))]
    counters = {"candidates": len(targets), "resolved": 0, "unresolved": 0}
    if not targets:
        return counters

    semaphore = asyncio.Semaphore(GN_CONCURRENCY)
    try:
        async with aiohttp.ClientSession() as session:
            resolved = await asyncio.wait_for(
                asyncio.gather(
                    *(_resolve_one(session, a["url"], semaphore) for a in targets),
                    return_exceptions=True,
                ),
                timeout=GN_BATCH_BUDGET_S,
            )
    except asyncio.TimeoutError:
        logger.warning("gnews_resolve: batch exceeded %.0fs budget", GN_BATCH_BUDGET_S)
        counters["unresolved"] = len(targets)
        counters["timed_out"] = True
        return counters

    for article, new_url in zip(targets, resolved):
        if isinstance(new_url, str) and new_url and new_url != article["url"]:
            # Keep the original. The archive should be able to say where an
            # item came from, and a resolver this fragile deserves an audit
            # trail when a URL turns out wrong.
            article["source_feed_url"] = article["url"]
            article["url"] = new_url
            counters["resolved"] += 1
        else:
            counters["unresolved"] += 1

    logger.info(
        "gnews_resolve: %d/%d resolved", counters["resolved"], counters["candidates"]
    )
    return counters
