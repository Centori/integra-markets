"""NULL and [] on sentiment_scores.signals mean different things.

    NULL  not evaluated: predates the column, or extraction failed
    []    evaluated, and the rulebook recognised nothing

The first version had them conflated, storing NULL for "nothing fired". That
read as a reasonable choice and broke the backfill completely: the pass selects
`where signals is null`, so a non-firing row was never written, never left the
queue, and — ordered newest-first — came back on every batch. The signalled
count froze at 38 while the examined count passed 62,000. A pass that cannot
finish is worse than one that reports nothing, and nothing about the output said
it was stuck rather than slow.

About three quarters of articles fire no rule. That is the rulebook being
specific, not a gap — most coverage is ordinary, and a rule that fired on it
would carry no information. So `[]` is the COMMON case and has to be a
first-class value rather than an edge.
"""

from __future__ import annotations

from services.archive_writer import _signals_for


def _doc(title: str, commodity: str | None = "oil", content: str = "") -> dict:
    return {"title": title, "content": content, "raw_payload": {"commodity": commodity}}


class TestEvaluatedButNothingFired:
    def test_an_ordinary_headline_returns_an_empty_list_not_none(self):
        """The property that unstalls the backfill. [] is written, so the row
        leaves `signals is null` and the pass advances."""
        result = _signals_for(_doc("Analysts discuss the outlook for 2027"))
        assert result == [], f"expected [] for an unremarkable headline, got {result!r}"
        assert result is not None

    def test_the_common_case_is_the_empty_case(self):
        """Measured at ~74% of articles. If this ever returns None for a batch of
        ordinary headlines, the backfill silently stops making progress."""
        ordinary = [
            "Market participants weigh the week ahead",
            "Conference panel considers energy transition",
            "Quarterly results due on Thursday",
        ]
        for headline in ordinary:
            assert _signals_for(_doc(headline)) == [], headline


class TestNotEvaluated:
    """NULL is reserved for cases where a retry could change the answer.

    That is narrower than "we did not conclude anything", and the narrowing is
    the lesson from the stall: anything left NULL stays in the backfill queue,
    so NULL on a row that will never produce a different result re-queues it
    forever. Only a FAILURE qualifies.
    """

    def test_a_document_with_no_text_is_retired_not_requeued(self):
        """There is nothing to evaluate and there never will be — a title does
        not arrive later. NULL here would park the row in the queue permanently,
        which is the bug this file exists for. (Measured: zero rows in the
        archive actually lack a title, so this is a guard, not a live case.)"""
        assert _signals_for(_doc("")) == []
        assert _signals_for({"title": None, "content": None}) == []

    def test_an_extraction_failure_is_not_a_verdict(self, monkeypatch):
        """A raised extractor must leave the row NULL. Writing [] would record
        'the rulebook found nothing' when the rulebook never ran, and the row
        would never be retried."""
        import services.archive_writer as aw

        def _boom(*_a, **_k):
            raise RuntimeError("rulebook exploded")

        monkeypatch.setattr(
            "services.commodity_sentiment.extract_key_drivers", _boom
        )
        assert aw._signals_for(_doc("Hormuz closure halts tanker traffic")) is None


class TestFiredRulesOnly:
    def test_a_real_signal_is_stored_with_its_evidence(self):
        signals = _signals_for(_doc("Hormuz Traffic Running 80% Below Its 10-Day Average"))
        assert signals, "a chokepoint measurement must fire"
        assert signals[0]["driver"] == "Chokepoint disruption"
        assert signals[0]["phrase"], "a signal with no quoted span cannot be checked"
        assert signals[0]["direction"] == "bullish"

    def test_the_keyword_fallback_is_never_persisted(self):
        """extract_key_drivers falls back to topic nouns marked
        direction="context". Storing those refills the column with "oil",
        "price", "supply" — the generic output this whole change replaces."""
        for headline in ("Oil and gas markets in focus", "Copper demand outlook"):
            for signal in _signals_for(_doc(headline)):
                assert signal["direction"] != "context", (
                    f"{headline!r} persisted a topic noun as evidence"
                )


class TestTheMigrationSaysSo:
    def test_the_column_comment_distinguishes_the_two(self):
        """The contract is read by whoever writes the next backfill."""
        import pathlib

        sql = (
            pathlib.Path(__file__).parents[2]
            / "supabase/migrations/20261008_signals_null_means_unevaluated.sql"
        ).read_text()
        assert "NOT EVALUATED" in sql
        assert "empty array" in sql.lower()

    def test_the_index_excludes_the_empty_case(self):
        """`where signals is not null` would now match every evaluated row —
        roughly four times the rows — for queries that only want evidence."""
        import pathlib

        sql = (
            pathlib.Path(__file__).parents[2]
            / "supabase/migrations/20261008_signals_null_means_unevaluated.sql"
        ).read_text()
        assert "<> '[]'::jsonb" in sql
