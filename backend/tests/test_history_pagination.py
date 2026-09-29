"""/v1/sentiment/{commodity}/history could not be read completely.

The endpoint caps at 1000 rows and the module docstring told customers to
"paginate via from/to". That instruction cannot be followed correctly.

Rows are ordered by `published_at`, and news feeds publish many articles on the
same timestamp — a wire that drops twelve stories at 13:00:00Z is ordinary. A
client re-issuing with `to=<last published_at>` then either re-reads every tied
row (duplicates, which inflate any average computed over them) or, using a
strict bound, skips the tied rows it never saw. Both are invisible client-side
and unfixable there, because the client cannot know how many rows shared that
timestamp.

For a quant pulling two years of oil this was a wall: past 1000 rows the archive
was not reachable through the read API at all.

`encode_cursor` / `decode_cursor` / keyset ordering had already been written in
services/pagination.py — with a docstring explaining exactly this problem — and
were used by no endpoint. This wires them up.
"""

from __future__ import annotations

import sys
import types

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from services.pagination import decode_cursor, encode_cursor


class RecordingQuery:
    """Records the filters applied, and returns a scripted page of rows."""

    def __init__(self, parent):
        self._p = parent

    def select(self, *_a, **_k):
        return self

    def eq(self, *_a, **_k):
        return self

    def gte(self, *_a, **_k):
        return self

    def lte(self, *_a, **_k):
        return self

    def is_(self, *_a, **_k):
        return self

    def or_(self, expression, *_a, **_k):
        self._p.or_filters.append(expression)
        return self

    def order(self, column, desc=False, **_k):
        self._p.order_by.append((column, desc))
        return self

    def limit(self, n, *_a, **_k):
        self._p.limits.append(n)
        return self

    def insert(self, *_a, **_k):
        return self

    def update(self, *_a, **_k):
        return self

    def execute(self):
        return types.SimpleNamespace(data=list(self._p.rows), count=None)


class RecordingSupabase:
    def __init__(self, rows):
        self.rows = rows
        self.or_filters: list = []
        self.order_by: list = []
        self.limits: list = []

    def table(self, _name):
        return RecordingQuery(self)


def _row(ts, doc_id, score=0.2):
    return {
        "document_id": doc_id,
        "sentiment": "BULLISH",
        "sentiment_score": score,
        "confidence": 0.5,
        "published_at": ts,
    }


def _build(monkeypatch, rows):
    """Mount the real endpoint with an entitled caller and a recording client.

    The route's dependency is `require_scopes(HISTORY_SCOPE)`, which builds a new
    closure at import time — so it cannot be overridden by identity. Its INNER
    dependency, `verify_api_key`, is a stable module-level function, and FastAPI
    resolves sub-dependencies through the override map, so overriding that one
    substitutes the whole auth chain while leaving the scope check real.
    """
    import api.sentiment_history as mod
    from services import api_key_auth

    fake = RecordingSupabase(rows)
    monkeypatch.setattr(mod, "_supabase", lambda: fake)
    monkeypatch.setattr(mod, "assert_history_depth", lambda *_a, **_k: None)

    entitlement = types.SimpleNamespace(
        tier="api_history",
        scopes=frozenset({"history", "archive"}),
        is_expired_tier=False,
    )

    app = FastAPI()
    app.include_router(mod.router)
    app.dependency_overrides[api_key_auth.verify_api_key] = lambda: {
        "id": "key-uuid",
        "user_id": "11111111-2222-3333-4444-555555555555",
        "_tier": "api_history",
        "_entitlement": entitlement,
    }
    return TestClient(app, raise_server_exceptions=False), fake, mod


