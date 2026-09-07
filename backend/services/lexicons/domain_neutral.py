"""Terms that are commodity VOCABULARY, not sentiment.

VADER's general-English lexicon was built for social media. Several of its
entries are, in commodity news, simply the names of things — and because they
appear in a large share of headlines they impose a constant directional bias
that has nothing to do with what the article says.

The two worst are the commodity names themselves, and they pull opposite ways:

    crude    -2.70   "crude" as in vulgar. Every "Crude Oil" headline starts
                     bearish before a single word of content is read.
    natural  +1.50   "natural" as in wholesome. Every "Natural Gas" headline
                     starts bullish.

So a cross-commodity comparison of oil against gas was measuring VADER's
opinion of two English adjectives. Found by ranking every lexicon term by
frequency x |polarity| over a 6,000-title sample of the real corpus, not by
guessing.

Only genuinely non-sentiment terms are listed. Words that ARE directional in a
market context are deliberately left alone — `up`, `down`, `higher`, `lower`,
`rise`, `fall`, `gains`, `losses`, `record`, `growth`, `strong`, `drop` all
carry real signal in a headline about prices, and neutralising them would
throw away the thing we are trying to measure.

Domain polarity that general English gets BACKWARDS (an OPEC output *cut* is
bullish for price; an inventory *build* is bearish) is not handled here — that
is the job of the per-commodity rulebook in
`main_simple_nlp.analyze_fundamental_direction`, which blends in at
SENTIMENT_RULE_COEF. This module only removes noise; the rulebook adds signal.
"""

# token -> 0.0 (neutral). Values are floats because VADER's lexicon is float-valued.
DOMAIN_NEUTRAL: dict[str, float] = {
    # --- commodity and product names -------------------------------------
    "crude": 0.0,        # crude oil, not vulgarity              (-2.70)
    "natural": 0.0,      # natural gas, not wholesomeness        (+1.50)
    "light": 0.0,        # light sweet crude — a grade
    "sweet": 0.0,        # sweet crude = low sulphur, not pleasant
    "sour": 0.0,         # sour crude = high sulphur
    "heavy": 0.0,        # heavy crude — a density grade
    "well": 0.0,         # an oil well                           (+1.10)
    "wells": 0.0,
    "rich": 0.0,         # gas-rich, ore-rich — a grade descriptor
    "prime": 0.0,        # prime rate / prime grade
    "gross": 0.0,        # gross production, not disgusting

    # --- finance and industry nouns --------------------------------------
    "shares": 0.0,       # equity, not sharing                   (+1.20)
    "share": 0.0,
    "stock": 0.0,        # also "stocks" = inventories
    "stocks": 0.0,
    "interest": 0.0,     # interest rates / open interest
    "capital": 0.0,
    "security": 0.0,     # a tradable security
    "securities": 0.0,
    "credit": 0.0,
    "debt": 0.0,         # a balance-sheet line, not a misfortune
    "futures": 0.0,      # the contract
    "future": 0.0,
    "spot": 0.0,         # spot price
    "settle": 0.0,       # settlement, not resolution of a dispute
    "settled": 0.0,
    "trust": 0.0,        # an investment trust
    "bond": 0.0,
    "bonds": 0.0,

    # --- technology / general nouns that ride along -----------------------
    "intelligence": 0.0,  # artificial intelligence               (+2.10)
    "smart": 0.0,         # smart grid, smart meter
    "clean": 0.0,         # clean energy — a category, not praise
    "green": 0.0,         # green hydrogen — a category
    "solid": 0.0,         # solid fuel / solid state

    # --- quantifiers and function words ----------------------------------
    "more": 0.0,
    "most": 0.0,
    "no": 0.0,
    "under": 0.0,
    "above": 0.0,
    "below": 0.0,
}

__all__ = ["DOMAIN_NEUTRAL"]
