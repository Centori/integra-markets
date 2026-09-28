"""The published spec described the Kalshi trading surface.

`GET https://api.integramarkets.app/openapi.json` served 66 paths, 23 of them
internal — `/kalshi/markets/{ticker}/orderbook` and the rest of the trading
surface for Integra's own account, `/api/stripe/*`, `/api/subscriptions/webhook`.
The spec is the first thing a developer looks for and the thing an SDK generator
or an LLM gets pointed at, so what we advertised was how to place Kalshi orders.

The correct spec already existed: scripts/build_openapi_spec.py produced it,
filtered to /v1, and the output was committed to the repo root and served
NOWHERE. So the reachable spec was the wrong one and the right one was
unreachable.

These tests pin the filter, and pin the fact that the script and the runtime use
the SAME filter — they previously each had their own, and had already drifted
once: the committed openapi.json described 29 paths, zero under /v1, plus 21
routes that no longer existed. Both SDKs were generated from it.
"""

from __future__ import annotations

import pytest

from services.openapi_public import (
    OPERATION_IDS,
    PUBLIC_PREFIX,
    filter_to_public,
)
from services.openapi_security import SECURITY_SCHEME_NAME, apply_security


def _live_shaped_spec():
    """A spec with the same shape as the real one: /v1 plus internal routes."""
    return {
        "openapi": "3.1.0",
        "info": {"title": "Integra AI Backend", "version": "0.1.0"},
        "paths": {
            "/v1/sentiment": {"get": {
                "operationId": "sentiment_v1_sentiment_get",
                "responses": {"200": {"content": {"application/json": {
                    "schema": {"$ref": "#/components/schemas/PublicThing"}}}}},
            }},
            "/v1/agent/ask": {"post": {"operationId": "ask_v1_agent_ask_post", "responses": {}}},
            "/kalshi/markets/{ticker}/orderbook": {"get": {"operationId": "ob", "responses": {}}},
            "/kalshi/portfolio/orders": {"post": {"operationId": "place_order", "responses": {
                "200": {"content": {"application/json": {
                    "schema": {"$ref": "#/components/schemas/OrderRequest"}}}}}}},
            "/api/stripe/webhook": {"post": {"operationId": "wh", "responses": {}}},
            "/api/subscriptions/webhook": {"post": {"operationId": "sub", "responses": {}}},
            "/health": {"get": {"operationId": "health", "responses": {}}},
        },
        "components": {"schemas": {
            "PublicThing": {"properties": {"nested": {"$ref": "#/components/schemas/Nested"}}},
            "Nested": {"type": "string"},
            "OrderRequest": {"type": "object"},
            "Orphan": {"type": "object"},
        }},
    }


class TestInternalRoutesAreWithheld:
    def test_kalshi_trading_is_not_published(self):
        """The finding. An API customer must not be handed typed methods for
        placing orders against Integra's own trading account."""
        published = filter_to_public(_live_shaped_spec())["paths"]
        assert not [p for p in published if p.startswith("/kalshi")]

    @pytest.mark.parametrize("path", [
        "/api/stripe/webhook",
        "/api/subscriptions/webhook",
        "/health",
    ])
    def test_non_v1_paths_are_not_published(self, path):
        assert path not in filter_to_public(_live_shaped_spec())["paths"]

    def test_public_paths_survive(self):
        published = filter_to_public(_live_shaped_spec())["paths"]
        assert set(published) == {"/v1/sentiment", "/v1/agent/ask"}

    def test_every_published_path_is_under_the_public_prefix(self):
        for path in filter_to_public(_live_shaped_spec())["paths"]:
            assert path.startswith(PUBLIC_PREFIX)


class TestSchemasArePruned:
    def test_schemas_reachable_from_public_paths_are_kept(self):
        schemas = filter_to_public(_live_shaped_spec())["components"]["schemas"]
        assert "PublicThing" in schemas

    def test_transitively_referenced_schemas_are_kept(self):
        """A $ref inside a kept schema. Dropping it produces a spec that does
        not validate, and a generator that emits a broken client."""
        schemas = filter_to_public(_live_shaped_spec())["components"]["schemas"]
        assert "Nested" in schemas

    def test_schemas_only_used_by_internal_routes_are_dropped(self):
        """OrderRequest describes the trading payload. Keeping it would leak the
        shape of what we just stopped advertising."""
        schemas = filter_to_public(_live_shaped_spec())["components"]["schemas"]
        assert "OrderRequest" not in schemas

    def test_unreferenced_schemas_are_dropped(self):
        schemas = filter_to_public(_live_shaped_spec())["components"]["schemas"]
        assert "Orphan" not in schemas


class TestOperationIds:
    def test_generated_ids_are_replaced_with_stable_names(self):
        """FastAPI emits `sentiment_v1_sentiment_get`. A generator turns that
        verbatim into a method name, and once a customer writes against it we
        cannot change it."""
        spec = filter_to_public(_live_shaped_spec())
        assert spec["paths"]["/v1/sentiment"]["get"]["operationId"] == "get_sentiment"
        assert spec["paths"]["/v1/agent/ask"]["post"]["operationId"] == "ask_agent"

    def test_every_pinned_id_is_a_valid_identifier(self):
        """These become method names in a generated client."""
        for (path, method), name in OPERATION_IDS.items():
            assert name.isidentifier(), f"{name} for {method.upper()} {path}"

    def test_pinned_ids_are_unique(self):
        """Two paths sharing an operationId make one of them unreachable in a
        generated client."""
        names = list(OPERATION_IDS.values())
        assert len(names) == len(set(names))


