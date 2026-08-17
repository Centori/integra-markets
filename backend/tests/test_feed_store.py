"""Feed ordering, windowing, dedup and personalisation.

These assert the properties a real-time feed must hold, each one written
against a defect measured in the production response on 2026-08-17:

  * newest first — the old path sorted by a constant relevance_score, so a
    5-month-old article sat six rows above a story published 90 minutes prior;
  * the recency window is enforced — hours_back was clamped per tier, echoed
    back in applied_limits, and then never applied;
  * sentiment uses the client's vocabulary — the old path emitted
    POSITIVE/NEGATIVE, which NewsCard.tsx falls through to grey on;
  * preference matching respects word boundaries — substring matching made
    "Tin" match platinum, routine and untinted.
"""
import datetime as dt
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.feed_store import fetch_feed  # noqa: E402


def _iso(hours_ago: float) -> str:
    return (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=hours_ago)).isoformat()


class FakeQuery:
    """Minimal supabase-py query recorder honouring the calls feed_store makes."""

    def __init__(self, table, store):
        self.table, self.store = table, store
        self.filters, self._limit = {}, None

    def select(self, *_a, **_k):
        return self

    def eq(self, col, val):
        self.filters[col] = val
        return self

    def gte(self, col, val):
        self.filters[f"{col}__gte"] = val
        return self

    def in_(self, col, vals):
        self.filters[f"{col}__in"] = list(vals)
        return self

    def order(self, *_a, **_k):
        return self

    def limit(self, n):
        self._limit = n
        return self

    def execute(self):
        rows = self.store.get(self.table, [])
        if self.table == "raw_documents":
            since = self.filters.get("published_at__gte")
            rows = [r for r in rows if r.get("source_type") == self.filters.get("source_type", "news")]
            if since:
                rows = [r for r in rows if str(r["published_at"]) >= since]
            rows = sorted(rows, key=lambda r: str(r["published_at"]), reverse=True)
            if self._limit:
                rows = rows[: self._limit]
        elif self.table == "sentiment_scores":
            wanted = self.filters.get("document_id__in")
            if wanted is not None:
                rows = [r for r in rows if r["document_id"] in wanted]
            rows = sorted(rows, key=lambda r: str(r.get("scored_at") or ""), reverse=True)
        return type("Resp", (), {"data": rows})()


class FakeSupabase:
    def __init__(self, **tables):
        self.store = tables

    def table(self, name):
        return FakeQuery(name, self.store)


def _doc(i, hours_ago, title, content="", source="OilPrice.com", payload=None):
    return {
        "id": f"doc-{i}",
        "title": title,
        "content": content,
        "source": source,
        "url": f"https://example.com/{i}",
        "url_hash": f"hash-{i}",
        "source_type": "news",
        "published_at": _iso(hours_ago),
        "raw_payload": payload or {},
    }


class TestNewestFirst:
    def test_articles_are_ordered_by_publication_time(self):
        supa = FakeSupabase(raw_documents=[
            _doc(1, 100, "Five months stale"),
            _doc(2, 1.5, "Oil Near $90 on Escalating Middle East Risks"),
            _doc(3, 50, "Middling"),
        ], sentiment_scores=[])

        arts = fetch_feed(supa, hours_back=720, max_articles=20)["articles"]
        times = [a["published"] for a in arts]
        assert times == sorted(times, reverse=True)
        assert arts[0]["title"] == "Oil Near $90 on Escalating Middle East Risks"

    def test_the_exact_production_inversion(self):
        """A story from 90 minutes ago must outrank one from five months ago.

        In the measured response the 5-month-old 'Kalshi Taps Pyth Network'
        occupied row 6 while 'Oil Near $90', published that morning, was row 14.
        """
        supa = FakeSupabase(raw_documents=[
            _doc(1, 24 * 115, "Kalshi Taps Pyth Network To Settle Bets On Gold, Oil, Wheat"),
            _doc(2, 1.5, "Oil Near $90 on Escalating Middle East Risks"),
        ], sentiment_scores=[])
        arts = fetch_feed(supa, hours_back=8760, max_articles=20)["articles"]
        assert [a["title"] for a in arts][0].startswith("Oil Near $90")

    def test_ordering_holds_when_personalisation_reorders_selection(self):
        """Matched articles are selected first but still rendered newest-first."""
        supa = FakeSupabase(raw_documents=[
            _doc(1, 50, "Gold steadies"),          # matches
            _doc(2, 2, "Wheat harvest outlook"),   # does not match
            _doc(3, 10, "Gold tests resistance"),  # matches
        ], sentiment_scores=[])
        arts = fetch_feed(supa, hours_back=720, max_articles=3, commodities=["gold"])["articles"]
        times = [a["published"] for a in arts]
        assert times == sorted(times, reverse=True)


