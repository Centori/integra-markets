"""The "100 req/sec burst" the dashboard advertised did not exist.

Monthly metering counts CALLS PER MONTH and says nothing about rate. A key with
50,000 calls remaining could spend them as fast as the network allowed, so one
`while true` loop could saturate the backend for every other customer while
staying inside its plan — and the dashboard was simultaneously promising a
per-second figure that no code anywhere enforced.

These tests pin the bucket's behaviour, including the two properties that make
it safe to publish a number: a new key is not refused on its first request, and
the published rate is a floor rather than a ceiling.
"""

from __future__ import annotations

import pytest

from services import rate_limit
from services.rate_limit import (
    BURST_CAPACITY_FACTOR,
    burst_rate_for_tier,
    check_burst,
    plan_spec,
)


@pytest.fixture(autouse=True)
def _clean():
    rate_limit.reset_burst_cache()
    yield
    rate_limit.reset_burst_cache()


def test_a_brand_new_key_is_not_refused_on_its_first_request():
    """A bucket that starts empty reads to the customer as a dead key."""
    allowed, _ = check_burst("fresh-key", "api_basic")
    assert allowed


def test_the_bucket_refuses_once_its_capacity_is_spent():
    rate = burst_rate_for_tier("api_basic")
    capacity = int(rate * BURST_CAPACITY_FACTOR)

    # All at the same instant, so no tokens refill in between.
    results = [check_burst("k", "api_basic", now=1000.0)[0] for _ in range(capacity + 5)]

    assert all(results[:capacity]), "the advertised burst must be servable in full"
    assert not any(results[capacity:]), "past the burst, requests must be refused"


def test_tokens_refill_at_the_sustained_rate():
    rate = burst_rate_for_tier("api_basic")
    capacity = int(rate * BURST_CAPACITY_FACTOR)
    for _ in range(capacity + 2):
        check_burst("k", "api_basic", now=1000.0)
    assert check_burst("k", "api_basic", now=1000.0)[0] is False

    # One second later exactly `rate` requests are available again, and no more.
    later = [check_burst("k", "api_basic", now=1001.0)[0] for _ in range(int(rate) + 2)]
    assert sum(later) == int(rate)


def test_a_refusal_says_how_long_to_wait():
    """Retry-After is derived from this; a client with no number busy-loops."""
    rate = burst_rate_for_tier("api_trial")
    for _ in range(int(rate * BURST_CAPACITY_FACTOR) + 1):
        check_burst("k", "api_trial", now=500.0)
    allowed, info = check_burst("k", "api_trial", now=500.0)
    assert not allowed
    assert 0 < info["retry_after"] <= 1.0 / rate + 1e-9


def test_buckets_are_per_key():
    """One customer's loop must not throttle another's."""
    for _ in range(int(burst_rate_for_tier("api_basic") * BURST_CAPACITY_FACTOR) + 1):
        check_burst("noisy", "api_basic", now=1.0)
    assert check_burst("noisy", "api_basic", now=1.0)[0] is False
    assert check_burst("quiet", "api_basic", now=1.0)[0] is True


def test_an_unknown_tier_gets_the_most_restrictive_rate():
    """Matches _FALLBACK_LIMIT: an unrecognised tier is a bug, and the safe
    reading of a bug is 'give the least'."""
    assert burst_rate_for_tier("nonsense") == burst_rate_for_tier("api_trial")
    assert burst_rate_for_tier(None) == burst_rate_for_tier("api_trial")


def test_paid_tiers_are_faster_than_the_free_beta():
    assert burst_rate_for_tier("api_basic") > burst_rate_for_tier("api_trial")
    assert burst_rate_for_tier("api_history") >= burst_rate_for_tier("api_basic")


# --- the published number ---------------------------------------------------

def test_the_published_spec_reads_the_enforced_constants():
    """The bug this whole endpoint exists for.

    The dashboard hard-coded "100k requests / month, 100 req/sec burst" while
    api_basic enforced 50,000/month and nothing enforced a rate. A paying
    customer was promised double their allowance. Asserting that plan_spec
    agrees with the limit functions is what stops the two from drifting again.
    """
    for tier in ("api_trial", "api_basic", "api_history"):
        spec = plan_spec(tier)
        assert spec["requests_per_month"] == rate_limit.limit_for_tier(tier)
        assert spec["requests_per_second"] == burst_rate_for_tier(tier)
        assert spec["exports_per_month"] == rate_limit.export_count_limit(tier)


def test_the_spec_is_json_serialisable():
    """query_depth_days is math.inf for the archive tier, and inf is not JSON.

    json.dumps emits bare `Infinity`, which is invalid JSON that JSON.parse
    rejects — so the archive tier's own limits page would have been the one that
    failed to load.
    """
    import json

    spec = plan_spec("api_history")
    assert spec["query_depth_days"] is None, "unlimited must serialise as null"
    json.loads(json.dumps(spec))  # raises if anything is inf/nan
