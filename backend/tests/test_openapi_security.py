"""The published spec must say how the public API authenticates.

Every /v1 endpoint is gated by services/api_key_auth.verify_api_key, but that
dependency is declared with Header() rather than a fastapi.security class, so
FastAPI emitted no securitySchemes at all. The live spec on 2026-08-25 had 14
/v1 paths and zero security blocks -- which means an SDK generated from it has
no way to send the key, on exactly the endpoints customers pay for.

These tests pin the contract rather than the mechanism: if someone later swaps
verify_api_key for HTTPBearer, they should pass unchanged.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

PUBLIC_TAG = "public-v1"


def _schema():
    """Build the spec from the app's own routes."""
    from fastapi import FastAPI
    from fastapi.openapi.utils import get_openapi

    # Rebuilding the real main:app pulls in supabase, torch and the scheduler,
    # which is neither available nor desirable in a unit test. Exercise the same
    # helper against a stand-in app carrying the same tags.
    from services.openapi_security import build_schema

    app = FastAPI(title="t", version="1")

    @app.get("/v1/thing", tags=[PUBLIC_TAG])
    def _thing():
        return {}

    # Tagged by subject, not public-v1 — this is the shape of ten of the
    # fourteen live /v1 operations, and tag-only matching missed all of them.
    @app.get("/v1/markets/divergence", tags=["divergence"])
    def _div():
        return {}

    @app.get("/v1/sentiment/{commodity}/now", tags=["sentiment-history"])
    def _now(commodity: str):
        return {}

    @app.get("/health")
    def _health():
        return {}

    @app.post("/api/news/feed", tags=["news-feed"])
    def _feed():
        return {}

    return build_schema(app, get_openapi)


class TestSecurityScheme:
    def test_scheme_is_declared(self):
        s = _schema()
        schemes = s["components"]["securitySchemes"]
        assert "ApiKeyAuth" in schemes
        assert schemes["ApiKeyAuth"]["type"] == "http"
        assert schemes["ApiKeyAuth"]["scheme"] == "bearer"

    def test_scheme_documents_where_to_get_a_key(self):
        desc = _schema()["components"]["securitySchemes"]["ApiKeyAuth"]["description"]
        assert "Authorization" in desc and "Bearer" in desc

    def test_public_v1_operations_require_it(self):
        op = _schema()["paths"]["/v1/thing"]["get"]
        assert op.get("security") == [{"ApiKeyAuth": []}]

    def test_health_is_not_marked_authenticated(self):
        """A document-level security block would break unauthenticated clients."""
        assert "security" not in _schema()["paths"]["/health"]["get"]

    def test_mobile_endpoints_are_not_marked_authenticated(self):
        """The app calls /api/news/feed anonymously; a key must not be implied."""
        assert "security" not in _schema()["paths"]["/api/news/feed"]["post"]

    @pytest.mark.parametrize("path", [
        "/v1/markets/divergence",
        "/v1/sentiment/{commodity}/now",
    ])
    def test_v1_routes_tagged_by_subject_are_still_secured(self, path):
        """Ten of the fourteen live /v1 operations do not carry the public-v1
        tag. Matching on tag alone documented them as needing no key."""
        assert _schema()["paths"][path]["get"].get("security") == [
            {"ApiKeyAuth": []}
        ]

    def test_every_v1_path_is_secured(self):
        """The invariant that matters: nothing under /v1 is left open."""
        paths = _schema()["paths"]
        for path, item in paths.items():
            if not path.startswith("/v1/"):
                continue
            for method, op in item.items():
                if method in ("get", "post", "put", "patch", "delete"):
                    assert op.get("security"), f"{method.upper()} {path} unsecured"
