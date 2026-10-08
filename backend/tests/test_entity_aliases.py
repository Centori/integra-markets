"""Two vocabularies write `entity_mentions.entity`, and on four subjects they
disagree about the name.

`commodity_sentiment._COMMODITY_ALIASES` emits 20 canonical commodity names;
`topic_taxonomy.TOPICS` emits 39 topics across 9 categories covering the same
commodities plus macro and geopolitical subjects. Both are wanted. The defect is
that they are indistinguishable once written, and four subjects appear twice:

    oil ↔ crude_oil    gas ↔ natural_gas
    freight ↔ freight_shipping    lpg ↔ lpg_ngl

So /v1/commodities listed 49 entries in which four subjects appeared under two
names, and a customer who picked `crude_oil` received 86% of what `oil` would
have given them with no way to find out why.

THE HAZARD IS DOUBLE COUNTING, NOT MISSING DATA. Measured 2026-09-29: 93% of
crude_oil documents also carry an oil mention (48,699 of 52,148). Merging gains
3,449 documents — 5.7%, not the ~50% a raw count comparison implies. A naive
union re-reads those 48,699 and averages each twice, producing a wrong number
that nothing else would surface. Most of this file is about that.
"""

from __future__ import annotations

import pytest

from services import entity_aliases as ea


class TestResolution:
    @pytest.mark.parametrize("alias,canon", [
        ("crude_oil", "oil"),
        ("natural_gas", "gas"),
        ("freight_shipping", "freight"),
        ("lpg_ngl", "lpg"),
    ])
    def test_the_four_secondary_names_resolve(self, alias, canon):
        assert ea.canonical(alias) == canon
        assert ea.is_alias(alias)

    def test_a_canonical_name_resolves_to_itself(self):
        assert ea.canonical("oil") == "oil"
        assert not ea.is_alias("oil")

    def test_an_unknown_entity_is_returned_unchanged(self):
        """The taxonomy grows. An unheard-of entity is a normal state, not an
        error, and rejecting it would break the endpoint for new topics."""
        assert ea.canonical("hydrogen") == "hydrogen"
        assert ea.names_for("hydrogen") == ["hydrogen"]

    def test_resolution_is_case_and_space_insensitive(self):
        assert ea.canonical("  CRUDE_OIL ") == "oil"

    def test_names_for_returns_every_spelling_of_the_subject(self):
        assert set(ea.names_for("oil")) == {"oil", "crude_oil"}
        assert set(ea.names_for("crude_oil")) == {"oil", "crude_oil"}

    def test_an_unaliased_commodity_queries_only_itself(self):
        """Over-broadening here would merge unrelated subjects."""
        assert ea.names_for("copper") == ["copper"]
        assert ea.names_for("gold") == ["gold"]

    def test_equivalences_are_declared_not_inferred(self):
        """Stripping underscores would eventually marry two unrelated topics,
        and a wrong merge corrupts an average rather than failing."""
        assert ea.canonical("refined_products") == "refined_products"
        assert ea.canonical("iron_ore_steel") == "iron_ore_steel"
        assert ea.canonical("fed_rates") == "fed_rates"


