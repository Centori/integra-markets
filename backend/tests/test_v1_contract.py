"""The /v1 surface is what customers pay for, and nothing tested it.

30 test files covered services and units — rate limiting, scopes, divergence
scale, taxonomy — all real behavioural tests. None asserted anything about the
HTTP contract: not that an endpoint returns the shape the SDK expects, not that
every operation is documented, not that method names are stable.

That mattered concretely. Both SDKs were once generated from a committed spec
holding 29 paths, ZERO of them under /v1, plus 21 routes that no longer existed
— so neither client had a single method for the product being sold, and no test
noticed.

These tests build the spec from the routers rather than from `main`, which
imports supabase and the scheduler and cannot load in CI. The routers are where
the contract actually lives.
"""

import json
import os
import re
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

REPO_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")


@pytest.fixture(scope="module")
def spec():
    """OpenAPI generated from the live routers."""
    from fastapi import FastAPI
    from fastapi.openapi.utils import get_openapi

    app = FastAPI(title="Integra Markets API", version="1.0.0")
    mounted = 0
    for module in ("v1_public", "divergence", "sentiment_history", "agent_ask", "export"):
        try:
            mod = __import__(f"api.{module}", fromlist=["router"])
        except ImportError:  # optional router, absent in some checkouts
            continue
        app.include_router(mod.router)
        mounted += 1
    assert mounted >= 3, "expected the v1 routers to be importable"
    return get_openapi(title=app.title, version=app.version, routes=app.routes)


def v1_ops(spec):
    """(path, method, operation) for every /v1 operation."""
    out = []
    for path, item in spec["paths"].items():
        if not path.startswith("/v1"):
            continue
        for method, op in item.items():
            if method in ("get", "post", "put", "patch", "delete"):
                out.append((path, method, op))
    return out


class TestSurfaceIsDocumented:
    def test_there_are_v1_operations_at_all(self, spec):
        """A spec with no /v1 paths is the exact failure that shipped once."""
        assert len(v1_ops(spec)) >= 10

    def test_every_operation_has_a_success_schema(self, spec):
        """Without a typed 200 the generator emits a method returning `object`
        — the SDK compiles and tells the caller nothing.

        Any content type counts, but it must carry a non-empty schema. An
        endpoint streaming CSV under a declared `application/json: {}` is worse
        than an undocumented one: the generator believes it and hands a CSV
        stream to a JSON decoder. /v1/export/sentiment did exactly that.
        """
        missing = []
        for path, method, op in v1_ops(spec):
            content = op.get("responses", {}).get("200", {}).get("content", {})
            if not any(c.get("schema") for c in content.values()):
                missing.append(f"{method.upper()} {path}")
        assert not missing, f"no typed 200 response: {missing}"

    def test_file_downloads_are_not_declared_as_json(self, spec):
        """A binary/text download declared as application/json makes every
        generated client try to parse it."""
        for path, method, op in v1_ops(spec):
            content = op.get("responses", {}).get("200", {}).get("content", {})
            if "export" not in path:
                continue
            assert "application/json" not in content, (
                f"{method.upper()} {path} streams a file but declares JSON"
            )

    def test_every_operation_has_a_summary(self, spec):
        """The summary becomes the docstring on the generated method."""
        missing = [f"{m.upper()} {p}" for p, m, op in v1_ops(spec) if not op.get("summary")]
        assert not missing, f"no summary: {missing}"

    def test_operation_ids_are_unique(self, spec):
        """Duplicates make the generator silently drop or rename a method."""
        ids = [op.get("operationId") for _, _, op in v1_ops(spec)]
        dupes = {i for i in ids if i and ids.count(i) > 1}
        assert not dupes, f"duplicate operationIds: {dupes}"

    def test_path_parameters_are_declared(self, spec):
        """An undeclared {param} generates a method that cannot fill its own URL."""
        for path, method, op in v1_ops(spec):
            in_path = set(re.findall(r"\{(\w+)\}", path))
            declared = {
                p.get("name") for p in op.get("parameters", [])
                if p.get("in") == "path"
            }
            assert in_path <= declared, f"{method.upper()} {path}: undeclared {in_path - declared}"


class TestPublishedSpecMatchesTheCode:
    """The committed spec is what both SDKs are generated from. When it drifts
    from the routers, customers get methods for endpoints that do not exist and
    none for endpoints that do — which is what happened."""

    @pytest.fixture(scope="class")
    def published(self):
        p = os.path.join(REPO_ROOT, "openapi.json")
        if not os.path.exists(p):
            pytest.skip("no committed openapi.json")
        return json.load(open(p))

    def test_published_spec_is_v1_only(self, published):
        """Internal routes must never reach a customer SDK. /kalshi/* trades
        against Integra's own account."""
        leaked = [p for p in published["paths"] if not p.startswith("/v1")]
        assert not leaked, f"non-/v1 paths in the published spec: {leaked}"

    def test_every_published_path_exists_in_the_code(self, published, spec):
        """Catches the 21-dead-routes case directly."""
        live = set(spec["paths"])
        gone = [p for p in published["paths"] if p not in live]
        assert not gone, f"published but no longer implemented: {gone}"

    def test_every_v1_route_is_published(self, published, spec):
        """The other direction: an endpoint customers can call but whose SDK
        method does not exist."""
        pub = set(published["paths"])
        unpublished = [p for p, _, _ in v1_ops(spec) if p not in pub]
        assert not unpublished, f"implemented but unpublished: {sorted(set(unpublished))}"

    def test_auth_is_declared(self, published):
        """A spec with no security scheme generates a client that cannot send
        the key — on exactly the endpoints being sold."""
        schemes = published.get("components", {}).get("securitySchemes", {})
        assert schemes, "no securitySchemes declared"
        assert "ApiKeyAuth" in schemes

    def test_auth_actually_applies(self, published):
        """Declaring a scheme is not enough; something must reference it,
        either document-level or per-operation."""
        doc_level = bool(published.get("security"))
        per_op = any(
            op.get("security")
            for item in published["paths"].values()
            for op in item.values()
            if isinstance(op, dict)
        )
        assert doc_level or per_op, "scheme declared but never applied"

    def test_operation_ids_are_pinned(self, published):
        """SDK method names come from these. Once a customer writes against
        one it cannot change, so they are pinned deliberately rather than
        inherited from whatever a Python function was called."""
        for path, item in published["paths"].items():
            for method, op in item.items():
                if not isinstance(op, dict) or method not in ("get", "post"):
                    continue
                oid = op.get("operationId", "")
                assert oid, f"{method.upper()} {path} has no operationId"
                assert "_v1_" not in oid, (
                    f"{oid} looks FastAPI-generated; pin it in "
                    "scripts/build_openapi_spec.py"
                )