class TestRecencyWindowIsEnforced:
    def test_articles_outside_the_window_are_excluded(self):
        supa = FakeSupabase(raw_documents=[
            _doc(1, 2, "Fresh"),
            _doc(2, 100, "Older than the window"),
        ], sentiment_scores=[])
        arts = fetch_feed(supa, hours_back=24, max_articles=20)["articles"]
        assert [a["title"] for a in arts] == ["Fresh"]

    def test_free_tier_one_day_limit_actually_bites(self):
        """clamp_hours_back(free_trial, ...) == 24; nothing older may appear."""
        supa = FakeSupabase(raw_documents=[
            _doc(i, 12, f"In window {i}") for i in range(3)
        ] + [
            _doc(90 + i, 24 * 30, f"A month old {i}") for i in range(5)
        ], sentiment_scores=[])
        arts = fetch_feed(supa, hours_back=24, max_articles=20)["articles"]
        assert len(arts) == 3
        assert all("In window" in a["title"] for a in arts)

    def test_widening_never_exceeds_the_requested_ceiling(self):
        """Under-filling widens the window, but only up to hours_back."""
        supa = FakeSupabase(raw_documents=[
            _doc(1, 30, "Between 24h and 48h"),
            _doc(2, 200, "Beyond the 48h ceiling"),
        ], sentiment_scores=[])
        result = fetch_feed(supa, hours_back=48, max_articles=20)
        assert [a["title"] for a in result["articles"]] == ["Between 24h and 48h"]
        assert result["window_hours"] <= 48

    def test_widens_to_fill_a_thin_window(self):
        """12h holds only 17 articles in production — a 20-card feed must widen."""
        supa = FakeSupabase(raw_documents=(
            [_doc(i, 6, f"Recent {i}") for i in range(5)]
            + [_doc(100 + i, 40, f"Older {i}") for i in range(20)]
        ), sentiment_scores=[])
        result = fetch_feed(supa, hours_back=168, max_articles=20)
        assert len(result["articles"]) == 20
        assert result["window_hours"] > 12


