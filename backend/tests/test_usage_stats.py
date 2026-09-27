"""The Usage page's numbers, and the one failure mode that must not be silent.

A usage page that renders 0 requests because its query errored tells a paying
customer their integration is dead. That is a worse outcome than the "Soon"
placeholder it replaces, so the distinction between "no usage" and "we could not
read your usage" is carried all the way to the response rather than collapsed
into a zero.
"""

from __future__ import annotations

import datetime as dt
import types

import pytest

from services import usage_stats
from services.rate_limit import limit_for_tier


class FakeRpc:
    """Supabase stub whose per-RPC results are scripted.

    A value of RAISE makes that RPC blow up, which is how the degraded paths are
    exercised — the interesting case is one RPC failing while the others work.
    """

    RAISE = object()

    def __init__(self, results):
        self.results = results
        self.calls = []

    def rpc(self, name, params):
        self.calls.append((name, params))
        outcome = self.results.get(name, [])

        class _Exec:
            def execute(_self):
                if outcome is FakeRpc.RAISE:
                    raise RuntimeError(f"{name} exploded")
                return types.SimpleNamespace(data=outcome)

        return _Exec()


def _keys(*rows):
    return list(rows)


def _key(requests=0, errors=0, throttled=0, name="prod", prefix="ik_live_abc"):
    return {
        "key_id": "k1",
        "key_name": name,
        "key_prefix": prefix,
        "revoked": False,
        "requests": requests,
        "errors": errors,
        "rate_limited": throttled,
        "p50_ms": 40,
        "p95_ms": 210,
        "last_used_at": "2026-09-27T00:00:00+00:00",
    }


class TestTheHeadlineNumber:
    def test_requests_are_summed_from_the_per_key_rows(self):
        """Summed rather than counted separately, so the headline and the table
        can never disagree — which is the first thing a customer checks when
        they doubt the number."""
        fake = FakeRpc({"api_usage_by_key": _keys(_key(requests=120), _key(requests=80))})
        out = usage_stats.summarise(fake, "u1", "api_basic")
        assert out["current"]["requests"] == 200
        assert sum(r["requests"] for r in out["by_key"]["rows"]) == 200

    def test_remaining_is_the_enforced_limit_minus_usage(self):
        fake = FakeRpc({"api_usage_by_key": _keys(_key(requests=1000))})
        out = usage_stats.summarise(fake, "u1", "api_basic")
        assert out["current"]["limit"] == limit_for_tier("api_basic")
        assert out["current"]["remaining"] == limit_for_tier("api_basic") - 1000

    def test_remaining_never_goes_negative(self):
        """The cached counter in rate_limit can overshoot the cap by up to one
        TTL window. A customer does not need to see "-3 remaining"."""
        over = limit_for_tier("api_trial") + 50
        fake = FakeRpc({"api_usage_by_key": _keys(_key(requests=over))})
        out = usage_stats.summarise(fake, "u1", "api_trial")
        assert out["current"]["remaining"] == 0
        assert out["current"]["percent_used"] == 100.0

    def test_error_rate_is_a_percentage_of_requests(self):
        fake = FakeRpc({"api_usage_by_key": _keys(_key(requests=200, errors=5))})
        out = usage_stats.summarise(fake, "u1", "api_basic")
        assert out["current"]["error_rate"] == 2.5

    def test_error_rate_of_a_silent_account_is_not_a_division_by_zero(self):
        fake = FakeRpc({"api_usage_by_key": _keys(_key(requests=0))})
        out = usage_stats.summarise(fake, "u1", "api_basic")
        assert out["current"]["requests"] == 0
        assert out["current"]["error_rate"] is None


class TestDegradedIsNotZero:
    def test_a_failed_rpc_reports_unavailable_rather_than_no_usage(self):
        fake = FakeRpc({"api_usage_by_key": FakeRpc.RAISE})
        out = usage_stats.summarise(fake, "u1", "api_basic")
        assert out["current"]["available"] is False
        assert out["current"]["requests"] is None, (
            "0 would tell a paying customer their integration is dead"
        )
        assert out["by_key"]["available"] is False

    def test_sections_fail_independently(self):
        """One broken RPC must not blank the whole page."""
        fake = FakeRpc({
            "api_usage_by_key": _keys(_key(requests=10)),
            "api_usage_daily": FakeRpc.RAISE,
            "api_usage_by_endpoint": [
                {"endpoint": "/v1/sentiment/oil", "method": "GET",
                 "requests": 10, "errors": 0, "p95_ms": 90},
            ],
        })
        out = usage_stats.summarise(fake, "u1", "api_basic")
        assert out["current"]["available"] is True
        assert out["daily"]["available"] is False
        assert out["by_endpoint"]["available"] is True

    def test_an_empty_result_is_available_and_zero(self):
        """[] and None mean different things and must not be conflated."""
        fake = FakeRpc({"api_usage_by_key": []})
        out = usage_stats.summarise(fake, "u1", "api_basic")
        assert out["current"]["available"] is True
        assert out["current"]["requests"] == 0

    def test_a_non_list_rpc_result_is_treated_as_a_failure(self):
        """PostgREST returning a scalar or a dict means the function signature
        changed under us; rendering it as usage would invent numbers."""
        fake = FakeRpc({"api_usage_by_key": {"unexpected": True}})
        out = usage_stats.summarise(fake, "u1", "api_basic")
        assert out["current"]["available"] is False


class TestThePeriodMatchesEnforcement:
    def test_the_window_is_the_utc_calendar_month(self):
        """Usage is metered against calendar months. A rolling 30-day window
        here beside a 'remaining' figure from calendar months would disagree
        with itself by construction."""
        now = dt.datetime(2026, 9, 27, 13, 0, tzinfo=dt.timezone.utc)
        fake = FakeRpc({"api_usage_by_key": []})
        out = usage_stats.summarise(fake, "u1", "api_basic", now=now)
        assert out["period"]["start"].startswith("2026-09-01T00:00:00")
        assert out["period"]["end"].startswith("2026-10-01T00:00:00")
        assert out["period"]["label"] == "September 2026"

    def test_the_by_key_rpc_is_asked_for_that_same_period(self):
        now = dt.datetime(2026, 9, 27, tzinfo=dt.timezone.utc)
        fake = FakeRpc({"api_usage_by_key": []})
        usage_stats.summarise(fake, "u1", "api_basic", now=now)
        params = dict(fake.calls)["api_usage_by_key"]
        assert params["p_since"].startswith("2026-09-01")

    def test_the_user_id_is_passed_through_unchanged(self):
        """The RPCs are security definer and filter on this argument, so it has
        to be the verified one — asserted here so a refactor that starts
        transforming it fails loudly."""
        fake = FakeRpc({"api_usage_by_key": []})
        usage_stats.summarise(fake, "the-real-user", "api_basic")
        for _name, params in fake.calls:
            assert params["p_user_id"] == "the-real-user"


class TestSerialisable:
    def test_the_whole_payload_is_valid_json(self):
        """plan_spec carries math.inf for the archive tier's query depth, and
        json.dumps emits bare Infinity — invalid JSON that JSON.parse rejects.
        The archive customer's own usage page would be the one that broke."""
        import json

        fake = FakeRpc({"api_usage_by_key": _keys(_key(requests=5))})
        out = usage_stats.summarise(fake, "u1", "api_history")
        json.loads(json.dumps(out))
