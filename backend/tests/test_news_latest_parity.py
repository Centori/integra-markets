"""/api/news/latest and /api/news/feed must read the same corpus.

The reported bug: push notifications arrived for stories that opened fine in
Integra Analysis but were absent from the feed. Three pipelines existed, and
the two user-visible surfaces used different ones:

    notifications -> GET  /api/news/latest -> news_aggregator.NewsFetcher
                                              (3 general-finance RSS feeds,
                                               fetched once at process boot)
    the feed      -> POST /api/news/feed   -> raw_documents

Measured on production before the fix, the ten articles the notification
poller was working from were MarketWatch personal finance — "Can I claim 50%
of my husband's Social Security", "Former Starbucks CEO Howard Schultz sells
home in Hawaii" — with no commodity filter in the path and no overlap with the
feed at all (0/10 findable as cards).
"""
import datetime as dt
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))
# There is no tests/__init__.py, so the sibling module is imported by name
# rather than as `tests.test_feed_store`.
sys.path.insert(0, _HERE)

from news_aggregator.news_fetcher import NewsFetcher, NewsItem  # noqa: E402
from services.feed_store import fetch_feed  # noqa: E402
from test_feed_store import FakeSupabase, _doc, _iso  # noqa: E402


def _install_fake_store(monkeypatch, supa):
    """Point NewsFetcher._from_store at a fake database."""
    import services._supabase as sb
    monkeypatch.setattr(sb, "get_supabase_client", lambda: supa)


class TestReadsTheStore:
    def test_latest_returns_store_articles_not_the_rss_snapshot(self, monkeypatch):
        supa = FakeSupabase(
            raw_documents=[_doc(1, 2, "Hormuz Tanker Traffic Slows to a Trickle")],
            sentiment_scores=[],
        )
        _install_fake_store(monkeypatch, supa)

        fetcher = NewsFetcher()
        # The stale boot-time snapshot that used to be served.
        fetcher.latest_news = [NewsItem(
            title="Can I claim 50% of my husband's Social Security now?",
            source="MarketWatch", link="https://example.com/x",
            published=_iso(200), summary="Personal finance column.",
        )]

        titles = [i.title for i in fetcher.get_latest_news()]
        assert titles == ["Hormuz Tanker Traffic Slows to a Trickle"]
        assert not any("Social Security" in t for t in titles)

    def test_sentiment_is_lowercase_for_the_pollers_comparison(self, monkeypatch):
        """alertMonitoringService does `article.sentiment === 'bullish'`."""
        supa = FakeSupabase(
            raw_documents=[_doc(1, 1, "Gold rises on softer dollar")],
            sentiment_scores=[{
                "document_id": "doc-1", "sentiment": "bullish", "score": 0.78,
                "confidence": 0.78, "scored_at": _iso(0.5),
            }],
        )
        _install_fake_store(monkeypatch, supa)
        item = NewsFetcher().get_latest_news()[0]
        assert item.sentiment == "bullish"
        assert item.sentiment_score == 0.78

    def test_sentiment_field_exists_at_all(self, monkeypatch):
        """The model never had one, so the poller's check saw undefined and
        graded every notification 'medium'."""
        assert "sentiment" in NewsItem.model_fields
        assert "category" in NewsItem.model_fields

    def test_ordered_newest_first(self, monkeypatch):
        supa = FakeSupabase(raw_documents=[
            _doc(1, 30, "Older"), _doc(2, 1, "Newest"), _doc(3, 10, "Middle"),
        ], sentiment_scores=[])
        _install_fake_store(monkeypatch, supa)
        assert [i.title for i in NewsFetcher().get_latest_news()][0] == "Newest"


class TestCorpusAgreement:
    def test_every_notifiable_story_is_findable_in_the_feed(self, monkeypatch):
        """The acceptance property for the reported bug.

        Anything /news/latest can notify about must appear as a card, given a
        feed window at least as wide as the notification window.
        """
        docs = [_doc(i, i * 1.5, f"Commodity story {i}") for i in range(1, 12)]
        supa = FakeSupabase(raw_documents=docs, sentiment_scores=[])
        _install_fake_store(monkeypatch, supa)

        notifiable = {i.title for i in NewsFetcher().get_latest_news()[:10]}
        cards = {a["title"] for a in
                 fetch_feed(supa, hours_back=48, max_articles=50)["articles"]}

        missing = notifiable - cards
        assert not missing, f"notifiable but not in the feed: {sorted(missing)}"

    def test_sources_agree(self, monkeypatch):
        """Not MarketWatch top stories on one surface and OilPrice on the other."""
        supa = FakeSupabase(raw_documents=[
            _doc(1, 1, "A", source="OilPrice.com"),
            _doc(2, 2, "B", source="Reuters"),
        ], sentiment_scores=[])
        _install_fake_store(monkeypatch, supa)

        latest_sources = {i.source for i in NewsFetcher().get_latest_news()}
        feed_sources = {a["source"] for a in
                        fetch_feed(supa, hours_back=48, max_articles=50)["articles"]}
        assert latest_sources == feed_sources


class TestDegradation:
    def test_empty_store_falls_back_to_the_rss_snapshot(self, monkeypatch):
        """Stale-but-real beats empty, and the fallback is logged."""
        supa = FakeSupabase(raw_documents=[], sentiment_scores=[])
        _install_fake_store(monkeypatch, supa)

        fetcher = NewsFetcher()
        fetcher.latest_news = [NewsItem(
            title="Fallback item", source="MarketWatch",
            link="https://example.com/f", published=_iso(1), summary="s",
        )]
        assert [i.title for i in fetcher.get_latest_news()] == ["Fallback item"]

    def test_store_error_falls_back_rather_than_raising(self, monkeypatch):
        import services._supabase as sb

        def boom():
            raise RuntimeError("supabase unreachable")

        monkeypatch.setattr(sb, "get_supabase_client", boom)
        fetcher = NewsFetcher()
        fetcher.latest_news = []
        assert fetcher.get_latest_news() == []

    def test_response_contract_is_unchanged_for_existing_consumers(self, monkeypatch):
        supa = FakeSupabase(raw_documents=[_doc(1, 1, "T", content="Body.")],
                            sentiment_scores=[])
        _install_fake_store(monkeypatch, supa)
        item = NewsFetcher().get_latest_news()[0]
        for field in ("title", "source", "link", "published", "summary"):
            assert getattr(item, field) is not None
        assert item.summary == "Body."
