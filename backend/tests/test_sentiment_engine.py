"""The sentiment engine must never silently degrade, and must not score commodity names.

Two incidents motivate this file.

1. THE ANALYSER WAS NEVER WIRED UP. `main_simple_nlp` built the lexicon-enriched
   VADER inside FastAPI's `lifespan()` and assigned it to a module-level global
   that starts as `None`. `jobs/archive_scorer.py` and `jobs/news_fetcher.py`
   both did `from main_simple_nlp import vader_analyzer`, which copies the value
   at import time. Neither job runs under FastAPI, so both copied `None`, both
   hit `if vader:` and both fell through to a 20-word keyword list. 96% of the
   archive (60,225 of 62,771 rows) was scored that way while carrying
   model_name="vader_v2_commodity".

2. THE COMMODITY NAMES CARRIED SENTIMENT. VADER scores `crude` at -2.70
   ("vulgar") and `natural` at +1.50 ("wholesome"). Measured over 6,000 real
   titles, crude-oil headlines averaged a compound of -0.485 and natural-gas
   headlines +0.397 before a word of content was read — an 0.88 spread between
   two commodities produced entirely by two English adjectives.
"""
import pytest

from services.sentiment_engine import (
    LexiconUnavailable,
    clean_text,
    get_analyzer,
    vader_only_score,
)


class TestEngineCannotDegradeSilently:
    def test_analyzer_actually_has_the_finance_lexicons(self):
        """Plain VADER is ~7,500 terms; enriched is ~13,300.

        The product's accuracy claim (69.4% vs 58.7% on Financial Phrasebank)
        comes from the lexicons. An engine without them is not a degraded
        version of this product, it is a different one.
        """
        analyzer = get_analyzer()
        assert len(analyzer.lexicon) > 12000, (
            f"lexicon has only {len(analyzer.lexicon)} terms — the finance "
            "lexicons are missing and scoring would be plain VADER"
        )

    def test_analyzer_is_cached_not_rebuilt(self):
        assert get_analyzer() is get_analyzer()

    def test_there_is_no_importable_analyzer_global_to_copy(self):
        """The bug was `from main_simple_nlp import vader_analyzer` copying None.

        Guard the shape, not just the instance: if someone reintroduces a
        module-level analyser object here, a future `from services.sentiment_engine
        import <that>` can copy it before it is built and we are back where we
        started. Access must go through the function.
        """
        import services.sentiment_engine as eng

        public_globals = {
            name for name, val in vars(eng).items()
            if not name.startswith("_") and type(val).__name__ == "SentimentIntensityAnalyzer"
        }
        assert not public_globals, (
            f"public analyser global(s) {public_globals} can be copied at import "
            "time before construction — the exact bug that cost 96% of the archive"
        )


class TestCommodityNamesAreNotSentiment:
    @pytest.mark.parametrize("term", ["crude", "natural", "light", "sweet", "heavy", "well"])
    def test_commodity_vocabulary_is_neutralised(self, term):
        assert get_analyzer().lexicon.get(term) == 0.0, (
            f"'{term}' still carries general-English polarity; every headline "
            "naming this commodity or grade inherits a bias from its own name"
        )

    def test_crude_and_natural_gas_no_longer_pull_opposite_ways(self):
        """The two names biased their own headlines in OPPOSITE directions."""
        crude = vader_only_score("Crude oil inventories reported by the EIA")["compound"]
        gas = vader_only_score("Natural gas inventories reported by the EIA")["compound"]
        assert abs(crude - gas) < 0.05, (
            f"identical statements about two commodities score {crude} vs {gas} — "
            "the commodity name is still driving the score"
        )
        assert crude == pytest.approx(0.0, abs=0.05)

    @pytest.mark.parametrize("term", ["surge", "plunge", "rally", "collapse"])
    def test_genuine_market_direction_words_are_preserved(self, term):
        """The override list must not sand away real signal."""
        assert get_analyzer().lexicon.get(term, 0.0) != 0.0, (
            f"'{term}' is genuinely directional in a price headline and must "
            "keep its polarity"
        )


class TestTextCleaning:
    def test_html_entities_are_decoded(self):
        """9.1% of stored titles carry raw entities; nothing ever unescaped them.

        Note &#8217; is U+2019 RIGHT SINGLE QUOTATION MARK, not an ASCII
        apostrophe — decoding is not the same as ASCII-folding, and VADER
        tokenises on punctuation either way.
        """
        assert clean_text("Gold&#8217;s rally &amp; the OPEC cut") == "Gold’s rally & the OPEC cut"

    def test_double_encoded_entities_are_decoded(self):
        assert clean_text("Oil&amp;#8217;s move") == "Oil’s move"

    def test_empty_text_is_not_scored_as_neutral_data(self):
        """Absence of text must be distinguishable from a measured neutral."""
        assert vader_only_score("")["scored"] is False
        assert vader_only_score(None)["scored"] is False
        assert vader_only_score("Oil prices collapse on demand fears")["scored"] is True


class TestDirectionIsNotConfidence:
    def test_signed_compound_is_returned_alongside_confidence(self):
        """`entity_mentions.score` held confidence, so bearish rows scored HIGHER
        than bullish ones and averaging the column inverted the signal."""
        bear = vader_only_score("Oil prices collapse as demand craters")
        bull = vader_only_score("Oil prices surge on strong demand")

        assert bear["compound"] < 0 < bull["compound"]
        # Confidence is a magnitude: it does NOT distinguish direction.
        assert bear["confidence"] > 0.5 and bull["confidence"] > 0.5