class TestDeduplication:
    """The part that stops the fix from being worse than the bug."""

    def test_the_same_document_under_two_labels_counts_once(self):
        rows = [
            {"document_id": "d1", "entity": "oil", "sentiment_score": 0.8},
            {"document_id": "d1", "entity": "crude_oil", "sentiment_score": 0.8},
            {"document_id": "d2", "entity": "crude_oil", "sentiment_score": -0.4},
        ]
        out = ea.dedupe_by_document(rows)
        assert len(out) == 2
        assert {r["document_id"] for r in out} == {"d1", "d2"}

    def test_the_average_is_not_skewed_by_the_duplicate(self):
        """The failure this exists to prevent, stated as the number it corrupts.
        Without dedup the mean is 0.4; with it, 0.2."""
        import statistics

        rows = [
            {"document_id": "d1", "entity": "oil", "sentiment_score": 0.8},
            {"document_id": "d1", "entity": "crude_oil", "sentiment_score": 0.8},
            {"document_id": "d2", "entity": "oil", "sentiment_score": -0.4},
        ]
        naive = statistics.fmean(r["sentiment_score"] for r in rows)
        correct = statistics.fmean(
            r["sentiment_score"] for r in ea.dedupe_by_document(rows)
        )
        assert round(naive, 4) == 0.4
        assert round(correct, 4) == 0.2

    def test_order_is_preserved_and_the_first_row_wins(self):
        """Rows arrive ordered by published_at desc; reordering them would change
        which article is reported as most recent."""
        rows = [
            {"document_id": "d1", "entity": "oil", "n": 1},
            {"document_id": "d2", "entity": "oil", "n": 2},
            {"document_id": "d1", "entity": "crude_oil", "n": 3},
        ]
        out = ea.dedupe_by_document(rows)
        assert [r["n"] for r in out] == [1, 2]

    def test_rows_without_a_document_id_are_kept_separately(self):
        """They cannot be shown to be duplicates, so collapsing them together
        would delete real observations."""
        rows = [{"entity": "oil"}, {"entity": "oil"}]
        assert len(ea.dedupe_by_document(rows)) == 2

    def test_an_empty_input_is_empty_output(self):
        assert ea.dedupe_by_document([]) == []


class TestDescribe:
    def test_a_stored_entity_gains_a_human_label_and_category(self):
        """`macro` and `oil` were both valid values of one field and meant very
        different things; a bare string made them indistinguishable."""
        out = ea.describe("fed_rates")
        assert out["category"] == "macro"
        assert out["label"] and out["label"] != "fed_rates"

    def test_a_secondary_name_points_at_its_canonical(self):
        assert ea.describe("crude_oil")["same_as"] == "oil"

    def test_a_canonical_name_points_nowhere(self):
        """A non-null `same_as` on every row would make clients collapse
        everything into everything."""
        assert ea.describe("oil")["same_as"] is None

    def test_an_unknown_entity_still_gets_a_readable_label(self):
        out = ea.describe("iron_ore_steel")
        assert out["label"]
        assert "_" not in out["label"]


class TestCollapse:
    def test_alias_rows_merge_into_one_subject(self):
        out = ea.collapse([
            {"commodity": "oil", "article_count": 60314},
            {"commodity": "crude_oil", "article_count": 52148},
            {"commodity": "gold", "article_count": 41167},
        ])
        names = [r["commodity"] for r in out]
        assert names == ["oil", "gold"]
        assert "crude_oil" not in names

    def test_the_alternate_spelling_is_reported_not_hidden(self):
        """A caller with `crude_oil` hard-coded needs to see where it went."""
        out = ea.collapse([
            {"commodity": "oil", "article_count": 10},
            {"commodity": "crude_oil", "article_count": 5},
        ])
        assert out[0]["aliases"] == ["crude_oil"]

    def test_a_merged_count_is_flagged_as_an_upper_bound(self):
        """Summed per-entity counts over-state, because the documents overlap and
        the listing has no document ids to deduplicate with. Saying so is the
        difference between an approximation and a wrong number."""
        out = ea.collapse([
            {"commodity": "oil", "article_count": 10},
            {"commodity": "crude_oil", "article_count": 5},
        ])
        assert out[0]["article_count"] == 15
        assert out[0]["article_count_upper_bound"] is True

    def test_an_unmerged_row_is_not_flagged(self):
        out = ea.collapse([{"commodity": "gold", "article_count": 41167}])
        assert "article_count_upper_bound" not in out[0]
        assert out[0]["aliases"] == []

    def test_results_are_ordered_by_volume(self):
        out = ea.collapse([
            {"commodity": "corn", "article_count": 618},
            {"commodity": "gold", "article_count": 41167},
        ])
        assert [r["commodity"] for r in out] == ["gold", "corn"]


