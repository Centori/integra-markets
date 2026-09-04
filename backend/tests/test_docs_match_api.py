"""The published docs page must describe the API that exists.

`dashboard/app/docs/page.tsx` is hand-written on purpose — it is styled with
the dashboard's own tokens so it looks like the product rather than like a
docs tool, and it is deliberately dependency-free.

The cost of hand-writing it is drift, and drift had already happened:

  * /v1/export/sentiment was implemented, sold, and absent from the page
  * the page stated scores run 0-1 with 0.5 neutral, while every /v1 sentiment
    endpoint returns the SIGNED column (-1..+1, 0 neutral) — so a customer
    reading 0.3 as mildly bearish was reading a mildly BULLISH number
  * /api-tier advertised /v1/news, which does not exist
  * /api-tier advertised 100k requests/month against a real api_basic limit of
    50,000, and a "100 req/sec burst" that no limiter implements

This test does not render the page. It reads the endpoint table out of the TSX
and compares it to the filtered spec both SDKs are built from, so the table
cannot silently diverge from the API again. The prose stays hand-maintained —
that is the trade the bespoke page makes, and it is a reasonable one.
"""

import json
import os
import re

import pytest

REPO_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
DOCS_PAGE = os.path.join(REPO_ROOT, "dashboard", "app", "docs", "page.tsx")
SPEC = os.path.join(REPO_ROOT, "openapi.json")

# Rows look like:
#   { method: "GET", path: "/v1/sentiment", summary: "..." },
_ROW = re.compile(r'\{\s*method:\s*"(\w+)",\s*path:\s*"([^"]+)"')


@pytest.fixture(scope="module")
def documented():
    if not os.path.exists(DOCS_PAGE):
        pytest.skip("docs page not present")
    return {(m.upper(), p) for m, p in _ROW.findall(open(DOCS_PAGE).read())}


@pytest.fixture(scope="module")
def published():
    if not os.path.exists(SPEC):
        pytest.skip("no committed openapi.json")
    spec = json.load(open(SPEC))
    return {
        (method.upper(), path)
        for path, item in spec["paths"].items()
        for method in item
        if method in ("get", "post", "put", "patch", "delete")
    }


class TestEndpointTable:
    def test_every_v1_endpoint_is_documented(self, documented, published):
        """An endpoint customers can call but cannot find. /v1/export/sentiment
        was in exactly this state."""
        missing = sorted(published - documented)
        assert not missing, f"implemented but not on the docs page: {missing}"

    def test_no_documented_v1_endpoint_is_imaginary(self, documented, published):
        """The other direction — documenting something that 404s is worse than
        documenting nothing, because the reader follows it."""
        v1_documented = {(m, p) for m, p in documented if p.startswith("/v1")}
        phantom = sorted(v1_documented - published)
        assert not phantom, f"documented but not implemented: {phantom}"

    def test_key_management_rows_are_present(self, documented):
        """These are NOT in the published spec — they authenticate with a
        dashboard session rather than an API key, so build_openapi_spec.py
        deliberately excludes them. They still belong on the page."""
        for row in (("GET", "/api/keys"), ("POST", "/api/keys")):
            assert row in documented, f"{row} missing from the docs page"


class TestProseClaims:
    """Narrative the endpoint table cannot guard. Pinned because each of these
    was wrong on the live page."""

    @pytest.fixture(scope="class")
    def docs_src(self):
        if not os.path.exists(DOCS_PAGE):
            pytest.skip("docs page not present")
        return open(DOCS_PAGE).read()

    @pytest.fixture(scope="class")
    def tier_src(self):
        p = os.path.join(REPO_ROOT, "dashboard", "app", "api-tier", "page.tsx")
        if not os.path.exists(p):
            pytest.skip("api-tier page not present")
        return open(p).read()

    def test_score_scale_is_not_described_as_0_to_1(self, docs_src):
        """/v1/sentiment returns the mean of sentiment_score, and
        /v1/sentiment/{c}/now returns sentiment_score directly. Both are signed.
        _label_for's own docstring says so."""
        assert "0.5</code> neutral" not in docs_src
        assert "0–1 where 0.5 is neutral" not in docs_src

    def test_signed_scale_is_stated(self, docs_src):
        assert "−1…+1" in docs_src

    def test_json_claim_admits_the_export_endpoint(self, docs_src):
        """/v1/export/sentiment streams CSV or XLSX."""
        assert "All\n          responses are JSON" not in docs_src
        assert "export/sentiment" in docs_src

    def test_pricing_does_not_sell_a_missing_endpoint(self, tier_src):
        assert "/v1/news" not in tier_src, "/v1/news does not exist"

    def test_pricing_quotes_the_enforced_limit(self, tier_src):
        """api_basic is 50,000/month in services/rate_limit.py."""
        assert "100k requests" not in tier_src
        assert "50,000 requests" in tier_src

    def test_pricing_does_not_promise_an_unimplemented_burst_limit(self, tier_src):
        """No per-second limiter exists — only a monthly counter."""
        assert "req/sec" not in tier_src
