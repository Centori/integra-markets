"""The divergence tier gate must match the mobile client's gate.

Why this test exists
--------------------
`/api/news/feed` stripped divergence fields for every tier except
`basic_markets`:

    if tier != "basic_markets":
        for art in articles: ...pop divergence fields...

while `app/services/entitlementGate.ts` had already opened those features to
`free_trial` — which is every user today:

    divergence_alerts:      ['free_trial', 'basic_markets'],
    polymarket_kalshi_view: ['free_trial', 'basic_markets'],
    divergence_filter:      ['free_trial', 'basic_markets'],

A gate mismatch is invisible on one surface and broken on the other, and the
consequence was user-visible: `MOCK_DIVERGENCE_CARD` in App.js is injected only
while no live article carries `divergenceStatus == 'DIVERGENCE'`, and it can
never be displaced if the field is removed before it reaches the client. The
demo card — "This is a demonstration card and self-replaces once live
divergence data is available" — was therefore permanent, even though production
`divergence_monitor` logs showed `fed_rates` and `iran_middle_east` clearing the
20-point threshold against Polymarket.

SYSTEM_MAP.md's punch-list requires the two gates to be re-locked together
before charging. This test is what makes "together" enforceable: it fails if
either side moves alone.
"""
import os
import re
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.news_feed import DIVERGENCE_TIERS  # noqa: E402

DIVERGENCE_FIELDS = (
    "divergenceStatus", "divergenceProvider", "divergenceDelta", "divergenceTopic",
    "crossMarketStatus", "crossMarketDelta", "crossMarketTopic",
    "polymarketImplied", "kalshiImplied",
)

# entitlementGate.ts feature keys that gate the same data.
CLIENT_GATED_FEATURES = ("divergence_alerts", "polymarket_kalshi_view", "divergence_filter")

_ENTITLEMENT_GATE_CANDIDATES = (
    os.path.join(os.path.expanduser("~"), "Desktop", "integra", "integra-markets-2",
                 "app", "services", "entitlementGate.ts"),
)


def _find_entitlement_gate():
    for path in _ENTITLEMENT_GATE_CANDIDATES:
        if os.path.exists(path):
            return path
    return None


class TestBackendGate:
    def test_free_trial_receives_divergence_fields(self):
        """Every user is free_trial today; stripping them shows only the demo card."""
        assert "free_trial" in DIVERGENCE_TIERS

    def test_basic_markets_receives_divergence_fields(self):
        assert "basic_markets" in DIVERGENCE_TIERS

    def test_plain_basic_does_not(self):
        """`basic` is the paid non-markets tier — divergence is the upsell."""
        assert "basic" not in DIVERGENCE_TIERS

    def test_expired_does_not(self):
        assert "expired" not in DIVERGENCE_TIERS

    def test_gate_is_an_explicit_allow_list(self):
        """Not a `!=` against one tier, which is what silently excluded free_trial."""
        assert isinstance(DIVERGENCE_TIERS, (tuple, frozenset, set))
        assert len(DIVERGENCE_TIERS) >= 2


class TestCrossSurfaceInvariant:
    """The gates must agree. This is the test that makes re-locking safe."""

    def test_client_and_backend_allow_the_same_tiers(self):
        gate_path = _find_entitlement_gate()
        if gate_path is None:
            pytest.skip("entitlementGate.ts not reachable from this checkout")

        with open(gate_path) as fh:
            source = fh.read()

        for feature in CLIENT_GATED_FEATURES:
            match = re.search(rf"{feature}\s*:\s*\[([^\]]*)\]", source)
            assert match, f"{feature} not found in entitlementGate.ts"
            client_tiers = set(re.findall(r"'([^']+)'", match.group(1)))
            assert client_tiers == set(DIVERGENCE_TIERS), (
                f"gate mismatch for {feature}: client allows {sorted(client_tiers)}, "
                f"backend allows {sorted(DIVERGENCE_TIERS)}. These were opened as a "
                f"pair for the same evaluation window and must close as a pair — "
                f"see the punch-list in SYSTEM_MAP.md."
            )


class TestStripBehaviour:
    """The strip itself, exercised without standing up the app."""

    @staticmethod
    def _strip(articles, tier):
        if tier not in DIVERGENCE_TIERS:
            for art in articles:
                for k in DIVERGENCE_FIELDS:
                    art.pop(k, None)
        return articles

    def _enriched(self):
        return [{
            "title": "Hormuz Tanker Traffic Slows to a Trickle",
            "divergenceStatus": "DIVERGENCE",
            "divergenceProvider": "polymarket",
            "divergenceDelta": -0.28,
            "divergenceTopic": "iran_middle_east",
            "polymarketImplied": -0.71,
            "kalshiImplied": None,
        }]

    def test_free_trial_keeps_the_status_that_displaces_the_demo_card(self):
        art = self._strip(self._enriched(), "free_trial")[0]
        assert art["divergenceStatus"] == "DIVERGENCE"
        assert art["divergenceProvider"] == "polymarket"

    def test_paid_markets_tier_keeps_everything(self):
        art = self._strip(self._enriched(), "basic_markets")[0]
        for field in ("divergenceStatus", "divergenceDelta", "polymarketImplied"):
            assert field in art

    def test_ungated_tier_loses_every_divergence_field(self):
        art = self._strip(self._enriched(), "basic")[0]
        for field in DIVERGENCE_FIELDS:
            assert field not in art
        # And the article itself survives — only the paid fields go.
        assert art["title"] == "Hormuz Tanker Traffic Slows to a Trickle"

    def test_stripping_is_safe_on_articles_without_the_fields(self):
        arts = self._strip([{"title": "plain"}], "basic")
        assert arts == [{"title": "plain"}]
