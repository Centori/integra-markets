"""End-to-end wiring of metering into verify_api_key.

test_rate_limit.py covers the counter in isolation. Nothing covered the
dependency itself — no test in the suite called verify_api_key at all — so
the parts that actually reach a client (429 status, Retry-After, rate-limit
headers on SUCCESS) had no coverage.
"""
import datetime as dt
import sys
import types

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from services import rate_limit


@pytest.fixture(autouse=True)
def _clean():
    rate_limit.reset_cache()
    yield
    rate_limit.reset_cache()


class FakeQuery:
    def __init__(self, parent, table):
        self._p = parent
        self._t = table

    def select(self, *_a, **_k):
        return self

    def eq(self, *_a, **_k):
        return self

    def gte(self, *_a, **_k):
        return self

    def is_(self, *_a, **_k):
        return self

    def limit(self, *_a, **_k):
        return self

    def insert(self, *_a, **_k):
        return self

    def update(self, *_a, **_k):
        return self

    def execute(self):
        if self._t == "api_key_usage":
            return types.SimpleNamespace(count=self._p.usage_count, data=[])
        if self._t == "api_keys":
            return types.SimpleNamespace(count=None, data=[dict(self._p.key_row)])
        return types.SimpleNamespace(count=None, data=[])


class FakeSupabase:
    def __init__(self, key_row, usage_count):
        self.key_row = key_row
        self.usage_count = usage_count

    def table(self, name):
        return FakeQuery(self, name)


def _build(monkeypatch, tier="api_trial", usage_count=0):
    """Mount the REAL verify_api_key dependency on a throwaway app."""
    import hashlib

    from services import api_key_auth

    raw_key = api_key_auth.PUBLIC_PREFIX + "k" * 32
    key_row = {
        "id": "key-uuid",
        "user_id": "user-uuid",
        "key_prefix": raw_key[: api_key_auth.KEY_PREFIX_VISIBLE_LENGTH],
        "key_hash": api_key_auth.hash_key(raw_key),
        "revoked_at": None,
        "expires_at": None,
    }
    fake = FakeSupabase(key_row, usage_count)

    sb_mod = types.ModuleType("services._supabase")
    sb_mod.get_supabase_client = lambda: fake
    monkeypatch.setitem(sys.modules, "services._supabase", sb_mod)

    ent = types.SimpleNamespace(
        tier=tier,
        scopes=frozenset({"history"}),
        is_expired_tier=False,
    )
    monkeypatch.setattr(api_key_auth, "resolve_entitlement", lambda *_a, **_k: ent)

    app = FastAPI()

    @app.get("/probe")
    async def probe(auth: dict = Depends(api_key_auth.verify_api_key)):
        return {"tier": auth["_tier"]}

    return TestClient(app, raise_server_exceptions=False), raw_key


class TestSuccessPath:
    def test_rate_limit_headers_are_returned_on_success(self, monkeypatch):
        """Clients should be able to self-throttle instead of discovering the
        ceiling by hitting it."""
        client, key = _build(monkeypatch, tier="api_basic", usage_count=5)
        r = client.get("/probe", headers={"Authorization": f"Bearer {key}"})

        assert r.status_code == 200
        assert r.headers["X-RateLimit-Limit"] == str(rate_limit.limit_for_tier("api_basic"))
        assert int(r.headers["X-RateLimit-Remaining"]) > 0
        assert int(r.headers["X-RateLimit-Reset"]) > 0


class TestExhaustedPath:
    def test_over_limit_returns_429_with_retry_after(self, monkeypatch):
        limit = rate_limit.limit_for_tier("api_trial")
        client, key = _build(monkeypatch, tier="api_trial", usage_count=limit)
        r = client.get("/probe", headers={"Authorization": f"Bearer {key}"})

        assert r.status_code == 429
        assert int(r.headers["Retry-After"]) >= 1
        assert r.headers["X-RateLimit-Remaining"] == "0"
        assert "monthly request limit" in r.json()["detail"]

    def test_429_names_the_tier_and_the_limit(self, monkeypatch):
        """A quota error that does not say what the quota was is a support
        ticket."""
        limit = rate_limit.limit_for_tier("api_trial")
        client, key = _build(monkeypatch, tier="api_trial", usage_count=limit)
        detail = client.get("/probe", headers={"Authorization": f"Bearer {key}"}).json()["detail"]
        assert "api_trial" in detail and str(limit) in detail


class TestUnauthenticatedIsUnaffected:
    def test_missing_key_still_401s_before_metering(self, monkeypatch):
        client, _ = _build(monkeypatch)
        assert client.get("/probe").status_code == 401

    def test_malformed_key_still_401s(self, monkeypatch):
        client, _ = _build(monkeypatch)
        r = client.get("/probe", headers={"Authorization": "Bearer not-an-integra-key"})
        assert r.status_code == 401
