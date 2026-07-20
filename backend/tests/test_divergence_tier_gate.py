"""
Regression test for a tier-gating inconsistency found during the 2026-07
forensic sweep (see SYSTEM_MAP.md, "Bug 4: no divergence cards").

app/services/entitlementGate.ts opens divergence_alerts / polymarket_kalshi_view
/ divergence_filter to 'free_trial' users (comment: "added 2026-07-14 so trial
users... can see and evaluate the Markets features"). But backend/api/news_feed.py
independently stripped divergenceStatus/divergenceProvider/divergenceDelta/
divergenceTopic from the response for every tier except 'basic_markets' --
so a free_trial user whose client shows the Divergence filter chip unlocked
would NEVER actually receive divergence data to filter on. This is why the
user saw zero divergence cards even during the open evaluation window.

Fixed by allowing 'free_trial' through the same strip check, mirroring the
client-side gate. Both flags must be removed together before charging.
"""
import os
import re

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEWS_FEED_PATH = os.path.join(BACKEND_DIR, "api", "news_feed.py")


def _read_news_feed():
    with open(NEWS_FEED_PATH, "r") as f:
        return f.read()


def test_free_trial_is_not_stripped_of_divergence_fields():
    src = _read_news_feed()
    # The strip condition must allow free_trial through alongside basic_markets.
    assert 'tier not in ("free_trial", "basic_markets")' in src, (
        "Expected the divergence-field strip check to allow free_trial through "
        "(matching entitlementGate.ts's temporary eval gate). If this fails, "
        "either the gate was reverted or rewritten differently -- update this "
        "test to match the new check, and confirm the client-side gate in "
        "app/services/entitlementGate.ts still matches."
    )


def test_strip_check_still_blocks_basic_and_expired():
    src = _read_news_feed()
    match = re.search(r'if (tier not in \([^)]*\)):', src)
    assert match, "Could not find the divergence strip condition at all"
    condition = match.group(1)
    # Only free_trial and basic_markets should be exempt from stripping.
    assert '"basic"' not in condition, "plain 'basic' tier should still be stripped"
    assert '"expired"' not in condition, "'expired' tier should still be stripped"


def test_fix_is_commented_as_temporary_eval_state():
    src = _read_news_feed()
    assert "before charging for basic_markets" in src, (
        "The eval-window comment should stay attached so this gate is easy "
        "to find and remove alongside entitlementGate.ts's matching comment."
    )
