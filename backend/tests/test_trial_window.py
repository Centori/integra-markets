"""The trial clock exposed on /api/subscriptions/entitlement.

Before this, the response carried `tier` and `limits` only. The client had no
way to know a trial was running or when it ended, so it could not warn anyone —
the app just became less capable on day 31, which reads as a bug rather than as
a prompt to subscribe.

This must never raise: /entitlement is what gates the whole app on launch, so a
failure to read the clock has to degrade to nulls, not to a 500.
"""

import datetime as dt

import pytest

from api.subscriptions import _trial_window


class FakeTable:
    def __init__(self, rows, raises=False):
        self._rows = rows
        self._raises = raises

    def select(self, *_a, **_k):
        return self

    def eq(self, *_a, **_k):
        return self

    def limit(self, *_a, **_k):
        return self

    def execute(self):
        if self._raises:
            raise RuntimeError("supabase down")
        return type("R", (), {"data": self._rows})()


class FakeSupabase:
    def __init__(self, rows, raises=False):
        self._rows, self._raises = rows, raises

    def table(self, _name):
        return FakeTable(self._rows, self._raises)


def _in(**kw) -> str:
    return (dt.datetime.now(dt.timezone.utc) + dt.timedelta(**kw)).isoformat()


# --- the happy path --------------------------------------------------------

def test_reports_days_remaining_on_a_running_trial():
    sb = FakeSupabase([{"trial_ends_at": _in(days=7, hours=1)}])
    out = _trial_window(sb, "u1", "free_trial")
    assert out["is_trial"] is True
    assert out["days_remaining"] == 8  # rounded up
    assert out["trial_ends_at"] is not None


def test_days_remaining_rounds_up():
    """Six hours left is "1 day", not "0 days". A trial that is still running
    must never report zero — that is the number the client uses to decide
    whether to warn."""
    sb = FakeSupabase([{"trial_ends_at": _in(hours=6)}])
    assert _trial_window(sb, "u1", "free_trial")["days_remaining"] == 1


def test_elapsed_trial_clamps_to_zero_not_negative():
    sb = FakeSupabase([{"trial_ends_at": _in(days=-3)}])
    assert _trial_window(sb, "u1", "free_trial")["days_remaining"] == 0


def test_api_trial_also_reports():
    sb = FakeSupabase([{"trial_ends_at": _in(days=10)}])
    assert _trial_window(sb, "u1", "api_trial")["is_trial"] is True


# --- everything else reports "not a trial" ---------------------------------

@pytest.mark.parametrize("tier", ["free", "basic", "basic_markets", "expired", "api_basic"])
def test_non_trial_tiers_report_no_trial(tier):
    sb = FakeSupabase([{"trial_ends_at": _in(days=5)}])
    out = _trial_window(sb, "u1", tier)
    assert out == {"is_trial": False, "trial_ends_at": None, "days_remaining": None}


# --- degradation: never raise ---------------------------------------------

def test_supabase_unavailable_returns_nulls():
    assert _trial_window(None, "u1", "free_trial")["is_trial"] is False


def test_query_failure_returns_nulls_rather_than_raising():
    sb = FakeSupabase([], raises=True)
    assert _trial_window(sb, "u1", "free_trial")["is_trial"] is False


def test_missing_row_returns_nulls():
    assert _trial_window(FakeSupabase([]), "u1", "free_trial")["is_trial"] is False


def test_null_trial_ends_at_returns_nulls():
    sb = FakeSupabase([{"trial_ends_at": None}])
    assert _trial_window(sb, "u1", "free_trial")["is_trial"] is False


def test_unparseable_date_returns_nulls_rather_than_raising():
    sb = FakeSupabase([{"trial_ends_at": "not-a-date"}])
    assert _trial_window(sb, "u1", "free_trial")["is_trial"] is False


def test_naive_timestamp_is_treated_as_utc():
    naive = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=4)).replace(tzinfo=None).isoformat()
    out = _trial_window(FakeSupabase([{"trial_ends_at": naive}]), "u1", "free_trial")
    assert out["is_trial"] is True
    assert out["days_remaining"] in (4, 5)  # tz-normalised, not off by a day
