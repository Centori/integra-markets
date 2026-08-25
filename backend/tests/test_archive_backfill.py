"""The archive must walk backwards, and the cursor must not lie about it.

Before this, the archive only ever grew forward: every backfill source was a
manual CLI, nothing scheduled them, and `backfill_cursors` held no rows.

Wayback was the source that made scheduling unsafe. It never read its cursor,
so every run restarted from --since; it wrote the cursor as `until` -- the END
of the requested range -- regardless of how far it actually got, and
`cap_per_host` means it usually stopped short; and write_cursor sat outside the
except, so a host that raised still recorded "completed through until".

Scheduling that would have filled `backfill_cursors` with rows that looked like
progress while the oldest-document date never moved. These tests pin the three
properties that make a bounded run a checkpoint instead.
"""

import datetime as dt
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class _Recorder:
    """Captures cursor reads/writes and the windows each host was asked for."""

    def __init__(self, cursors=None):
        self.cursors = dict(cursors or {})
        self.writes = []
        self.windows = []


@pytest.fixture
def wb(monkeypatch):
    from scripts.backfill import wayback

    rec = _Recorder()

    monkeypatch.setattr(wayback, "read_cursor",
                        lambda sb, source, kind: rec.cursors.get(kind))
    monkeypatch.setattr(wayback, "write_cursor",
                        lambda sb, source, kind, value, rows: rec.writes.append(
                            (kind, value, rows)))
    # One host keeps the assertions readable.
    monkeypatch.setattr(wayback, "_HOSTS", [{
        "host": "oilprice.com",
        "path_prefix": "oilprice.com/Energy/",
        "source_name": "OilPrice.com (archive)",
        "category": "energy",
    }])

    def _fake_host(sb, cfg, *, since, until, cap):
        rec.windows.append((since, until))
        return 7

    monkeypatch.setattr(wayback, "_backfill_host", _fake_host)
    return wayback, rec


class TestResume:
    def test_cursor_is_read_and_advances_the_start(self, wb):
        wayback, rec = wb
        rec.cursors["oilprice.com"] = "2022-06-01"
        wayback.backfill(None, since=dt.date(2020, 1, 1), until=dt.date(2026, 1, 1))
        assert rec.windows[0][0] == dt.date(2022, 6, 1), "did not resume from cursor"

    def test_a_run_with_no_cursor_starts_at_since(self, wb):
        wayback, rec = wb
        wayback.backfill(None, since=dt.date(2020, 1, 1), until=dt.date(2026, 1, 1))
        assert rec.windows[0][0] == dt.date(2020, 1, 1)

    def test_completed_host_is_skipped_entirely(self, wb):
        wayback, rec = wb
        rec.cursors["oilprice.com"] = "2026-01-01"
        wayback.backfill(None, since=dt.date(2020, 1, 1), until=dt.date(2026, 1, 1))
        assert rec.windows == [], "re-walked an already-complete host"
        assert rec.writes == []

    def test_unreadable_cursor_falls_back_rather_than_crashing(self, wb):
        wayback, rec = wb
        rec.cursors["oilprice.com"] = "not-a-date"
        wayback.backfill(None, since=dt.date(2020, 1, 1), until=dt.date(2026, 1, 1))
        assert rec.windows[0][0] == dt.date(2020, 1, 1)


