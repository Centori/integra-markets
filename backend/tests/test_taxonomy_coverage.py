"""Taxonomy coverage for the historical archive.

After the archive scoring backlog was drained, 5,393 scored documents still
matched no topic at all. Sentiment existed for them; no entity-filtered
history query could ever return them.

Roughly 40% turned out to be scraper boilerplate ("My account" x1,192) and
were purged. The rest were real trade press the taxonomy simply could not
see: ports and vessels, drilling contracts, mine development, solar and
nuclear generation.

These tests use titles taken verbatim from the production archive.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.topic_taxonomy import (  # noqa: E402
    TOPICS,
    detect_topics,
    has_market_coverage,
)


class TestMaritimeIsTagged:
    """freight_shipping's keywords were rate-desk only: "baltic dry",
    "tanker rates", "vlcc". A quarter of the Hellenic Shipping archive is
    about ports and vessels and matched nothing."""

    def test_real_unmatched_maritime_headlines(self):
        cases = [
            "140 million euros EIB backing for Port of Piraeus transformation",
            "166 Ships Recycled During First Quarter of 2020",
            "20 countries sign agreement to keep ports open for unimpeded maritime trade",
            "West Africa grapples with piracy in Gulf of Guinea hotspot",
        ]
        for title in cases:
            assert "freight_shipping" in detect_topics(title, title=title), title


class TestUpstreamIsTagged:
    """crude_oil's keywords are price-desk words (crude, brent, wti, barrel),
    so oilfield-services news matched nothing."""

    def test_real_unmatched_upstream_headlines(self):
        cases = [
            "175-Well North Sea Orders Go to Ardyne",
            "$100MM Equinor Contract Goes to Maersk Drilling",
            "$2B North Sea Field Gets Green Light",
            "Aker BP Completes Delineation of New Discovery in Norwegian Sea",
        ]
        for title in cases:
            assert "upstream_oilfield" in detect_topics(title, title=title), title


class TestMiningAndGenerationAreTagged:
    def test_mining_sector(self):
        cases = [
            "Acacia Mining's Q4 output down on Tanzania export ban",
            "Caledonia bets big on Bilboes as Zimbabwe's next major gold mine",
        ]
        for title in cases:
            assert "mining_sector" in detect_topics(title, title=title), title

    def test_out_of_keyword_reach_is_accepted(self):
        """Not everything is reachable by keywords, and pretending otherwise
        is how false positives get added. "Spanish Mountain PEA lifts both NPV
        and capex" is a real mining headline containing no mining word — it
        needs company/ticker knowledge, not a wider keyword list. Documented
        here so nobody "fixes" it by adding "pea" or "npv"."""
        title = "Spanish Mountain PEA lifts both NPV and capex"
        assert detect_topics(title, title=title) == []

    def test_renewables_nuclear(self):
        cases = [
            "Constellation Energy and Walmart Announce Long-Term Nuclear Power Purchase Agreement",
            "Sibanye's South African solar site achieves commercial operations",
            "AI's energy appetite is reshaping the electric grid and nuclear demand",
        ]
        for title in cases:
            assert "renewables_nuclear" in detect_topics(title, title=title), title


class TestNoDivergenceBadges:
    """The new topics tag news. None of them has a Polymarket or Kalshi
    counterpart, so none may ever drive a divergence badge — otherwise the
    engine would compare sentiment against markets that do not exist."""

    def test_new_topics_are_tagging_only(self):
        for key in ("upstream_oilfield", "mining_sector", "renewables_nuclear"):
            assert key in TOPICS
            assert has_market_coverage(key) is False, key


class TestWordBoundarySafety:
    """The widened keyword lists include short common words — "port", "mine",
    "rig", "cargo". detect_topics compiles them into \\b(?:...)\\b, so
    substring collisions must not tag anything. Without the boundary,
    "reports", "determine" and "important" would each fire a topic."""

    def test_common_words_do_not_collide(self):
        traps = [
            ("Company reports strong quarterly results", "freight_shipping"),
            ("Analysts determine the outlook is important", "mining_sector"),
            ("Exports rose as the report was published", "freight_shipping"),
            ("The origin of the dispute remains unclear", "mining_sector"),
        ]
        for title, must_not in traps:
            assert must_not not in detect_topics(title, title=title), (title, must_not)

    def test_the_real_words_still_match(self):
        assert "freight_shipping" in detect_topics("Port congestion worsens", title="Port congestion worsens")
        assert "mining_sector" in detect_topics("New mine opens", title="New mine opens")


class TestIngestBoilerplateGuard:
    """The scraper must not create documents out of site furniture again."""

    def test_known_boilerplate_is_rejected(self):
        from scripts.backfill.wayback import _is_boilerplate

        for junk in [
            "My account", "MINING.COM", "  Sign In  ", "one moment, please...",
            "Hellenic Shipping News Worldwide, Online Daily Newspaper",
            "You searched for Apache", "", None,
        ]:
            assert _is_boilerplate(junk) is True, junk

    def test_real_short_headlines_survive(self):
        """The reason this is an exact-match list and not a length cutoff."""
        from scripts.backfill.wayback import _is_boilerplate

        for real in [
            "$100 Oil By Christmas?", "Aker Bags Equinor Deal",
            "ADNOC Comments on Fire", "350 Offshore Workers", "Gold",
        ]:
            assert _is_boilerplate(real) is False, real
