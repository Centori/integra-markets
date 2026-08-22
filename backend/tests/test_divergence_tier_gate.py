"""
Cross-surface tier-gate guard for divergence data.

Found during the 2026-07 forensic sweep: app/services/entitlementGate.ts
opened divergence_alerts / polymarket_kalshi_view / divergence_filter to
'free_trial' users, while backend/api/news_feed.py independently stripped
divergenceStatus / divergenceProvider / divergenceDelta / divergenceTopic for
every tier except 'basic_markets'. Result: the client showed an unlocked
Divergence filter with no data behind it.

CURRENT STATE (decided 2026-08-12, build 88): the eval window stays OPEN for
launch — free_trial keeps access on both surfaces. Locking was implemented and
then deliberately reverted so launch users aren't shown a takeaway before
subscriptions are proven. To close it, remove 'free_trial' from the strip
check in news_feed.py AND from those three entries in entitlementGate.ts, in
the same commit, then flip EXPECTED_TIERS below.

What these tests really protect is the *invariant*, not either state: the
backend strip check and the client FEATURE_ACCESS map must name the same set
of tiers. Changing one without the other reproduces the original bug.
"""
import os
import re

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEWS_FEED_PATH = os.path.join(BACKEND_DIR, "api", "news_feed.py")
GATE_PATH = os.path.join(
    os.path.dirname(BACKEND_DIR), "app", "services", "entitlementGate.ts"
)

DIVERGENCE_FEATURES = (
    "divergence_alerts",
    "polymarket_kalshi_view",
    "divergence_filter",
)

# Flip to {"basic_markets"} when charging for Markets features.
EXPECTED_TIERS = {"free_trial", "basic_markets"}


def _read(path):
    with open(path, "r") as f:
        return f.read()


def _strip_condition():
    """The tier tuple in news_feed.py's divergence strip check."""
    src = _read(NEWS_FEED_PATH)
    match = re.search(r"if tier not in \(([^)]*)\):", src)
    assert match, "Could not find the divergence strip condition at all"
    return set(re.findall(r'"([a-z_]+)"', match.group(1)))


def test_backend_exempts_the_expected_tiers():
    exempt = _strip_condition()
    assert exempt == EXPECTED_TIERS, (
        f"Divergence data should reach {sorted(EXPECTED_TIERS)}, but the strip "
        f"check exempts {sorted(exempt)}. If you are deliberately changing who "
        f"gets divergence, update entitlementGate.ts and EXPECTED_TIERS too."
    )


def test_paid_only_tiers_are_still_stripped():
    exempt = _strip_condition()
    assert "basic" not in exempt, "plain 'basic' tier should still be stripped"
    assert "expired" not in exempt, "'expired' tier should still be stripped"


def test_client_and_backend_gates_agree():
    """The invariant the original bug violated."""
    gate_src = _read(GATE_PATH)
    exempt = _strip_condition()

    for feature in DIVERGENCE_FEATURES:
        match = re.search(rf"{feature}:\s*\[([^\]]*)\]", gate_src)
        assert match, f"{feature} missing from entitlementGate.ts FEATURE_ACCESS"
        tiers = set(re.findall(r"'([a-z_]+)'", match.group(1)))
        assert tiers == exempt, (
            f"Cross-surface mismatch for '{feature}': the client grants "
            f"{sorted(tiers)} but the backend only sends divergence data to "
            f"{sorted(exempt)}. Whichever side you changed, change the other "
            f"-- a filter the API strips is exactly the 2026-07 bug."
        )
