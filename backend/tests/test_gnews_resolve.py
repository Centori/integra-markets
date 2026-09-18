"""Google News URLs must resolve, and must fail safely when they cannot.

The resolver talks to an undocumented Google endpoint whose scheme has already
changed once. That makes two properties matter more than the happy path:

  1. Every failure returns the ORIGINAL url. An unresolved article is exactly
     as good as today's behaviour; a mangled one is worse than doing nothing.
  2. The article dict is MUTATED, not rebuilt. Rebuilding field-by-field is
     how image_url was silently dropped from this same pipeline once already.

These tests are offline. The live behaviour is asserted by
jobs/pipeline_health.py, which watches the resolution ratio in production —
the thing that will actually notice when Google changes the scheme again.
"""

from __future__ import annotations

import asyncio

from services.gnews_resolve import is_google_news_url, resolve_batch

GN = "https://news.google.com/rss/articles/CBMiTOKEN123?oc=5"
REAL = "https://www.reuters.com/business/energy/some-story"


def test_recognises_google_news_urls():
    assert is_google_news_url(GN)
    assert not is_google_news_url(REAL)
    assert not is_google_news_url("")
    assert not is_google_news_url(None)
    # A google news URL that is not an article link has no token to resolve.
    assert not is_google_news_url("https://news.google.com/topics/xyz")


def test_non_google_articles_are_left_alone():
    articles = [{"url": REAL, "title": "t"}]
    counters = asyncio.run(resolve_batch(articles))
    assert counters["candidates"] == 0
    assert articles[0]["url"] == REAL
    assert "source_feed_url" not in articles[0]


def test_failure_preserves_the_original_url(monkeypatch):
    """The property that makes this safe to deploy at all."""
    async def _explode(session, url, semaphore):
        raise RuntimeError("google changed everything")

    monkeypatch.setattr("services.gnews_resolve._resolve_one", _explode)
    articles = [{"url": GN, "title": "t"}]
    counters = asyncio.run(resolve_batch(articles))

    assert articles[0]["url"] == GN, "a failed resolve must not damage the url"
    assert counters["resolved"] == 0
    assert counters["unresolved"] == 1


def test_success_mutates_and_keeps_an_audit_trail(monkeypatch):
    async def _ok(session, url, semaphore):
        return REAL

    monkeypatch.setattr("services.gnews_resolve._resolve_one", _ok)
    articles = [{"url": GN, "title": "t", "image_url": "keep-me"}]
    counters = asyncio.run(resolve_batch(articles))

    assert articles[0]["url"] == REAL
    assert articles[0]["source_feed_url"] == GN
    # Mutation, not reconstruction: unrelated keys survive.
    assert articles[0]["image_url"] == "keep-me"
    assert counters["resolved"] == 1


def test_mixed_batch_counts_correctly(monkeypatch):
    async def _half(session, url, semaphore):
        return REAL if url.endswith("A?oc=5") else url

    monkeypatch.setattr("services.gnews_resolve._resolve_one", _half)
    articles = [
        {"url": "https://news.google.com/rss/articles/A?oc=5"},
        {"url": "https://news.google.com/rss/articles/B?oc=5"},
        {"url": REAL},
    ]
    counters = asyncio.run(resolve_batch(articles))
    assert counters == {"candidates": 2, "resolved": 1, "unresolved": 1}
