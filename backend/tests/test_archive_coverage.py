"""A seven-year archive that every evaluator reads as thirty days.

`entity_mentions` holds 386,201 scored mentions across 49 commodities with
continuous coverage from 2020. A caller on `api_basic` may query 30 days of it —
0.79% — and nothing in any response said the rest existed.

That is not hypothetical. A developer evaluating the product reported in writing
that the dataset was "33 days deep" and built a strategic critique on it; the
figure was the depth cap, not the data, and there was no way to tell the
difference from outside. The fix is not to lift the cap. It is to label the
window as a window.

So the property under test is narrow and load-bearing: **coverage is reported
independently of entitlement**. A trial-tier key that can read 24 hours must
still be told the archive reaches 2020.
"""

from __future__ import annotations

import types

import pytest

from services import archive_coverage


class FakeRpc:
    RAISE = object()

    def __init__(self, row):
        self.row = row
        self.calls = 0

    def rpc(self, name, params):
        self.calls += 1
        row = self.row

        class _E:
            def execute(_s):
                if row is FakeRpc.RAISE:
                    raise RuntimeError("rpc exploded")
                return types.SimpleNamespace(data=row)

        return _E()


ROW = [{
    "earliest": "2017-03-10",
    "dense_from": "2020-01-01",
    "latest": "2026-09-29",
    "total_mentions": 386201,
    "entities": 49,
    "active_days": 2045,
}]


@pytest.fixture(autouse=True)
def _clean():
    archive_coverage.reset_cache()
    yield
    archive_coverage.reset_cache()


class TestCoverageIgnoresEntitlement:
    """The whole point. These would all have passed trivially before, because
    there was no coverage field at all — which is the bug."""

    def test_a_one_day_caller_is_told_the_archive_reaches_2020(self):
        block = archive_coverage.describe(FakeRpc(ROW), your_depth_days=1)
        assert block["continuous_from"] == "2020-01-01"
        assert block["total_mentions"] == 386201
        assert block["commodities"] == 49

    def test_the_numbers_do_not_change_with_the_caller(self):
        trial = archive_coverage.describe(FakeRpc(ROW), your_depth_days=1)
        basic = archive_coverage.describe(FakeRpc(ROW), your_depth_days=30)
        archive = archive_coverage.describe(FakeRpc(ROW), your_depth_days=float("inf"))
        for field in ("continuous_from", "earliest", "latest", "total_mentions", "commodities"):
            assert trial[field] == basic[field] == archive[field], (
                f"{field} moved with the caller's plan — coverage describes the "
                f"archive, not the entitlement"
            )

    def test_the_caller_is_told_their_own_limit_beside_it(self):
        """Coverage without the cap beside it would overstate what they can read."""
        block = archive_coverage.describe(FakeRpc(ROW), your_depth_days=30)
        assert block["your_query_depth_days"] == 30
        assert block["you_can_read_from"] is not None

    def test_unlimited_depth_is_null_not_infinity(self):
        """math.inf is not JSON — json.dumps emits bare Infinity, which
        JSON.parse rejects, so the archive customer's own response would break."""
        import json

        block = archive_coverage.describe(FakeRpc(ROW), your_depth_days=float("inf"))
        assert block["your_query_depth_days"] is None
        assert block["you_can_read_from"] is None
        json.loads(json.dumps(block))


class TestTheFigureIsHonest:
    def test_continuous_from_is_preferred_over_the_literal_minimum(self):
        """`earliest` is 2017-03-10 on the strength of TWO mentions. Leading with
        it would claim nine years of coverage from a backfill artefact — the same
        error as printing a score computed on one article beside one computed on
        nine hundred."""
        block = archive_coverage.describe(FakeRpc(ROW), your_depth_days=30)
        assert block["continuous_from"] == "2020-01-01"
        assert block["earliest"] == "2017-03-10"
        assert block["continuous_from"] != block["earliest"]

    def test_the_note_warns_that_earliest_is_sparse(self):
        """A client that leads with `earliest` should have been told not to."""
        note = archive_coverage.describe(FakeRpc(ROW), your_depth_days=30)["note"]
        assert "sparse" in note.lower()
        assert "entitlement" in note.lower()

    def test_the_403_label_names_the_dense_date_not_the_sparse_one(self):
        label = archive_coverage.earliest_readable_label(FakeRpc(ROW))
        assert "2020-01-01" in label
        assert "2017" not in label
        assert "386,201" in label


class TestFailsSoft:
    def test_a_failed_rpc_returns_none_rather_than_raising(self):
        """Coverage is descriptive. A request that would otherwise succeed must
        not 500 because a descriptive field could not be computed."""
        assert archive_coverage.describe(FakeRpc(FakeRpc.RAISE), your_depth_days=30) is None

    def test_no_supabase_client_returns_none(self):
        assert archive_coverage.describe(None, your_depth_days=30) is None

    def test_an_unexpected_shape_returns_none(self):
        assert archive_coverage.describe(FakeRpc({"not": "a list"}), your_depth_days=30) is None

    def test_the_403_label_is_none_rather_than_a_half_sentence(self):
        """A refusal that trails off mid-claim is worse than one that does not
        make the claim."""
        assert archive_coverage.earliest_readable_label(FakeRpc(FakeRpc.RAISE)) is None
        assert archive_coverage.earliest_readable_label(FakeRpc([{"dense_from": None}])) is None


class TestCaching:
    def test_repeated_calls_hit_the_rpc_once(self):
        """This runs on every /v1 request and scans entity_mentions."""
        fake = FakeRpc(ROW)
        for _ in range(5):
            archive_coverage.describe(fake, your_depth_days=30)
        assert fake.calls == 1

    def test_a_failure_is_not_cached(self):
        """Caching a failure would hide the archive for a whole TTL after one
        transient error."""
        fake = FakeRpc(FakeRpc.RAISE)
        archive_coverage.describe(fake, your_depth_days=30)
        archive_coverage.describe(fake, your_depth_days=30)
        assert fake.calls == 2