class TestTheCursorContract:
    def test_a_full_page_advertises_more_and_hands_back_a_cursor(self, monkeypatch):
        rows = [_row(f"2026-09-{27 - i:02d}T12:00:00+00:00", f"doc-{i}") for i in range(4)]
        client, _fake, _mod = _build(monkeypatch, rows)

        body = client.get("/v1/sentiment/oil/history?limit=3").json()

        assert body["count"] == 3, "the probe row must not be returned to the client"
        assert body["has_more"] is True
        assert "next_cursor" in body

    def test_the_probe_row_is_requested_but_withheld(self, monkeypatch):
        """limit+1 is fetched so has_more is exact on the boundary, which a
        separate COUNT query gets wrong."""
        rows = [_row(f"2026-09-{27 - i:02d}T12:00:00+00:00", f"doc-{i}") for i in range(4)]
        client, fake, _ = _build(monkeypatch, rows)
        client.get("/v1/sentiment/oil/history?limit=3")
        assert fake.limits == [4]

    def test_a_short_page_does_not_advertise_more(self, monkeypatch):
        rows = [_row("2026-09-27T12:00:00+00:00", "doc-0")]
        client, _fake, _ = _build(monkeypatch, rows)
        body = client.get("/v1/sentiment/oil/history?limit=3").json()
        assert body["has_more"] is False
        assert "next_cursor" not in body

    def test_an_exactly_full_page_with_nothing_after_it_is_not_more(self, monkeypatch):
        """The off-by-one. Three rows requested, three returned, none held back."""
        rows = [_row(f"2026-09-{27 - i:02d}T12:00:00+00:00", f"doc-{i}") for i in range(3)]
        client, _fake, _ = _build(monkeypatch, rows)
        body = client.get("/v1/sentiment/oil/history?limit=3").json()
        assert body["count"] == 3
        assert body["has_more"] is False

    def test_the_cursor_names_the_last_row_returned(self, monkeypatch):
        rows = [_row(f"2026-09-{27 - i:02d}T12:00:00+00:00", f"doc-{i}") for i in range(4)]
        client, _fake, _ = _build(monkeypatch, rows)
        body = client.get("/v1/sentiment/oil/history?limit=3").json()

        decoded = decode_cursor(body["next_cursor"])
        assert decoded["d"] == "doc-2", "must point at the last row the client SAW"
        assert decoded["p"] == "2026-09-25T12:00:00+00:00"
        assert decoded["e"] == "oil"

    def test_the_cursor_is_opaque(self, monkeypatch):
        """Base64 so callers do not parse it; a guessable cursor becomes a
        contract and the keyset columns can then never change."""
        rows = [_row(f"2026-09-{27 - i:02d}T12:00:00+00:00", f"doc-{i}") for i in range(4)]
        client, _fake, _ = _build(monkeypatch, rows)
        cursor = client.get("/v1/sentiment/oil/history?limit=3").json()["next_cursor"]
        assert "2026" not in cursor and "doc-" not in cursor


class TestTheKeysetIsATotalOrder:
    def test_document_id_is_part_of_the_ordering(self, monkeypatch):
        """Without it, rows sharing a timestamp come back in arbitrary order and
        "everything after (p, d)" is not a well-defined position — the cursor
        would skip or repeat rows exactly as from/to did."""
        client, fake, _ = _build(monkeypatch, [])
        client.get("/v1/sentiment/oil/history")
        assert fake.order_by == [("published_at", True), ("document_id", True)]

    def test_a_cursor_filters_on_the_tiebreaker_too(self, monkeypatch):
        """The whole point. `published_at < p` alone drops every row that shares
        the boundary timestamp; this keeps the ones after (p, d)."""
        client, fake, _ = _build(monkeypatch, [])
        cursor = encode_cursor({
            "p": "2026-09-25T12:00:00+00:00", "d": "doc-2", "e": "oil",
        })
        client.get(f"/v1/sentiment/oil/history?cursor={cursor}")

        assert len(fake.or_filters) == 1
        expr = fake.or_filters[0]
        assert "published_at.lt." in expr
        assert "published_at.eq." in expr and "document_id.lt." in expr

    def test_the_timestamp_is_quoted_in_the_filter(self, monkeypatch):
        """A timestamptz carries `+00:00`, and `+` is the one character whose
        meaning flips if a layer decodes the query string as a form body. It
        would silently become a space, and the filter would match nothing or
        error — either way, pagination that stops early and looks finished."""
        client, fake, _ = _build(monkeypatch, [])
        cursor = encode_cursor({
            "p": "2026-09-25T12:00:00+00:00", "d": "doc-2", "e": "oil",
        })
        client.get(f"/v1/sentiment/oil/history?cursor={cursor}")
        assert '"2026-09-25T12:00:00+00:00"' in fake.or_filters[0]

    def test_no_cursor_applies_no_keyset_filter(self, monkeypatch):
        client, fake, _ = _build(monkeypatch, [])
        client.get("/v1/sentiment/oil/history")
        assert fake.or_filters == []


