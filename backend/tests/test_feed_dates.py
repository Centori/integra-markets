"""Publication-date parsing.

Regression cover for the bug that poisoned feed ordering: the old parser tried
four rigid strptime formats and then silently returned datetime.now(). Every
string below was taken from a live production feed on 2026-08-17; the EIA one
is what stamped all eight EIA articles with the ingest time.
"""
import datetime as dt
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.feed_dates import parse_published, parse_published_iso  # noqa: E402


class TestRealFeedFormats:
    """Every format observed across the five configured sources."""

    @pytest.mark.parametrize("raw,expected", [
        # U.S. EIA Today in Energy — DOUBLE space before the time and an
        # alphabetic zone. '%a, %d %b %Y %H:%M:%S %Z' matches neither, so this
        # is the string that produced now() for every EIA article.
        ("Fri, 31 Jul 2026  09:00:00 EST", dt.datetime(2026, 7, 31, 14, 0, tzinfo=dt.timezone.utc)),
        # OilPrice.com — numeric offset.
        ("Mon, 17 Aug 2026 02:50:00 -0500", dt.datetime(2026, 8, 17, 7, 50, tzinfo=dt.timezone.utc)),
        # Google News / Reuters.
        ("Tue, 24 Mar 2026 07:00:00 GMT", dt.datetime(2026, 3, 24, 7, 0, tzinfo=dt.timezone.utc)),
        # Investing.com — no weekday, comma after the day.
        ("Aug 17, 2026 06:45 GMT", dt.datetime(2026, 8, 17, 6, 45, tzinfo=dt.timezone.utc)),
        # ISO 8601, as stored in raw_documents.
        ("2026-08-17T08:55:00+00:00", dt.datetime(2026, 8, 17, 8, 55, tzinfo=dt.timezone.utc)),
        # ISO 8601 with the trailing-Z spelling.
        ("2026-08-17T08:55:00Z", dt.datetime(2026, 8, 17, 8, 55, tzinfo=dt.timezone.utc)),
        # Trailing whitespace, seen on EIA entries.
        ("Wed, 22 Jul 2026 09:00:00 EST ", dt.datetime(2026, 7, 22, 14, 0, tzinfo=dt.timezone.utc)),
    ])
    def test_parses_to_utc(self, raw, expected):
        assert parse_published(raw) == expected

    def test_the_eia_string_the_old_parser_failed_on(self):
        """The specific regression: must not resolve to 'now'."""
        parsed = parse_published("Fri, 31 Jul 2026  09:00:00 EST")
        assert parsed is not None
        assert parsed.month == 7 and parsed.day == 31
        # And nowhere near the moment the test runs.
        assert abs((dt.datetime.now(dt.timezone.utc) - parsed).days) > 1


class TestNeverInventsADate:
    """The whole point: unknown means None, not now()."""

    @pytest.mark.parametrize("raw", ["", None, "   ", "not a date", "yesterday", "0"])
    def test_unreadable_returns_none(self, raw):
        assert parse_published(raw) is None

    def test_no_input_ever_yields_approximately_now(self):
        for raw in ("", None, "garbage", "??", "Mon, 32 Xxx 9999"):
            assert parse_published(raw) is None


class TestPlausibilityBounds:
    def test_rejects_epoch_zero(self):
        """Feeds emit 1970 for missing dates; it would sort to the bottom and stay."""
        assert parse_published("Thu, 01 Jan 1970 00:00:00 GMT") is None

    def test_rejects_far_future(self):
        """A typo'd year would pin to the top of a recency feed permanently."""
        assert parse_published("Mon, 01 Jan 2099 00:00:00 GMT") is None

    def test_allows_small_future_skew(self):
        soon = dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=6)
        assert parse_published(soon.isoformat()) is not None

    def test_allows_recent_past(self):
        recent = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=3)
        parsed = parse_published(recent.isoformat())
        assert parsed is not None
        assert abs((parsed - recent).total_seconds()) < 1


class TestOtherInputForms:
    def test_datetime_passthrough_normalises_to_utc(self):
        naive = dt.datetime(2026, 8, 17, 12, 0)
        assert parse_published(naive) == dt.datetime(2026, 8, 17, 12, 0, tzinfo=dt.timezone.utc)

    def test_feedparser_struct_time_tuple(self):
        """feedparser's published_parsed, already UTC-normalised."""
        assert parse_published((2026, 8, 17, 6, 45, 0, 0, 229, 0)) == \
            dt.datetime(2026, 8, 17, 6, 45, tzinfo=dt.timezone.utc)

    def test_malformed_tuple_returns_none(self):
        assert parse_published(("a", "b", "c", "d", "e", "f")) is None

    def test_iso_helper_returns_string_or_none(self):
        assert parse_published_iso("Tue, 24 Mar 2026 07:00:00 GMT") == "2026-03-24T07:00:00+00:00"
        assert parse_published_iso("nonsense") is None