class TestTheDeclaredPairsMatchTheVocabularies:
    def test_every_canonical_is_a_real_engine_name(self):
        """A canonical that the scoring engine never emits would silently point
        callers at an entity holding nothing."""
        from services.commodity_sentiment import _COMMODITY_ALIASES

        engine = set(_COMMODITY_ALIASES.values())
        for canon in ea.EQUIVALENT_NAMES:
            assert canon in engine, f"{canon} is not a name the engine emits"

    def test_every_secondary_is_a_real_taxonomy_topic(self):
        """And a secondary that the taxonomy never emits would be dead config."""
        from services.topic_taxonomy import TOPICS

        for canon, names in ea.EQUIVALENT_NAMES.items():
            for name in names:
                if name == canon:
                    continue
                assert name in TOPICS, f"{name} is not a topic the taxonomy emits"


class TestCanonicalSubjectsAreDescribed:
    """The canonical names are the engine's spellings; the taxonomy is keyed on
    ITS spellings. Looking up `oil` alone finds nothing, so the four merged
    subjects came back with a null category and a label that was just the key
    echoed — while every unmerged subject got a real one. The inconsistency
    would have been visible in the API and invisible in the tests."""

    @pytest.mark.parametrize("canon,expected_category", [
        ("oil", "commodities"),
        ("gas", "commodities"),
        ("freight", "logistics"),
        ("lpg", "energy_products"),
    ])
    def test_a_merged_subject_carries_its_taxonomy_category(self, canon, expected_category):
        assert ea.describe(canon)["category"] == expected_category

    @pytest.mark.parametrize("canon", ["oil", "gas", "freight", "lpg"])
    def test_a_merged_subject_has_a_real_label_not_the_key(self, canon):
        label = ea.describe(canon)["label"]
        assert label and label.lower() != canon

    def test_every_declared_canonical_resolves_to_a_category(self):
        """Guards the whole group rather than the four we happen to have today."""
        for canon in ea.EQUIVALENT_NAMES:
            assert ea.describe(canon)["category"], f"{canon} has no category"


class TestMarketTickersResolve:
    """`brent` matched nothing, and a correct map existed two modules away.

    `commodity_sentiment._COMMODITY_ALIASES` maps 68 synonyms and tickers onto
    20 canonical names, and had always been applied at WRITE time only. So
    /v1/sentiment?commodity=brent returned an empty 200 — indistinguishable from
    "no news about oil today" — and the endpoint's own docstring documented that
    as expected behaviour rather than as the bug it was.

    These are the highest-intent search terms a commodities product has. The App
    Store keyword plan targets them, and buying traffic for a term that returns
    nothing is worse than not buying it.
    """

    @pytest.mark.parametrize("ticker,canon", [
        ("brent", "oil"),
        ("wti", "oil"),
        ("crude", "oil"),
        ("henry hub", "gas"),
        ("ttf", "gas"),
        ("jkm", "gas"),
    ])
    def test_a_ticker_resolves_to_its_commodity(self, ticker, canon):
        assert ea.canonical(ticker) == canon

    def test_a_ticker_queries_the_stored_names_not_itself(self):
        """The subtle half. `brent` resolving to `oil` is not enough — the query
        has to go out as the names that exist in the table, and `oil` itself has
        a second stored spelling."""
        names = ea.names_for("brent")
        assert set(names) == {"oil", "crude_oil"}
        assert "brent" not in names, "querying the ticker matches zero rows"

    def test_resolution_is_idempotent(self):
        """canonical(canonical(x)) == canonical(x), or a second pass through the
        read path would move the answer."""
        for term in ("brent", "ttf", "crude_oil", "oil", "copper"):
            once = ea.canonical(term)
            assert ea.canonical(once) == once, term

    def test_an_unknown_term_is_not_silently_mapped(self):
        """Over-eager resolution would be worse than none: answering a question
        about `hydrogen` with oil data is a wrong answer, not a near miss."""
        assert ea.canonical("hydrogen") == "hydrogen"
        assert ea.names_for("hydrogen") == ["hydrogen"]

    def test_resolution_survives_the_engine_being_unimportable(self, monkeypatch):
        """The engine import is wrapped. A failure there must degrade to
        stored-name resolution, not 500 the request."""
        import services.entity_aliases as mod

        monkeypatch.setattr(mod, "_engine_alias", lambda _k: None)
        assert mod.canonical("crude_oil") == "oil"   # stored variant still works
        assert mod.canonical("brent") == "brent"     # ticker no longer resolves
