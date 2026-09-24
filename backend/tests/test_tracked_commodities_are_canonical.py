"""A dashboard tile can only show data it is able to ask for.

NAT GAS read "NEUTRAL, 0 articles" on the dashboard and in the mobile app every
day since the tile was added. Not because the gas market was quiet, and not
because ingestion was broken — 22 oil mentions and 3 gold were landing in the
same table on the same day — but because the tile queried
`entity = "natural gas"` while the sentiment engine normalises that phrase to
`gas` before storing it. The query could never match, and a query that cannot
match is indistinguishable from a market with no news.

The two lists live in different modules and neither imports the other, so
nothing connected them. This test is the connection.
"""

from __future__ import annotations

from api.market_sentiment import _TRACKED
from services.commodity_sentiment import _COMMODITY_ALIASES

CANONICAL = set(_COMMODITY_ALIASES.values())


def test_every_tracked_entity_is_one_the_engine_writes():
    """Each tracked name must be a normalisation TARGET, not an alias."""
    unmatchable = [entity for entity, _ in _TRACKED if entity not in CANONICAL]
    assert not unmatchable, (
        f"{unmatchable} cannot match any row in entity_mentions. These are "
        f"queried against entity_mentions.entity, which stores what the engine "
        f"normalises to. Use the canonical name (e.g. 'gas', not 'natural gas')."
    )


def test_the_alias_that_caused_it_still_resolves():
    """Guards the direction of the mapping, which is what made this subtle.

    'natural gas' is a perfectly good input — it just is not what gets stored.
    """
    assert _COMMODITY_ALIASES.get("natural gas") == "gas"
    assert "natural gas" not in CANONICAL


def test_tracked_display_names_are_distinct():
    """Two tiles with the same label would make a mismatch harder to spot."""
    labels = [display for _, display in _TRACKED]
    assert len(labels) == len(set(labels))
