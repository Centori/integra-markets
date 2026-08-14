"""
Guards the news-card summary pipeline.

Symptom that prompted this (build 88, 2026-08-14): every card in the app showed
the same SUMMARY text -- Investing.com's site-wide legal disclaimer ("Prices of
cryptocurrencies are extremely volatile ... Fusion Media would like to remind
you ..."). Two causes stacked:

  1. Investing.com's RSS carries no <description>, and the site blocks
     scrapers, so summarize_url() either errored (leaving `summary` unset ->
     the feed emitted summary == title for every article) or returned the
     publisher's disclaimer page instead of the story body.
  2. Nothing validated a summary before showing it, so boilerplate went
     straight onto the card and was then scored for sentiment.

Fix: prefer the publisher's own RSS description, validate every candidate, and
never emit publisher boilerplate.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from user_news_service import clean_summary_text, is_usable_summary  # noqa: E402

# Verbatim from the user's build-88 screenshot.
DISCLAIMER = (
    "Prices of cryptocurrencies are extremely volatile and may be affected by "
    "external factors such as financial, regulatory or political events. Fusion "
    "Media would like to remind you that the data contained in this website is "
    "not necessarily real-time nor accurate. It is prohibited to use, store, "
    "reproduce, display, modify, transmit or distribute the data contained in "
    "this website without the explicit prior written permission of Fusion Media "
    "and/or the data provider."
)

REAL_SUMMARY = (
    "Not only is a growing number of tankers moving stealthily with transponders "
    "switched off at the Middle East's two key chokepoints, but the time of the "
    "voyages has also lengthened considerably as shipowners weigh the risk."
)


class TestBoilerplateRejection:
    def test_the_exact_disclaimer_that_shipped_is_rejected(self):
        assert is_usable_summary(DISCLAIMER, "Gold's Bullish Setup Gains Support") is False

    def test_common_publisher_boilerplate_is_rejected(self):
        for text in [
            "All rights reserved. Terms of use and privacy policy apply to this content here.",
            "Please enable JavaScript to continue reading this article on our website today.",
            "Subscribe to continue reading this article and get unlimited access to all content.",
            "Fusion Media is not responsible for any loss arising from reliance on this data.",
        ]:
            assert is_usable_summary(text, "Some headline") is False, text

    def test_real_article_summary_is_accepted(self):
        assert is_usable_summary(REAL_SUMMARY, "Middle East Oil Tankers Are Going Dark") is True


class TestTitleEcho:
    """The feed was emitting summary == title for every article."""

    def test_summary_identical_to_title_is_rejected(self):
        title = "Russia Captures Record Share of India's Oil Market And More Detail Here"
        assert is_usable_summary(title, title) is False

    def test_summary_that_only_restates_the_title_is_rejected(self):
        title = "Oil Prices Head for 4% Weekly Gain as US-Iran Deadlock Drags On"
        assert is_usable_summary(title + "  ", title) is False

    def test_summary_extending_the_title_with_real_content_is_accepted(self):
        title = "Oil Prices Head for 4% Weekly Gain"
        body = (
            title
            + " as US-Iran talks stall, with traders pricing a wider risk premium "
              "into Brent contracts through the end of the quarter and beyond."
        )
        assert is_usable_summary(body, title) is True


class TestLengthFloor:
    def test_too_short_is_rejected(self):
        assert is_usable_summary("Oil up 2%.", "Oil rises") is False

    def test_empty_and_none_are_rejected(self):
        assert is_usable_summary("", "t") is False
        assert is_usable_summary(None, "t") is False


class TestCleaning:
    def test_html_is_stripped_and_whitespace_collapsed(self):
        raw = "<p>Crude   rose\n\n sharply</p><div>on supply fears</div>"
        assert clean_summary_text(raw) == "Crude rose sharply on supply fears"

    def test_entities_are_decoded(self):
        assert "&nbsp;" not in clean_summary_text("Gold&nbsp;rallies&amp;holds")

    def test_none_is_safe(self):
        assert clean_summary_text(None) == ""


class TestFeedConfiguration:
    def test_dead_eia_url_is_gone_everywhere(self):
        """The retired feed 404'd on every scheduler tick, 3 retries each."""
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        for name in ("data_sources.py", "user_news_service.py"):
            with open(os.path.join(root, name)) as f:
                assert "petroleum/weekly/includes/newsletter_rss.xml" not in f.read(), name

    def test_a_source_with_real_descriptions_is_configured(self):
        from user_news_service import UserNewsService

        feeds = UserNewsService.__init__.__doc__ or ""
        # Construction touches network-free state only; assert on the map.
        svc = object.__new__(UserNewsService)
        UserNewsService.__init__(svc)
        assert "oilprice" in svc.rss_feeds
        assert "eia_today" in svc.rss_feeds
        assert svc.rss_feeds["eia_today"].endswith("todayinenergy.xml")