class TestEmptyIsRefused:
    def test_a_spec_with_no_public_paths_raises(self):
        """If the prefix stops matching — a router remount, a version bump —
        publishing an empty spec would tell every customer the product has no
        endpoints. Failing loudly is the only safe behaviour."""
        with pytest.raises(ValueError, match="refusing to publish an empty API"):
            filter_to_public({"paths": {"/health": {"get": {}}}, "components": {}})


class TestSecurityStillApplies:
    def test_the_filtered_spec_carries_the_api_key_scheme(self):
        """Filtering must not drop the thing that lets a client authenticate —
        the bug openapi_security was written for in the first place."""
        spec = apply_security(filter_to_public(_live_shaped_spec()))
        assert SECURITY_SCHEME_NAME in spec["components"]["securitySchemes"]

    def test_every_published_operation_requires_a_key(self):
        spec = apply_security(filter_to_public(_live_shaped_spec()))
        for path, item in spec["paths"].items():
            for method, op in item.items():
                assert op.get("security") == [{SECURITY_SCHEME_NAME: []}], \
                    f"{method.upper()} {path} published as unauthenticated"

    def test_filtering_then_securing_is_order_independent_for_schemes(self):
        """Guards the composition used in main.py and in the build script."""
        a = apply_security(filter_to_public(_live_shaped_spec()))
        b = filter_to_public(apply_security(_live_shaped_spec()))
        assert set(a["paths"]) == set(b["paths"])


class TestTheBuildScriptSharesThisFilter:
    def test_the_script_imports_rather_than_reimplements(self):
        """The two had already drifted once, producing a committed spec with zero
        /v1 paths that both SDKs were generated from."""
        import pathlib

        script = pathlib.Path(__file__).parents[2] / "scripts" / "build_openapi_spec.py"
        source = script.read_text()
        assert "from services.openapi_public import filter_to_public" in source
        assert "from services.openapi_security import apply_security" in source
        # And no longer carries its own copy of the filtering logic.
        assert "components/schemas" not in source, (
            "the script appears to be walking $refs again — that logic belongs "
            "to services/openapi_public so the runtime and the artifact agree"
        )


class TestTheCommittedArtifactMatches:
    def test_the_committed_spec_has_no_internal_paths(self):
        """openapi.json is committed and diffable; it is also what anyone
        generating a client from the repo will use."""
        import json
        import pathlib

        spec_path = pathlib.Path(__file__).parents[2] / "openapi.json"
        if not spec_path.exists():
            pytest.skip("openapi.json not committed in this checkout")
        spec = json.loads(spec_path.read_text())
        leaked = [p for p in spec.get("paths", {}) if not p.startswith(PUBLIC_PREFIX)]
        assert not leaked, f"committed spec publishes non-public paths: {leaked}"


class TestTheAppWiring:
    """main.py replaces app.openapi. That assignment is the whole fix, and it is
    not exercised by anything above — importing main pulls in supabase, torch and
    the scheduler, so this rebuilds the same wiring against a stand-in app.
    """

    def _wired_app(self):
        from fastapi import FastAPI
        from fastapi.openapi.utils import get_openapi

        from services.openapi_security import build_public_schema, build_schema

        app = FastAPI(title="Integra AI Backend", description="x")

        @app.get("/v1/sentiment", tags=["public-v1"])
        def _sentiment():
            return {}

        @app.get("/kalshi/portfolio/orders", tags=["kalshi"])
        def _orders():
            return {}

        @app.get("/health")
        def _health():
            return {}

        app.openapi = lambda: build_public_schema(app, get_openapi)
        return app, lambda: build_schema(app, get_openapi)

    def test_app_openapi_serves_only_the_public_surface(self):
        app, _full = self._wired_app()
        assert set(app.openapi()["paths"]) == {"/v1/sentiment"}

    def test_the_public_spec_is_cached_separately_from_fastapis_own_slot(self):
        """build_public_schema must not write to `openapi_schema`, which FastAPI
        itself reads — doing so would make the full schema unreachable even for
        the internal debug route, and the two would alias each other."""
        app, full = self._wired_app()
        public = app.openapi()
        assert set(public["paths"]) == {"/v1/sentiment"}
        assert set(full()["paths"]) == {
            "/v1/sentiment", "/kalshi/portfolio/orders", "/health",
        }
        # And asking again does not return the full one by accident.
        assert set(app.openapi()["paths"]) == {"/v1/sentiment"}

    def test_repeated_calls_are_cached_and_identical(self):
        app, _full = self._wired_app()
        assert app.openapi() is app.openapi()

    def test_the_internal_route_is_opt_in(self):
        """The unfiltered spec is the thing we just stopped publishing, so it must
        be off unless explicitly switched on."""
        import pathlib

        main_src = (pathlib.Path(__file__).parent.parent / "main.py").read_text()
        assert 'INTEGRA_INTERNAL_OPENAPI") == "1"' in main_src, (
            "the full-spec route must be gated by an env flag that defaults off"
        )
        idx = main_src.index("/internal/openapi.json")
        gate = main_src.rindex('INTEGRA_INTERNAL_OPENAPI', 0, idx)
        assert gate < idx, "the route must be registered INSIDE the env gate"
