"""`raw_documents.content` should hold a summary, not an article.

Measured across the 199,478 populated rows: mean 175 characters, p95 372,
p99 540. That is RSS description text — what a publisher syndicates the field
for, and what the sentiment engine reads alongside the title.

116 rows were the exception, up to 6,388 characters, all from the archive
scrapers (NGI, Kitco, Mining.com) which followed through to article pages and
captured body text. Storing a publisher's article body is a materially different
act from storing the summary they syndicate, and it is the one a counterparty's
counsel asks about first.

The cap bounds that failure mode without changing normal ingest. These tests pin
both halves: real summaries pass through untouched, and a scraper that starts
returning bodies cannot bank them.
"""

from __future__ import annotations

from services.archive_writer import CONTENT_MAX_CHARS, _excerpt


class TestNormalIngestIsUntouched:
    def test_a_typical_summary_passes_through_byte_for_byte(self):
        """Mean length is 175 characters. Truncating those would degrade both the
        mobile snippet and the text the rulebook scores."""
        summary = (
            "Oil prices rose on Tuesday as traders weighed supply risks in the "
            "Middle East against signs of softening demand in China."
        )
        assert _excerpt(summary) == summary

    def test_p99_length_is_well_inside_the_cap(self):
        """p99 is 540 characters; the cap is ~2x that on purpose, so the bound
        never fires on legitimate feed content."""
        assert CONTENT_MAX_CHARS >= 1000
        assert _excerpt("x" * 540) == "x" * 540

    def test_empty_and_missing_values_are_preserved(self):
        """60,688 rows have no content at all. None must stay None, not become
        an empty string — the column is nullable and readers check for it."""
        assert _excerpt(None) is None
        assert _excerpt("") == ""


class TestArticleBodiesAreBounded:
    def test_a_scraped_body_is_truncated(self):
        body = "word " * 2000  # 10,000 chars, larger than the worst observed row
        out = _excerpt(body)
        assert len(out) <= CONTENT_MAX_CHARS + 1  # +1 for the ellipsis

    def test_truncation_is_marked(self):
        """A silently truncated excerpt reads as a complete summary that happens
        to stop mid-thought. The ellipsis says it was cut."""
        assert _excerpt("word " * 2000).endswith("…")

    def test_the_cut_lands_on_a_word_boundary(self):
        """Severing a word makes the stored excerpt look like corruption."""
        out = _excerpt(("alpha bravo charlie delta " * 100))
        assert not out.rstrip("…").endswith(" ")
        # The character before the ellipsis should complete a word.
        assert out.rstrip("…").split()[-1] in {"alpha", "bravo", "charlie", "delta"}

    def test_a_long_run_with_no_spaces_still_gets_bounded(self):
        """No word boundary to find — the bound must hold anyway rather than
        falling through and storing the whole thing."""
        out = _excerpt("x" * 5000)
        assert len(out) <= CONTENT_MAX_CHARS + 1

    def test_exactly_at_the_cap_is_not_truncated(self):
        """Off-by-one: a value the length of the cap is within it."""
        exact = "y" * CONTENT_MAX_CHARS
        assert _excerpt(exact) == exact
        assert not _excerpt(exact).endswith("…")


class TestTheWriterUsesIt:
    def test_archive_writer_passes_content_through_the_excerpt(self):
        """The cap is worthless if the write path bypasses it."""
        import pathlib

        src = pathlib.Path(__file__).parent.parent / "services" / "archive_writer.py"
        body = src.read_text()
        assert '"content": _excerpt(' in body, (
            "archive_writer no longer bounds `content` — a scraper change could "
            "start storing publisher article bodies again"
        )
