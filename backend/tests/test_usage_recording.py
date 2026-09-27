"""api_key_usage.status_code has been NULL on every row since launch.

The column was declared in the first migration. The write that fills it lived
inside `verify_api_key` — a dependency, which runs BEFORE the handler — so at
the moment of the insert there was no status code to record. Nothing failed;
the column was simply never populated, and two things followed:

  * **No error rate.** A customer whose integration returns 403 on every call
    saw a healthy request count. "Is it me or is it you" was unanswerable from
    the data we were collecting.
  * **Refusals were not recorded at all.** The write sat after the entitlement
    check and after metering, so 401, 403 and 429 responses left no row. Being
    throttled is the single event a customer most needs to see in their usage,
    and it was the one event guaranteed to be missing.

Both are fixed by staging the record in the dependency and flushing it from
middleware, where a response exists. These tests assert on what actually
reaches the insert.
"""

from __future__ import annotations

import sys
import types

import pytest
from fastapi import Depends, FastAPI, HTTPException
from fastapi.testclient import TestClient

from services import rate_limit


@pytest.fixture(autouse=True)
def _clean():
    rate_limit.reset_cache()
    rate_limit.reset_burst_cache()
    yield
    rate_limit.reset_cache()
    rate_limit.reset_burst_cache()


class RecordingQuery:
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

    def insert(self, payload, *_a, **_k):
        if self._t == "api_key_usage":
            self._p.usage_rows.append(payload)
        return self

    def update(self, *_a, **_k):
        return self

    def execute(self):
        if self._t == "api_key_usage":
            return types.SimpleNamespace(count=self._p.usage_count, data=[])
        if self._t == "api_keys":
            return types.SimpleNamespace(count=None, data=[dict(self._p.key_row)])
        return types.SimpleNamespace(count=None, data=[])


class RecordingSupabase:
    def __init__(self, key_row, usage_count):
        self.key_row = key_row
        self.usage_count = usage_count
        self.usage_rows: list = []

    def table(self, name):
        return RecordingQuery(self, name)


def _build(monkeypatch, tier="api_basic", usage_count=0, handler_status=None,
           expires_at=None, expired_tier=False, scopes=frozenset({"history"})):
    """Mount the real dependency AND the real middleware on a throwaway app."""
    from services import api_key_auth, usage_recorder

    raw_key = api_key_auth.PUBLIC_PREFIX + "k" * 32
    key_row = {
        "id": "key-uuid",
        "user_id": "11111111-2222-3333-4444-555555555555",
        "key_prefix": raw_key[: api_key_auth.KEY_PREFIX_VISIBLE_LENGTH],
        "key_hash": api_key_auth.hash_key(raw_key),
        "revoked_at": None,
        "expires_at": expires_at,
    }
    fake = RecordingSupabase(key_row, usage_count)

    sb_mod = types.ModuleType("services._supabase")
    sb_mod.get_supabase_client = lambda: fake
    monkeypatch.setitem(sys.modules, "services._supabase", sb_mod)

    ent = types.SimpleNamespace(tier=tier, scopes=scopes, is_expired_tier=expired_tier)
    monkeypatch.setattr(api_key_auth, "resolve_entitlement", lambda *_a, **_k: ent)
    # Alert delivery is its own module's concern and spawns a thread; silenced
    # here so these tests measure only what lands in api_key_usage.
    monkeypatch.setattr("services.usage_alerts.evaluate_async", lambda *_a, **_k: None)

    # Write inline instead of on a thread, so an assertion right after the
    # response is not racing the logger.
    monkeypatch.setattr(
        usage_recorder,
        "flush",
        _inline_flush(usage_recorder, fake),
    )

    app = FastAPI()
    usage_recorder.install(app)

    @app.get("/probe")
    async def probe(auth: dict = Depends(api_key_auth.verify_api_key)):
        if handler_status is not None:
            raise HTTPException(status_code=handler_status, detail="handler said no")
        return {"ok": True}

    return TestClient(app, raise_server_exceptions=False), raw_key, fake


def _inline_flush(module, fake):
    """The real flush, minus the thread."""
    def flush(request, status_code, latency_ms=None):
        record = module.pending(request)
        if not record:
            return
        setattr(request.state, module.STATE_ATTR, None)
        record["status_code"] = status_code
        if latency_ms is not None:
            record["latency_ms"] = latency_ms
        module._write(fake, record)
    return flush


def _auth(key):
    return {"Authorization": f"Bearer {key}"}


