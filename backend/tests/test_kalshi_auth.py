"""Every Kalshi route that moves money or discloses the account must require a key.

Why this exists
---------------
On 2026-09-02 all 20 `/kalshi/*` routes were mounted with no authentication
dependency, in production. `get_kalshi_client()` authenticates with
KALSHI_API_KEY_ID / KALSHI_PRIVATE_KEY from the server's own environment, so
the process trades on ONE account — Integra's. An anonymous caller could:

    POST   /kalshi/trade                      place a real order
    POST   /kalshi/portfolio/orders           create an order
    PUT    /kalshi/portfolio/orders/{id}      amend one
    DELETE /kalshi/portfolio/orders/{id}      cancel one
    GET    /kalshi/portfolio[/positions]      read the full position book

Several handlers carried the docstring "(requires authentication)". The
requirement was written down and never enforced — which is exactly why this is
a test and not a comment.

Read-only market data (/markets, /events, orderbooks) is deliberately public:
it is Kalshi's own public data and the mobile client fetches it without a key.
Asserting that here too keeps a future "lock everything" change from silently
breaking market browsing.
"""
import pytest

from api.kalshi import router

# (method, path) pairs that must NOT be reachable anonymously.
PROTECTED = {
    ("GET", "/kalshi/portfolio"),
    ("GET", "/kalshi/portfolio/positions"),
    ("GET", "/kalshi/portfolio/orders"),
    ("GET", "/kalshi/portfolio/orders/{order_id}"),
    ("POST", "/kalshi/portfolio/orders"),
    ("PUT", "/kalshi/portfolio/orders/{order_id}"),
    ("DELETE", "/kalshi/portfolio/orders/{order_id}"),
    ("POST", "/kalshi/trade"),
    ("POST", "/kalshi/cache/clear"),
}

# Public Kalshi market data — no key required, by design.
PUBLIC = {
    ("GET", "/kalshi/markets"),
    ("GET", "/kalshi/markets/categories"),
    ("GET", "/kalshi/markets/trending"),
    ("GET", "/kalshi/events"),
    ("GET", "/kalshi/health"),
}


def _routes():
    """Map (method, path) -> the route's dependency callables."""
    out = {}
    for route in router.routes:
        for method in getattr(route, "methods", set()):
            deps = [
                d.call
                for d in getattr(route.dependant, "dependencies", [])
                if getattr(d, "call", None) is not None
            ]
            out[(method, route.path)] = deps
    return out


@pytest.mark.parametrize("method,path", sorted(PROTECTED))
def test_sensitive_route_requires_api_key(method, path):
    from services.api_key_auth import verify_api_key

    routes = _routes()
    assert (method, path) in routes, f"{method} {path} is not registered — did it move?"
    deps = routes[(method, path)]
    assert verify_api_key in deps, (
        f"{method} {path} has NO auth dependency. It trades or discloses "
        f"Integra's own Kalshi account and must require an API key."
    )


@pytest.mark.parametrize("method,path", sorted(PUBLIC))
def test_public_market_data_stays_public(method, path):
    from services.api_key_auth import verify_api_key

    routes = _routes()
    assert (method, path) in routes, f"{method} {path} is not registered — did it move?"
    assert verify_api_key not in routes[(method, path)], (
        f"{method} {path} is public Kalshi market data the mobile client "
        f"fetches without a key; requiring one breaks market browsing."
    )


def test_no_unprotected_portfolio_or_trade_route_escapes_the_list():
    """Catch a NEW sensitive route added without auth.

    The parametrised test above only checks paths someone remembered to list.
    This one fails if any /portfolio or /trade route exists that is neither
    protected nor explicitly acknowledged here.
    """
    from services.api_key_auth import verify_api_key

    for (method, path), deps in _routes().items():
        if "/portfolio" in path or path.endswith("/trade"):
            assert verify_api_key in deps, (
                f"{method} {path} touches the account but has no auth dependency"
            )
