"""Per-key monthly metering.

api_key_usage recorded every request since launch and nothing read it. These
tests pin the behaviour that makes it an actual limit — and, just as
importantly, the behaviour that stops a broken counter from taking the API
down with it.
"""
import datetime as dt
import types

import pytest

from services import rate_limit


@pytest.fixture(autouse=True)
def _clean():
    rate_limit.reset_cache()
    yield
    rate_limit.reset_cache()


class FakeSupabase:
    """Returns a fixed count, or raises to simulate an unreachable backend."""

    def __init__(self, count=0, boom=False):
        self._count = count
        self._boom = boom
        self.calls = 0

    def table(self, _name):
        return self

    def select(self, *_a, **_k):
        return self

    def eq(self, *_a, **_k):
        return self

    def gte(self, *_a, **_k):
        return self

    def limit(self, *_a, **_k):
        return self

    def execute(self):
        self.calls += 1
        if self._boom:
            raise RuntimeError("postgrest unreachable")
        return types.SimpleNamespace(count=self._count, data=[])


class TestLimitsByTier:
    def test_each_tier_has_its_own_allowance(self):
        assert rate_limit.limit_for_tier("api_trial") < rate_limit.limit_for_tier("api_basic")
        assert rate_limit.limit_for_tier("api_basic") < rate_limit.limit_for_tier("api_history")

    def test_unknown_tier_gets_the_most_restrictive_allowance(self):
        """An unknown tier is a bug. The safe reading of a bug is 'give the
        least', never 'give everything'."""
        assert rate_limit.limit_for_tier("wat") == rate_limit.limit_for_tier("api_trial")
        assert rate_limit.limit_for_tier(None) == rate_limit.limit_for_tier("api_trial")


class TestEnforcement:
    def test_under_the_limit_is_allowed_and_reports_remaining(self):
        sb = FakeSupabase(count=10)
        allowed, info = rate_limit.check_and_consume(sb, "key-1", "api_basic")
        assert allowed is True
        assert info["limit"] == rate_limit.limit_for_tier("api_basic")
        assert info["remaining"] == info["limit"] - 11  # 10 counted + this one

    def test_at_the_limit_is_refused(self):
        limit = rate_limit.limit_for_tier("api_trial")
        sb = FakeSupabase(count=limit)
        allowed, info = rate_limit.check_and_consume(sb, "key-2", "api_trial")
        assert allowed is False
        assert info["remaining"] == 0

    def test_the_request_that_trips_the_limit_is_refused_not_served(self):
        """Off-by-one matters: a user who has used exactly their allowance is
        done, not entitled to one more."""
        limit = rate_limit.limit_for_tier("api_trial")
        sb = FakeSupabase(count=limit - 1)
        allowed, _ = rate_limit.check_and_consume(sb, "key-3", "api_trial")
        assert allowed is True                      # the last permitted one
        allowed, _ = rate_limit.check_and_consume(sb, "key-3", "api_trial")
        assert allowed is False                     # cached count now == limit


class TestFailsOpen:
    def test_uncountable_usage_allows_the_request(self):
        """A metering backend that cannot count must not take the API down.
        Contrast entitlement.resolve(), which fails CLOSED because it answers
        'may this person read this at all'."""
        sb = FakeSupabase(boom=True)
        allowed, info = rate_limit.check_and_consume(sb, "key-4", "api_trial")
        assert allowed is True
        assert info["degraded"] is True
        assert info["remaining"] is None

    def test_degraded_response_still_carries_limit_headers(self):
        sb = FakeSupabase(boom=True)
        _, info = rate_limit.check_and_consume(sb, "key-5", "api_basic")
        headers = rate_limit.rate_limit_headers(info)
        assert "X-RateLimit-Limit" in headers and "X-RateLimit-Reset" in headers
        assert "X-RateLimit-Remaining" not in headers  # unknown, so not claimed


class TestCaching:
    def test_count_is_not_refetched_on_every_request(self):
        """Counting per request would add a third round-trip to a path that
        already makes two."""
        sb = FakeSupabase(count=0)
        for _ in range(5):
            rate_limit.check_and_consume(sb, "key-6", "api_basic")
        assert sb.calls == 1

    def test_month_rollover_refetches(self):
        sb = FakeSupabase(count=5)
        jan = dt.datetime(2027, 1, 15, tzinfo=dt.timezone.utc)
        feb = dt.datetime(2027, 2, 2, tzinfo=dt.timezone.utc)
        rate_limit.check_and_consume(sb, "key-7", "api_basic", now=jan)
        assert sb.calls == 1
        rate_limit.check_and_consume(sb, "key-7", "api_basic", now=feb)
        assert sb.calls == 2, "new billing period must re-read the count"


class TestPeriodMath:
    def test_period_start_is_first_of_month_utc(self):
        d = dt.datetime(2026, 8, 27, 13, 45, tzinfo=dt.timezone.utc)
        assert rate_limit.period_start(d) == dt.datetime(2026, 8, 1, tzinfo=dt.timezone.utc)

    def test_december_rolls_into_january(self):
        d = dt.datetime(2026, 12, 20, tzinfo=dt.timezone.utc)
        assert rate_limit.period_end(d) == dt.datetime(2027, 1, 1, tzinfo=dt.timezone.utc)

    def test_retry_after_is_positive(self):
        d = dt.datetime(2026, 8, 31, 23, 59, 59, tzinfo=dt.timezone.utc)
        info = {"reset": rate_limit.period_end(d)}
        assert rate_limit.retry_after_seconds(info, now=d) >= 1