class TestStatusCodeIsRecorded:
    def test_a_served_request_records_200(self, monkeypatch):
        client, key, fake = _build(monkeypatch)
        assert client.get("/probe", headers=_auth(key)).status_code == 200
        assert len(fake.usage_rows) == 1
        assert fake.usage_rows[0]["status_code"] == 200

    def test_status_code_is_not_null(self, monkeypatch):
        """The whole defect, stated as one assertion.

        Every row written before this change had status_code = NULL, so no error
        rate could be computed from the table at all.
        """
        client, key, fake = _build(monkeypatch)
        client.get("/probe", headers=_auth(key))
        assert fake.usage_rows[0]["status_code"] is not None

    def test_a_handler_error_records_the_handler_status(self, monkeypatch):
        """The status must come from the response, not from the auth outcome.

        Auth succeeded here; the request still failed. Recording 200 because the
        key was valid is what makes an error rate meaningless.
        """
        client, key, fake = _build(monkeypatch, handler_status=422)
        assert client.get("/probe", headers=_auth(key)).status_code == 422
        assert fake.usage_rows[0]["status_code"] == 422

    def test_an_unhandled_exception_records_500(self, monkeypatch):
        from services import api_key_auth, usage_recorder

        client, key, fake = _build(monkeypatch)
        app = client.app

        @app.get("/boom")
        async def boom(auth: dict = Depends(api_key_auth.verify_api_key)):
            raise RuntimeError("kaboom")

        client.get("/boom", headers=_auth(key))
        assert fake.usage_rows[-1]["status_code"] == 500


class TestRefusalsAreRecorded:
    """The rows that were missing entirely, not merely missing a column."""

    def test_a_throttled_request_is_recorded_as_429(self, monkeypatch):
        limit = rate_limit.limit_for_tier("api_trial")
        client, key, fake = _build(monkeypatch, tier="api_trial", usage_count=limit)

        assert client.get("/probe", headers=_auth(key)).status_code == 429
        assert fake.usage_rows, (
            "a rate-limited request left no usage row — being throttled is the "
            "event a customer most needs to see in their usage"
        )
        assert fake.usage_rows[0]["status_code"] == 429

    def test_a_burst_refusal_is_recorded_as_429(self, monkeypatch):
        client, key, fake = _build(monkeypatch, tier="api_trial")
        rate = rate_limit.burst_rate_for_tier("api_trial")
        for _ in range(int(rate * rate_limit.BURST_CAPACITY_FACTOR) + 2):
            client.get("/probe", headers=_auth(key))
        assert 429 in [r["status_code"] for r in fake.usage_rows]

    def test_an_unentitled_request_is_recorded_as_403(self, monkeypatch):
        client, key, fake = _build(monkeypatch, scopes=frozenset())
        assert client.get("/probe", headers=_auth(key)).status_code == 403
        assert fake.usage_rows[0]["status_code"] == 403

    def test_an_expired_key_is_recorded_as_401(self, monkeypatch):
        client, key, fake = _build(monkeypatch, expires_at="2020-01-01T00:00:00+00:00")
        assert client.get("/probe", headers=_auth(key)).status_code == 401
        assert fake.usage_rows[0]["status_code"] == 401

    def test_an_unidentifiable_key_records_nothing(self, monkeypatch):
        """The deliberate exception.

        api_key_usage.key_id is a foreign key, and a request whose key cannot be
        matched has no account to attribute it to. Recording it would mean
        inventing an owner.
        """
        client, _key, fake = _build(monkeypatch)
        assert client.get("/probe", headers={"Authorization": "Bearer ik_live_nope"}).status_code == 401
        assert fake.usage_rows == []

    def test_no_header_records_nothing(self, monkeypatch):
        client, _key, fake = _build(monkeypatch)
        assert client.get("/probe").status_code == 401
        assert fake.usage_rows == []


class TestExactlyOneRowPerRequest:
    def test_one_request_one_row(self, monkeypatch):
        """Staging plus flushing must not double-count, or every customer's
        usage reads at twice the truth and they are throttled at half."""
        client, key, fake = _build(monkeypatch)
        client.get("/probe", headers=_auth(key))
        assert len(fake.usage_rows) == 1

    def test_the_endpoint_and_method_are_the_ones_called(self, monkeypatch):
        client, key, fake = _build(monkeypatch)
        client.get("/probe", headers=_auth(key))
        row = fake.usage_rows[0]
        assert row["endpoint"] == "/probe"
        assert row["method"] == "GET"

    def test_latency_is_recorded(self, monkeypatch):
        client, key, fake = _build(monkeypatch)
        client.get("/probe", headers=_auth(key))
        assert isinstance(fake.usage_rows[0]["latency_ms"], int)