class TestBounding:
    def test_max_days_bounds_the_window(self, wb):
        wayback, rec = wb
        wayback.backfill(None, since=dt.date(2020, 1, 1),
                         until=dt.date(2026, 1, 1), max_days=3)
        since, until = rec.windows[0]
        assert (until - since).days == 3

    def test_without_max_days_the_whole_range_is_attempted(self, wb):
        wayback, rec = wb
        wayback.backfill(None, since=dt.date(2020, 1, 1), until=dt.date(2020, 2, 1))
        assert rec.windows[0] == (dt.date(2020, 1, 1), dt.date(2020, 2, 1))

    def test_bounding_never_overshoots_until(self, wb):
        wayback, rec = wb
        wayback.backfill(None, since=dt.date(2020, 1, 1),
                         until=dt.date(2020, 1, 2), max_days=90)
        assert rec.windows[0][1] == dt.date(2020, 1, 2)

    def test_repeated_bounded_runs_walk_forward(self, wb):
        """The property that makes scheduling work at all."""
        wayback, rec = wb
        for _ in range(3):
            wayback.backfill(None, since=dt.date(2020, 1, 1),
                             until=dt.date(2026, 1, 1), max_days=5)
            if rec.writes:
                rec.cursors["oilprice.com"] = rec.writes[-1][1]
        starts = [w[0] for w in rec.windows]
        assert starts == [dt.date(2020, 1, 1), dt.date(2020, 1, 6), dt.date(2020, 1, 11)]


class TestCursorHonesty:
    def test_cursor_records_the_window_attempted_not_the_requested_end(self, wb):
        """It used to write `until` however far it actually got."""
        wayback, rec = wb
        wayback.backfill(None, since=dt.date(2020, 1, 1),
                         until=dt.date(2026, 1, 1), max_days=3)
        assert rec.writes[0][1] == "2020-01-04"
        assert rec.writes[0][1] != "2026-01-01", "cursor overstates progress"

    def test_a_failed_window_does_not_advance_the_cursor(self, wb, monkeypatch):
        """A failed window must be retried, not skipped."""
        wayback, rec = wb

        def _boom(sb, cfg, *, since, until, cap):
            raise RuntimeError("CDX timeout")

        monkeypatch.setattr(wayback, "_backfill_host", _boom)
        total = wayback.backfill(None, since=dt.date(2020, 1, 1),
                                 until=dt.date(2026, 1, 1), max_days=3)
        assert rec.writes == [], "advanced the cursor over a failed window"
        assert total == 0

    def test_rows_ingested_is_recorded(self, wb):
        wayback, rec = wb
        wayback.backfill(None, since=dt.date(2020, 1, 1),
                         until=dt.date(2026, 1, 1), max_days=3)
        assert rec.writes[0][2] == 7


class TestJobWiring:
    def test_only_schedulable_sources_are_scheduled(self):
        """Four of run_all's eight sources are unimplemented stubs; two of the
        rest do not bound their work. Scheduling all eight would generate load
        without moving the oldest-document date."""
        from jobs.archive_backfill import ARCHIVE_BACKFILL_SOURCES
        assert ARCHIVE_BACKFILL_SOURCES == ["gdelt", "wayback"]

    def test_stub_sources_are_not_scheduled(self):
        from jobs.archive_backfill import ARCHIVE_BACKFILL_SOURCES
        for stub in ("imf_pcp", "kalshi", "polymarket", "usda_nass"):
            assert stub not in ARCHIVE_BACKFILL_SOURCES

    def test_budget_is_small(self):
        """This runs inside the API process, behind a 300s healthcheck."""
        from jobs.archive_backfill import MAX_DAYS_PER_TICK
        assert 1 <= MAX_DAYS_PER_TICK <= 14

    def test_run_is_disableable_without_a_redeploy(self, monkeypatch):
        import importlib
        monkeypatch.setenv("INTEGRA_DISABLE_BACKFILL", "true")
        import jobs.archive_backfill as ab
        importlib.reload(ab)
        assert ab.run() == {"skipped": "disabled"}
        monkeypatch.delenv("INTEGRA_DISABLE_BACKFILL")
        importlib.reload(ab)

    def test_run_never_raises(self, monkeypatch):
        """A broken job must not take the scheduler down."""
        import jobs.archive_backfill as ab
        monkeypatch.setattr(ab, "_tick", lambda: (_ for _ in ()).throw(RuntimeError("boom")))
        assert "error" in ab.run()

    def test_scheduler_registers_the_job(self):
        import inspect
        from jobs import scheduler
        src = inspect.getsource(scheduler.start_all)
        assert "archive_backfill" in src
        assert "interval_s=3600" in src