class TestSentimentVocabulary:
    def test_db_labels_map_to_the_clients_words(self):
        supa = FakeSupabase(
            raw_documents=[_doc(1, 1, "Gold rallies")],
            sentiment_scores=[{
                "document_id": "doc-1", "sentiment": "bullish", "score": 0.81,
                "confidence": 0.81, "scored_at": _iso(0.5),
            }],
        )
        art = fetch_feed(supa, hours_back=24, max_articles=5)["articles"][0]
        assert art["sentiment"] == "BULLISH"
        assert art["sentiment_score"] == 0.81

    def test_legacy_positive_negative_are_translated_not_dropped(self):
        """NewsCard renders anything outside BULLISH/BEARISH/NEUTRAL as grey."""
        supa = FakeSupabase(
            raw_documents=[_doc(1, 1, "A"), _doc(2, 2, "B")],
            sentiment_scores=[
                {"document_id": "doc-1", "sentiment": "POSITIVE", "score": 0.7,
                 "confidence": 0.7, "scored_at": _iso(0.5)},
                {"document_id": "doc-2", "sentiment": "negative", "score": 0.3,
                 "confidence": 0.3, "scored_at": _iso(0.5)},
            ],
        )
        arts = {a["title"]: a["sentiment"] for a in
                fetch_feed(supa, hours_back=24, max_articles=5)["articles"]}
        assert arts == {"A": "BULLISH", "B": "BEARISH"}

    def test_missing_score_is_neutral_not_absent(self):
        supa = FakeSupabase(raw_documents=[_doc(1, 1, "Unscored")], sentiment_scores=[])
        art = fetch_feed(supa, hours_back=24, max_articles=5)["articles"][0]
        assert art["sentiment"] == "NEUTRAL"
        assert art["sentiment_score"] == 0.5

    def test_newest_score_wins_when_rescored(self):
        supa = FakeSupabase(
            raw_documents=[_doc(1, 1, "Rescored")],
            sentiment_scores=[
                {"document_id": "doc-1", "sentiment": "bearish", "score": 0.2,
                 "confidence": 0.2, "scored_at": _iso(48)},
                {"document_id": "doc-1", "sentiment": "bullish", "score": 0.9,
                 "confidence": 0.9, "scored_at": _iso(1)},
            ],
        )
        art = fetch_feed(supa, hours_back=24, max_articles=5)["articles"][0]
        assert art["sentiment"] == "BULLISH"


class TestWordBoundaryMatching:
    def test_tin_does_not_match_platinum(self):
        """The reported web-surface bug, asserted server-side."""
        supa = FakeSupabase(raw_documents=[
            _doc(1, 1, "Platinum demand climbs on routine restocking"),
            _doc(2, 2, "Tin prices firm on Indonesian export curbs"),
        ], sentiment_scores=[])
        arts = fetch_feed(supa, hours_back=24, max_articles=20, commodities=["Tin"])["articles"]
        matched = [a["title"] for a in arts if a["related_commodities"]]
        assert matched == ["Tin prices firm on Indonesian export curbs"]

    def test_multi_word_terms_match(self):
        supa = FakeSupabase(raw_documents=[
            _doc(1, 1, "Natural gas storage builds ahead of winter"),
        ], sentiment_scores=[])
        arts = fetch_feed(supa, hours_back=24, max_articles=5,
                          commodities=["natural gas"])["articles"]
        assert arts[0]["related_commodities"] == ["natural gas"]

    def test_matches_body_and_payload_not_only_title(self):
        """The old filter tested the title alone and dropped the rest."""
        supa = FakeSupabase(raw_documents=[
            _doc(1, 1, "Morning market wrap", content="Crude oil slipped as OPEC met."),
            _doc(2, 2, "Metals note", payload={"commodity": "gold"}),
        ], sentiment_scores=[])
        arts = fetch_feed(supa, hours_back=24, max_articles=5,
                          commodities=["oil", "gold"])["articles"]
        assert all(a["related_commodities"] for a in arts)

    def test_unmatched_articles_still_fill_the_feed(self):
        """A personalised feed of three cards is worse than three plus context."""
        supa = FakeSupabase(raw_documents=[
            _doc(1, 1, "Gold rallies"),
            _doc(2, 2, "Copper flat"),
            _doc(3, 3, "Shipping rates ease"),
        ], sentiment_scores=[])
        result = fetch_feed(supa, hours_back=24, max_articles=20, commodities=["gold"])
        assert len(result["articles"]) == 3
        assert result["matched"] == 1
        assert result["personalized"] is True

    def test_pathological_term_does_not_raise(self):
        supa = FakeSupabase(raw_documents=[_doc(1, 1, "Oil")], sentiment_scores=[])
        arts = fetch_feed(supa, hours_back=24, max_articles=5,
                          commodities=["*[", "", "   "])["articles"]
        assert len(arts) == 1