class TestBadCursorsAre400:
    def test_garbage_is_rejected(self, monkeypatch):
        """Not a silent restart from page one: a client that corrupts its cursor
        must be told, not handed the first page forever while it believes it is
        advancing."""
        client, _fake, _ = _build(monkeypatch, [])
        r = client.get("/v1/sentiment/oil/history?cursor=!!!not-base64!!!")
        assert r.status_code == 400
        assert "cursor" in r.json()["detail"]

    def test_a_cursor_missing_its_keys_is_rejected(self, monkeypatch):
        client, _fake, _ = _build(monkeypatch, [])
        cursor = encode_cursor({"e": "oil"})
        assert client.get(f"/v1/sentiment/oil/history?cursor={cursor}").status_code == 400

    def test_a_cursor_from_another_commodity_is_rejected(self, monkeypatch):
        """Otherwise it silently returns gold's position under oil's name."""
        client, _fake, _ = _build(monkeypatch, [])
        cursor = encode_cursor({
            "p": "2026-09-25T12:00:00+00:00", "d": "doc-2", "e": "gold",
        })
        r = client.get(f"/v1/sentiment/oil/history?cursor={cursor}")
        assert r.status_code == 400
        assert "different commodity" in r.json()["detail"]

    def test_a_non_dict_cursor_is_rejected(self, monkeypatch):
        client, _fake, _ = _build(monkeypatch, [])
        cursor = encode_cursor(["not", "a", "dict"]) if False else \
            __import__("base64").urlsafe_b64encode(b'["a"]').decode().rstrip("=")
        assert client.get(f"/v1/sentiment/oil/history?cursor={cursor}").status_code == 400


class TestBackwardCompatibility:
    def test_the_existing_response_fields_are_unchanged(self, monkeypatch):
        """has_more and next_cursor are ADDITIVE. Renaming items to data would
        break every client already reading this endpoint."""
        rows = [_row("2026-09-27T12:00:00+00:00", "doc-0")]
        client, _fake, _ = _build(monkeypatch, rows)
        body = client.get("/v1/sentiment/oil/history").json()
        for field in ("commodity", "from", "to", "count", "limit", "items"):
            assert field in body, f"{field} disappeared from the response"

    def test_every_original_field_survives_on_each_row(self, monkeypatch):
        """Rows are reshaped now that they carry evidence, so the compatibility
        property is that the original keys are all still there — not that the
        row is byte-identical to what the database returned."""
        rows = [_row("2026-09-27T12:00:00+00:00", "doc-0")]
        client, _fake, _ = _build(monkeypatch, rows)
        item = client.get("/v1/sentiment/oil/history").json()["items"][0]
        for field in ("document_id", "sentiment", "sentiment_score", "confidence",
                      "published_at"):
            assert item[field] == rows[0][field], f"{field} changed or disappeared"

    def test_rows_now_carry_the_headline_and_the_signals(self, monkeypatch):
        """A document_id with no headline is not something a person can read,
        and a score with no evidence is not something they can check."""
        rows = [_row("2026-09-27T12:00:00+00:00", "doc-0")]
        rows[0]["raw_documents"] = {
            "title": "Hormuz Traffic Running 80% Below Its 10-Day Average",
            "source": "Reuters",
            "url": "https://example.com/a",
            "sentiment_scores": [{"signals": [
                {"driver": "Chokepoint disruption", "phrase": "80% Below Its 10-Day Average",
                 "direction": "bullish", "weight": 1.0},
            ]}],
        }
        client, _fake, _ = _build(monkeypatch, rows)
        item = client.get("/v1/sentiment/oil/history").json()["items"][0]
        assert item["headline"].startswith("Hormuz")
        assert item["source"] == "Reuters"
        assert item["signals"][0]["driver"] == "Chokepoint disruption"
        assert "80%" in item["signals"][0]["phrase"]

    def test_a_row_the_rulebook_did_not_recognise_has_empty_signals(self, monkeypatch):
        """[] rather than a list of topic nouns. "Nothing fired" is a real
        answer; generic keywords dressed as evidence are not."""
        rows = [_row("2026-09-27T12:00:00+00:00", "doc-0")]
        rows[0]["raw_documents"] = {"title": "Quiet day", "source": "X", "url": "u",
                                    "sentiment_scores": [{"signals": None}]}
        client, _fake, _ = _build(monkeypatch, rows)
        assert client.get("/v1/sentiment/oil/history").json()["items"][0]["signals"] == []

    def test_a_row_with_no_embedded_document_does_not_crash(self, monkeypatch):
        """The embed can come back absent; the endpoint must degrade, not 500."""
        rows = [_row("2026-09-27T12:00:00+00:00", "doc-0")]
        client, _fake, _ = _build(monkeypatch, rows)
        item = client.get("/v1/sentiment/oil/history").json()["items"][0]
        assert item["headline"] is None and item["signals"] == []
