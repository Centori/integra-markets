"""Tests for the user-facing health checks and og:image capture.

These cover the two failures that were invisible from outside the system: a
card that renders the brand mark because no image was ever sent, and a
refresh-summary button that answers 200 while doing nothing.
"""

from __future__ import annotations

import asyncio

import pytest

from jobs.pipeline_health import _looks_like_url_junk
from services.feed_images import _parse_og_image, _usable, enrich_missing_images


# ---------------------------------------------------------------- url junk
#
# Both directions matter. A detector that flags real prose is worse than none:
# it would fail the health check on every tick and get muted, which is exactly
# how ci.yml's lint step stopped meaning anything.


@pytest.mark.parametrize(
    "text",
    [
        "https://oilprice.com/Energy/Crude-Oil/some-article.html",
        "Read more at http://example.com/x",
        "2026-09-07_dugfykazbo_1200x675_cropped_image_name",
        "CBMiW0FVX3lxTE5DZmhkTFhxYm1qUUZuUmFhY0hkbXlS",
        "article_id_9f2b1c7e4a8d0b6f3e5c1a9d7b2f4e6c",
    ],
)
def test_flags_machine_junk(text):
    assert _looks_like_url_junk(text) is True


@pytest.mark.parametrize(
    "text",
    [
        "OPEC+ agreed to cut output by one million barrels per day from October.",
        "Gold slipped as the dollar firmed ahead of the Federal Reserve meeting.",
        # Long hyphenated prose — no digits, no underscore, must not trip.
        "The intergovernmental-cooperation-framework was described as unprecedented.",
        "Brent crude settled at $78.20 a barrel, up 1.4% on the session.",
        "",
    ],
)
def test_passes_real_prose(text):
    assert _looks_like_url_junk(text) is False


def test_long_word_without_digits_is_not_junk():
    """A 30+ character word is unusual but not machine output.

    The digit/underscore requirement is what separates a slug from a very long
    German compound or a chemical name; without it this check would fire on
    legitimate copy.
    """
    assert _looks_like_url_junk("counterrevolutionaries" * 2) is False


# ---------------------------------------------------------------- og:image


def test_parses_og_image():
    html = '<head><meta property="og:image" content="https://cdn.x.com/a.jpg"></head>'
    assert _parse_og_image(html, "https://x.com/story") == "https://cdn.x.com/a.jpg"


def test_attribute_order_does_not_matter():
    """Publishers put content= before property= often enough to matter."""
    html = '<meta content="https://cdn.x.com/b.jpg" property="og:image"/>'
    assert _parse_og_image(html, "https://x.com/s") == "https://cdn.x.com/b.jpg"


def test_falls_back_to_twitter_image():
    html = '<meta name="twitter:image" content="https://cdn.x.com/t.jpg">'
    assert _parse_og_image(html, "https://x.com/s") == "https://cdn.x.com/t.jpg"


def test_resolves_root_relative_url():
    html = '<meta property="og:image" content="/img/lede.jpg">'
    assert (
        _parse_og_image(html, "https://x.com/section/story")
        == "https://x.com/img/lede.jpg"
    )


def test_resolves_protocol_relative_url():
    html = '<meta property="og:image" content="//cdn.x.com/p.jpg">'
    assert _parse_og_image(html, "https://x.com/s") == "https://cdn.x.com/p.jpg"


def test_rejects_tracking_pixel():
    """A 1x1 renders as a smudge — strictly worse than the brand mark."""
    html = '<meta property="og:image" content="https://stats.wordpress.com/pixel.gif">'
    assert _parse_og_image(html, "https://x.com/s") == ""


def test_no_meta_returns_empty():
    assert _parse_og_image("<head><title>x</title></head>", "https://x.com/s") == ""


def test_usable_rejects_non_http():
    assert _usable("data:image/png;base64,iVBOR") is False
    assert _usable(None) is False


# ---------------------------------------------------------------- enrichment


def test_enrichment_skips_articles_that_already_have_an_image():
    """Yahoo ships media:content for everything and must cost zero requests."""
    articles = [{"link": "https://x.com/a", "image_url": "https://cdn/x.jpg"}]
    counters = asyncio.run(enrich_missing_images(articles))
    assert counters["considered"] == 0
    assert articles[0]["image_url"] == "https://cdn/x.jpg"


def test_enrichment_skips_opaque_google_news_stubs(monkeypatch):
    """Google News links are redirect shells with no og:image — a wasted trip."""
    articles = [
        {"link": "https://news.google.com/rss/articles/CBMiW0FV", "image_url": ""}
    ]
    counters = asyncio.run(enrich_missing_images(articles))
    assert counters["found"] == 0
    assert articles[0]["image_url"] == ""


def test_enrichment_handles_no_articles():
    assert asyncio.run(enrich_missing_images([]))["considered"] == 0


def test_enrichment_tolerates_malformed_entries():
    """A bad row must not stop the rest of the batch from being archived."""
    articles = [None, {"no_link": True}, "not a dict"]
    counters = asyncio.run(enrich_missing_images(articles))
    assert counters["considered"] == 0


def test_articles_keep_brand_mark_when_nothing_is_found():
    """The fallback must still work — that is the whole point of the field."""
    articles = [{"link": "https://news.google.com/rss/articles/X", "image_url": ""}]
    asyncio.run(enrich_missing_images(articles))
    assert articles[0].get("image_url") == ""


# ---------------------------------------------------------------- ingest chain
#
# The image survives capture and it survives archive_writer — but between them
# `_score` rebuilds every article dict field by field, and anything not named
# there is dropped. It did not name image_url, so every image captured at fetch
# time was discarded before it reached the archive. Capture and persistence
# were both correct in isolation, which is why this was invisible.


def test_score_preserves_image_url():
    from jobs.news_fetcher import _score

    scored = _score(
        [
            {
                "title": "OPEC cuts output",
                "summary": "OPEC+ agreed to reduce production from October.",
                "source": "oilprice.com",
                "url": "https://oilprice.com/a",
                "published": "2026-09-07T00:00:00Z",
                "image_url": "https://cdn.oilprice.com/lede.jpg",
            }
        ]
    )
    assert len(scored) == 1
    assert scored[0].get("image_url") == "https://cdn.oilprice.com/lede.jpg"


def test_score_defaults_image_url_when_absent():
    """archive_writer maps "" to NULL; a missing key would raise instead."""
    from jobs.news_fetcher import _score

    scored = _score([{"title": "t", "summary": "s", "source": "x", "url": "https://x/a"}])
    assert scored[0].get("image_url") == ""