class TestDedup:
    def test_same_url_hash_appears_once(self):
        a = _doc(1, 1, "Syndicated story", source="Reuters")
        b = _doc(1, 2, "Syndicated story elsewhere", source="Yahoo Finance")
        b["id"] = "doc-1b"
        supa = FakeSupabase(raw_documents=[a, b], sentiment_scores=[])
        arts = fetch_feed(supa, hours_back=24, max_articles=20)["articles"]
        assert len(arts) == 1

    def test_same_headline_from_two_sources_appears_once(self):
        a = _doc(1, 1, "Oil Near $90 on Escalating Middle East Risks", source="Reuters")
        b = _doc(2, 2, "oil near $90 on escalating middle east risks!", source="Yahoo Finance")
        supa = FakeSupabase(raw_documents=[a, b], sentiment_scores=[])
        arts = fetch_feed(supa, hours_back=24, max_articles=20)["articles"]
        assert len(arts) == 1
        # The surviving copy is the more recently published one.
        assert arts[0]["source"] == "Reuters"

    def test_distinct_stories_are_kept(self):
        supa = FakeSupabase(raw_documents=[
            _doc(1, 1, "Gold up"), _doc(2, 2, "Oil down"),
        ], sentiment_scores=[])
        assert len(fetch_feed(supa, hours_back=24, max_articles=20)["articles"]) == 2


class TestResponseContract:
    def test_client_fields_are_all_present(self):
        """mobile fetchNewsAnalysis + NewsCard read exactly these."""
        supa = FakeSupabase(raw_documents=[_doc(1, 1, "T", content="Body text here.")],
                            sentiment_scores=[])
        art = fetch_feed(supa, hours_back=24, max_articles=5)["articles"][0]
        for field in ("title", "summary", "source", "url", "published",
                      "sentiment", "sentiment_score", "relevance_score",
                      "related_commodities", "is_alert"):
            assert field in art, f"missing client field {field}"

    def test_summary_falls_back_to_headline_never_empty(self):
        supa = FakeSupabase(raw_documents=[_doc(1, 1, "Headline only", content="")],
                            sentiment_scores=[])
        art = fetch_feed(supa, hours_back=24, max_articles=5)["articles"][0]
        assert art["summary"] == "Headline only"

    def test_published_is_iso_not_a_publisher_string(self):
        """The old payload mixed '-0500', ' EST ', 'GMT' and 'Aug 17, 2026'."""
        supa = FakeSupabase(raw_documents=[_doc(1, 1, "T")], sentiment_scores=[])
        art = fetch_feed(supa, hours_back=24, max_articles=5)["articles"][0]
        assert dt.datetime.fromisoformat(art["published"]) is not None

    def test_article_ceiling_is_respected(self):
        supa = FakeSupabase(
            raw_documents=[_doc(i, i * 0.1, f"A{i}") for i in range(60)],
            sentiment_scores=[],
        )
        assert len(fetch_feed(supa, hours_back=24, max_articles=20)["articles"]) == 20


class TestDegradation:
    def test_empty_store_returns_empty_not_an_error(self):
        """The endpoint uses this to decide whether to fall back to live RSS."""
        supa = FakeSupabase(raw_documents=[], sentiment_scores=[])
        assert fetch_feed(supa, hours_back=24, max_articles=20)["articles"] == []

    def test_sentiment_lookup_failure_still_returns_articles(self):
        class Broken(FakeSupabase):
            def table(self, name):
                if name == "sentiment_scores":
                    raise RuntimeError("sentiment_scores unavailable")
                return super().table(name)

        supa = Broken(raw_documents=[_doc(1, 1, "Still shows")], sentiment_scores=[])
        arts = fetch_feed(supa, hours_back=24, max_articles=5)["articles"]
        assert len(arts) == 1
        assert arts[0]["sentiment"] == "NEUTRAL"
