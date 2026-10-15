"""WAF API routes: validation, 404s, redistribution and tier gating, with the store faked."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api import waf as waf_api
from services.api_key_auth import verify_api_key
from services.supabase_jwt import optional_supabase_jwt

REPORT = {
    "report_id": "WAF-2026-W41", "cutoff": "2026-10-09T17:00:00+01:00", "version": 2,
    "published_at": "2026-10-09T17:00:05+00:00",
    "payload": {"report_id": "WAF-2026-W41", "teaser": "PMS supply: TIGHT (-30) | Net +12",
                "sentiment": {"overall": {"net": 12, "articles": 40},
                              "segments": {"pms": {"net": -5, "articles": 12}}}},
}


@pytest.fixture
def client(monkeypatch):
    app = FastAPI()
    app.include_router(waf_api.router)
    app.include_router(waf_api.app_router)
    app.dependency_overrides[verify_api_key] = lambda: {"user_id": "u1", "tier": "api_history"}
    app.dependency_overrides[optional_supabase_jwt] = lambda: None
    monkeypatch.setattr(waf_api, "_supabase", lambda: object())
    monkeypatch.setattr(waf_api, "assert_history_depth", lambda auth, days: None)
    return TestClient(app)


def test_latest_report_404_when_nothing_published(client, monkeypatch):
    monkeypatch.setattr(waf_api.store, "list_reports", lambda *a, **k: [])
    response = client.get("/v1/waf/report")
    assert response.status_code == 404


def test_latest_report_and_app_card(client, monkeypatch):
    monkeypatch.setattr(waf_api.store, "list_reports", lambda *a, **k: [REPORT])
    body = client.get("/v1/waf/report").json()
    assert body["report_id"] == "WAF-2026-W41" and body["version"] == 2
    assert client.get("/api/waf/reports/latest").json()["teaser"].startswith("PMS supply")


def test_unpublished_or_malformed_report_ids(client, monkeypatch):
    monkeypatch.setattr(waf_api.store, "get_report", lambda sb, rid: dict(REPORT, published_at=None))
    assert client.get("/v1/waf/report/WAF-2026-W41").status_code == 404
    assert client.get("/v1/waf/report/not-an-id").status_code == 400


def test_sentiment_series_is_not_captured_by_report_id_route(client, monkeypatch):
    monkeypatch.setattr(waf_api.store, "list_reports", lambda *a, **k: [REPORT])
    body = client.get("/v1/waf/report/sentiment-series?segment=pms").json()
    assert body["series"] == [{"report_id": "WAF-2026-W41", "net": -5, "articles": 12}]
    assert client.get("/v1/waf/report/sentiment-series?segment=nope").status_code == 400


def test_headlines_filter_validation_and_redistribution(client, monkeypatch):
    rows = [{"id": "1", "source": "petroleumprice.ng", "title": "Depot prices", "url": "u",
             "published_at": "2026-10-14", "content": "secret numbers"},
            {"id": "2", "source": "Punch", "title": "Dangote", "url": "v", "published_at": "2026-10-14",
             "content": "text"}]
    monkeypatch.setattr(waf_api.store, "tagged_documents", lambda *a, **k: (rows, False))
    monkeypatch.delenv("PPNG_LICENSED", raising=False)
    assert client.get("/v1/waf/headlines?tag=PMS").status_code == 400
    assert client.get("/v1/waf/headlines?tag_type=colour&tag=x").status_code == 400
    items = client.get("/v1/waf/headlines?tag_type=product&tag=PMS").json()["items"]
    assert "content" not in items[0] and items[0]["restricted"] is True
    assert items[1]["content"] == "text"


def test_balance_rejects_unknown_product(client):
    assert client.get("/v1/waf/balance?product=LPG").status_code == 400
