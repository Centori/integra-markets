"""Card images must survive ingest and reach the client.

Every production card rendered the Integra brand mark on 2026-08-25. That mark
is the fallback for articles with no image; it was showing on all of them
because no image ever reached the client:

  * data_sources.enrich_images / _extract_image were deleted (build64-exact
    had 15 references, main had none anywhere in the backend)
  * archive_writer never persisted an image into raw_payload
  * feed_store._to_article never emitted an image_url key

These tests cover the cheap path — read what feedparser already parsed, store
it, hand it back — and the fallback, which must keep working for articles that
genuinely have no image.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class _Entry:
    """Stand-in for a feedparser entry; only the attributes we read."""

    def __init__(self, **kw):
        for k, v in kw.items():
            setattr(self, k, v)


class TestExtraction:
    def test_media_content_is_preferred(self):
        from services.feed_images import extract_image_url
        e = _Entry(
            media_content=[{"url": "https://cdn.example.com/lede.jpg"}],
            media_thumbnail=[{"url": "https://cdn.example.com/thumb.jpg"}],
        )
        assert extract_image_url(e) == "https://cdn.example.com/lede.jpg"

    def test_media_thumbnail_is_second(self):
        from services.feed_images import extract_image_url
        e = _Entry(media_thumbnail=[{"url": "https://cdn.example.com/thumb.jpg"}])
        assert extract_image_url(e) == "https://cdn.example.com/thumb.jpg"

    def test_image_enclosure_is_third(self):
        from services.feed_images import extract_image_url
        e = _Entry(enclosures=[
            {"type": "audio/mpeg", "href": "https://example.com/podcast.mp3"},
            {"type": "image/jpeg", "href": "https://example.com/photo.jpg"},
        ])
        assert extract_image_url(e) == "https://example.com/photo.jpg"

    def test_img_tag_in_summary_is_last(self):
        from services.feed_images import extract_image_url
        e = _Entry(summary='<p><img src="https://oilprice.com/rig.jpg"/>Crude rose.</p>')
        assert extract_image_url(e) == "https://oilprice.com/rig.jpg"

    @pytest.mark.parametrize("junk", [
        "https://feeds.feedburner.com/~ff/pixel.gif",
        "https://stats.wordpress.com/g.gif?blog=1",
        "https://example.com/spacer.gif",
        "https://ad.doubleclick.net/x.png",
    ])
    def test_tracking_pixels_are_rejected(self, junk):
        """A 1x1 pixel renders as a smudge — worse than the brand fallback."""
        from services.feed_images import extract_image_url
        assert extract_image_url(_Entry(media_content=[{"url": junk}])) == ""

    def test_relative_and_empty_urls_are_rejected(self):
        from services.feed_images import extract_image_url
        assert extract_image_url(_Entry(media_content=[{"url": "/local/x.jpg"}])) == ""
        assert extract_image_url(_Entry(media_content=[{"url": ""}])) == ""

    def test_no_image_returns_empty_string(self):
        from services.feed_images import extract_image_url
        assert extract_image_url(_Entry(summary="Crude rose on supply fears.")) == ""

    def test_malformed_entry_never_raises(self):
        from services.feed_images import extract_image_url
        assert extract_image_url(_Entry(media_content="not-a-list")) == ""
        assert extract_image_url(object()) == ""


class TestPersistence:
    def test_image_is_written_into_raw_payload(self):
        """It was dropped here, so no read-path work could recover it."""
        from services.archive_writer import _url_hash  # noqa: F401  (import guard)
        import services.archive_writer as aw

        captured = {}

        class _FakeTable:
            def upsert(self, rows, **kw):
                captured["rows"] = rows
                return self

            def execute(self):
                class R:
                    data = []
                return R()

            def insert(self, rows):
                return self

            def select(self, *a, **k):
                return self

        class _FakeSupabase:
            def table(self, name):
                return _FakeTable()

        aw.persist_articles(_FakeSupabase(), [{
            "source": "OilPrice.com",
            "title": "Crude rises",
            "summary": "Crude rose on supply fears across the complex today.",
            "url": "https://oilprice.com/a",
            "published": "2026-08-25T09:00:00+00:00",
            "image_url": "https://oilprice.com/rig.jpg",
        }])

        rows = captured.get("rows") or []
        assert rows, "no rows upserted"
        assert rows[0]["raw_payload"]["image_url"] == "https://oilprice.com/rig.jpg"


class TestReadPath:
    def _row(self, payload):
        return {
            "id": "doc-1",
            "title": "Crude rises",
            "content": "Crude rose on supply fears across the complex today.",
            "source": "OilPrice.com",
            "url": "https://oilprice.com/a",
            "published_at": "2026-08-25T09:00:00+00:00",
            "raw_payload": payload,
        }

    def test_stored_image_reaches_the_client(self):
        from services.feed_store import _to_article
        art = _to_article(self._row({"image_url": "https://oilprice.com/rig.jpg"}), None, [])
        assert art["image_url"] == "https://oilprice.com/rig.jpg"

    def test_articles_without_an_image_still_fall_back(self):
        """The brand mark must keep working — it is correct here, not a bug."""
        from services.feed_store import _to_article
        assert _to_article(self._row({}), None, [])["image_url"] is None

    def test_rows_archived_before_capture_do_not_break(self):
        """Historic rows have no image_url key, and some have no raw_payload."""
        from services.feed_store import _to_article
        assert _to_article(self._row(None), None, [])["image_url"] is None

    def test_the_key_is_always_present(self):
        """NewsCard reads item.image_url; the key must exist even when null."""
        from services.feed_store import _to_article
        assert "image_url" in _to_article(self._row({}), None, [])
