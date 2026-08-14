"""GDELT event-date resolution.

Caught on the first real backfill run (2026-08-14): the run requested
2020-01-01..2020-01-03 and wrote 56 rows dated 1920-01-01 and 2019-01-01.

Cause: the parser used GDELT column 1 ("Day"), which is the NOMINAL event
date, not the publication date. In 20200101000000.export.CSV every row
carries Day=20190101, and malformed values like 19200101 also occur.
Column 59 (DATEADDED) is when GDELT ingested the story and is both reliable
and the correct semantics for a backtesting archive — it is the first moment
a trader could have acted on the news.

A wrong date in a backtest archive is worse than a missing row: it silently
misaligns sentiment against prices. Rows whose date cannot be resolved
plausibly are dropped.
"""
import datetime as dt
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.backfill.gdelt import _resolve_event_date  # noqa: E402


class TestPrefersDateAdded:
    def test_dateadded_wins_over_disagreeing_day(self):
        """The exact shape of 20200101000000.export.CSV."""
        assert _resolve_event_date("20200101000000", "20190101") == dt.date(2020, 1, 1)

    def test_dateadded_wins_over_the_1920_junk_that_shipped(self):
        assert _resolve_event_date("20200101000000", "19200101") == dt.date(2020, 1, 1)


class TestFallback:
    def test_falls_back_to_day_when_dateadded_missing(self):
        assert _resolve_event_date("", "20200101") == dt.date(2020, 1, 1)

    def test_falls_back_when_dateadded_is_malformed(self):
        assert _resolve_event_date("not-a-date", "20200101") == dt.date(2020, 1, 1)


class TestRejection:
    def test_drops_row_when_both_dates_implausible(self):
        assert _resolve_event_date("", "19200101") is None

    def test_drops_row_on_garbage(self):
        assert _resolve_event_date("xx", "yy") is None
        assert _resolve_event_date("", "") is None
        assert _resolve_event_date(None, None) is None

    def test_rejects_absurd_future_dates(self):
        far_future = str(dt.date.today().year + 5) + "0101"
        assert _resolve_event_date("", far_future) is None

    def test_accepts_today(self):
        today = dt.date.today()
        assert _resolve_event_date("", today.strftime("%Y%m%d")) == today
