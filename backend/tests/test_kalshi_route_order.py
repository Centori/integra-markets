"""Literal /markets/* paths must be declared before /markets/{ticker}.

FastAPI resolves routes in declaration order, so a parameterised path declared
first swallows every literal sibling that follows it. That is what broke the
prediction-market endpoints: `/markets/{ticker}` was declared at line 99 while
`/markets/categories`, `/markets/trending` and `/markets/formatted` came later,
so GET /kalshi/markets/trending was handled by get_market(ticker="trending").

Observed in production 2026-08-17:

    GET /kalshi/markets/trending
    500 {"detail": "Failed to fetch market: Kalshi API request failed:
         404 Client Error: Not Found for url:
         https://demo-api.kalshi.co/trade-api/v2/markets/trending"}

Note "Failed to fetch **market**" — the singular handler. This is a silent
class of bug (the route exists, appears in /openapi.json, and 500s at runtime
with an error that points at the upstream API rather than at the routing), so
it is worth an explicit guard.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

kalshi_api = pytest.importorskip(
    "api.kalshi", reason="kalshi router needs its optional deps installed"
)


# router.routes carries the router prefix ("/kalshi"), so strip it to compare
# against the paths as written in the decorators.
_PREFIX = kalshi_api.router.prefix


def _paths_in_declaration_order():
    return [
        r.path[len(_PREFIX):] if r.path.startswith(_PREFIX) else r.path
        for r in kalshi_api.router.routes
    ]


class TestLiteralsBeforeParameterised:
    @pytest.mark.parametrize("literal", [
        "/markets/categories",
        "/markets/trending",
        "/markets/formatted",
    ])
    def test_literal_is_declared_before_the_ticker_catch_all(self, literal):
        paths = _paths_in_declaration_order()
        assert literal in paths, f"{literal} is not registered at all"
        assert paths.index(literal) < paths.index("/markets/{ticker}"), (
            f"{literal} is declared after /markets/{{ticker}}, which will "
            f"capture it as ticker='{literal.rsplit('/', 1)[-1]}'"
        )

    def test_no_literal_markets_path_is_shadowed(self):
        """General form, so a route added later cannot reintroduce the bug.

        Shadowing only applies within a single HTTP method — POST
        /markets/search sits after GET /markets/{ticker} and is perfectly
        reachable, because the methods differ.
        """
        routes = [
            (
                r.path[len(_PREFIX):] if r.path.startswith(_PREFIX) else r.path,
                frozenset(getattr(r, "methods", None) or ()),
            )
            for r in kalshi_api.router.routes
        ]
        shadowed = []
        for i, (path, methods) in enumerate(routes):
            if path != "/markets/{ticker}":
                continue
            for later_path, later_methods in routes[i + 1:]:
                if not later_path.startswith("/markets/"):
                    continue
                first_segment = later_path.split("/markets/", 1)[1].split("/")[0]
                if "{" in first_segment:
                    continue
                if methods & later_methods:
                    shadowed.append(f"{sorted(later_methods)} {later_path}")
        assert not shadowed, f"declared after /markets/{{ticker}} and unreachable: {shadowed}"


class TestRoutesSurvivedTheReorder:
    def test_every_expected_route_is_still_registered(self):
        paths = set(_paths_in_declaration_order())
        for expected in (
            "/markets", "/markets/categories", "/markets/trending",
            "/markets/formatted", "/markets/{ticker}",
            "/markets/{ticker}/orderbook", "/markets/{ticker}/trades",
            "/markets/search", "/events", "/events/{event_id}",
            "/portfolio", "/portfolio/positions", "/portfolio/orders",
            "/trade", "/health", "/cache/clear",
        ):
            assert expected in paths, f"lost route: {expected}"

    def test_no_duplicate_handler_names(self):
        names = [r.name for r in kalshi_api.router.routes]
        dupes = sorted({n for n in names if names.count(n) > 1})
        assert not dupes, f"duplicated handlers, a block was copied not moved: {dupes}"
