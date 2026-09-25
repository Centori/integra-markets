"""What the platform can see, pinned so it cannot narrow by accident.

Three failures of the same shape sat in this pipeline at once, and none of them
raised anything:

  * `fetch_iea_news` parsed https://www.iea.org/news — an HTML page — with
    feedparser, which returns zero entries for HTML without complaining. It
    contributed 0 documents across the platform's entire history.
  * `fetch_kitco_news` read three RSS URLs that answer 404. Same outcome.
  * `fetch_reuters_commodities` searched for four commodities and then filtered
    the results through a keyword list that did not match all four.

The visible consequence was a product where oil, gas and gold are 86% of every
commodity mention ever scored and wheat is 0.6% — which reads as "the market is
quiet" rather than "nothing is looking".

A returned empty list is indistinguishable from a slow news day at the call
site, so these tests work on the two things that CAN be checked offline: that
every scheduled fetcher exists, and that no filter is narrower than the query
feeding it.
"""

from __future__ import annotations

import re

import data_sources
from data_sources import NewsDataSources

# The fetchers the scheduler runs, read from the job itself rather than copied,
# so the two cannot drift.
import jobs.news_fetcher as news_fetcher_job


def _scheduled_fetcher_names() -> list[str]:
    source = pathlib_read(news_fetcher_job.__file__)
    block = re.search(r"for fetcher_name in \((.*?)\):", source, re.S)
    assert block, "could not find the fetcher tuple in jobs/news_fetcher.py"
    return re.findall(r'"([a-z_]+)"', block.group(1))


def pathlib_read(path: str) -> str:
    import pathlib

    return pathlib.Path(path).read_text()


def test_every_scheduled_fetcher_exists():
    """A typo in the tuple is silent: getattr returns None and the loop skips it."""
    missing = [
        name for name in _scheduled_fetcher_names()
        if not hasattr(NewsDataSources, name)
    ]
    assert not missing, f"scheduled but not defined on NewsDataSources: {missing}"


def test_agriculture_and_metals_have_a_source_at_all():
    """The gap this file exists for.

    Every source was energy-first: EIA, IEA and OilPrice by construction, and a
    Reuters query whose only agricultural word was 'wheat'. Grains and base
    metals reached the database only by accident.
    """
    scheduled = _scheduled_fetcher_names()
    assert "fetch_agriculture_news" in scheduled, "no agricultural source is scheduled"
    assert "fetch_metals_news" in scheduled, "no metals source is scheduled"


def test_the_reuters_filter_is_not_narrower_than_its_query():
    """A filter narrower than the search is a second, invisible coverage policy.

    The query asked for soybeans; the keyword list did not contain 'soybean', so
    every soybean article fetched was dropped after being fetched. Nothing about
    that is observable from outside — the source simply appears to publish no
    agricultural news.
    """
    source = pathlib_read(data_sources.__file__)
    body = source[source.index("async def fetch_reuters_commodities") :]
    body = body[: body.index("\n    async def ", 10)]

    url_block = re.search(r'"q=site%3Areuters\.com%20\((.*?)\)&hl', body, re.S)
    assert url_block, "could not read the Reuters query"
    # The query is URL-encoded and split across string literals.
    raw = url_block.group(1).replace('"', "").replace("\n", "").replace(" ", "")
    terms = [
        t.replace("%20", " ").replace("%22", "").strip().lower()
        for t in raw.split("OR")
    ]
    terms = [t for t in terms if t]

    keyword_block = re.search(r"commodity_keywords = \[(.*?)\]", body, re.S)
    assert keyword_block, "could not read the Reuters keyword filter"
    keywords = re.findall(r"'([^']+)'", keyword_block.group(1))

    unmatched = [
        term for term in terms
        if not any(k in term or term in k for k in keywords)
    ]
    assert not unmatched, (
        f"the Reuters query searches for {unmatched} but the keyword filter "
        f"drops them. Every such article is fetched and then discarded, which "
        f"looks exactly like the publisher not covering the topic."
    )


def test_a_feed_that_parses_to_nothing_is_reported(monkeypatch, caplog):
    """The exact failure mode of the IEA and Kitco fetchers.

    Both returned an empty list, which every caller reads as "no articles right
    now". The helper now logs at ERROR and marks the source failed, so the
    difference between no news and no feed reaches somebody.
    """
    import asyncio
    import logging

    ns = NewsDataSources()

    async def _html(*_args, **_kwargs):
        # What iea.org/news actually served: a web page, not a feed.
        return "<!doctype html><html><body><h1>News</h1></body></html>"

    monkeypatch.setattr(ns, "_get_text_with_retry", _html)

    with caplog.at_level(logging.ERROR):
        articles = asyncio.run(
            ns._fetch_google_news(query="site:example.com", source="Example", category="test")
        )

    assert articles == []
    assert any("expected at least" in r.getMessage() for r in caplog.records), (
        "a feed parsing to zero items must be logged as an error, or it is "
        "indistinguishable from a quiet news day"
    )
