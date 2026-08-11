"""Topic detection precision: word boundaries + relevance bar.

Regression tests for the blanket-stamping bug: live audit (2026-08-03) found
15/18 feed cards carrying the identical crude_oil divergence reading, plus
"bitcoin" cards triggered by the Fusion Media crypto boilerplate.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.topic_taxonomy import detect_topics  # noqa: E402

FUSION_BOILERPLATE = (
    "Prices of cryptocurrencies are extremely volatile and may be affected by "
    "external factors such as financial, regulatory or political events."
)


def test_substring_false_positives_gone():
    # "eth" must not fire inside ordinary words
    assert "ethereum" not in detect_topics(
        "Whether farmers plant together this method depends on weather patterns."
    )
    # "oil" must not fire inside "turmoil"
    assert "crude_oil" not in detect_topics(
        "Political turmoil rattled markets across the region on Tuesday."
    )


def test_fusion_boilerplate_does_not_tag_bitcoin():
    assert "bitcoin" not in detect_topics(FUSION_BOILERPLATE)
    assert detect_topics(FUSION_BOILERPLATE, title="Gold steadies ahead of Fed") != ["bitcoin"]


def test_title_hit_tags_topic():
    assert "crude_oil" in detect_topics(
        "Prices rallied in early trade.", title="Oil surges as OPEC cuts output"
    )
    assert "gold" in detect_topics("", title="Gold hits record high") or \
        "gold" in detect_topics("Gold hits record high", title="Gold hits record high")


def test_single_body_mention_not_tagged():
    # One passing mention in the body (no title hit) is below the bar
    text = "Corn futures fell. Analysts noted oil markets were quiet."
    assert "crude_oil" not in detect_topics(text, title="Corn futures slip")


def test_repeated_body_mentions_tagged():
    text = (
        "Crude stockpiles fell sharply. Brent settled higher while WTI gained "
        "as refinery runs increased."
    )
    assert "crude_oil" in detect_topics(text, title="Markets wrap")


def test_legacy_single_arg_signature_still_works():
    # archive_writer calls detect_topics(text) with no title
    text = "Bitcoin climbed past resistance as bitcoin ETFs saw inflows."
    assert "bitcoin" in detect_topics(text)
