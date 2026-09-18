"""The commodity sentiment engine.

Moved here verbatim from `main_simple_nlp.py`, which defines a FastAPI app that
`uvicorn main:app` does not mount. The engine lived inside 3300 lines of dead
routes, and every consumer — jobs/news_fetcher, jobs/archive_scorer,
jobs/pipeline_health, scripts/tune_sentiment and the tests — reached into that
module to get at it. Importing an unmounted web application to score a headline
is how `vader_analyzer` came to be read from a FastAPI startup hook by a cron
job, and how 96% of the archive was scored by a 20-word keyword list while
claiming otherwise.

This module has no app, no routes and no startup hook. It is importable from
anywhere and behaves identically everywhere.

WHAT IS HERE: commodity normalisation, the rulebooks and their curve/weather/
macro modifiers, fundamental direction, the VADER blend, keyword and ticker
extraction, and the market-impact mapping.

WHAT IS NOT: analyser construction. That belongs to
`services.sentiment_engine.get_analyzer()`, which builds the lexicon-enriched
VADER once, lazily, and raises rather than degrading. There is deliberately no
importable `vader_analyzer` global here — that global is the bug.
"""

from __future__ import annotations

import logging
import math
import os
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

SENTIMENT_THRESHOLD: float = 0.33


SENTIMENT_BLEND_VADER: float = 0.5  # weight on VADER vs rulebook when rules fire


SENTIMENT_RULE_COEF: float = 0.22   # per-match increment in analyze_fundamental_direction


# Summed one-sided signal WEIGHT required before the fundamental read
# DETERMINES the label instead of being averaged with tone. See the note in
# analyze_market_sentiment.
SENTIMENT_RULE_DOMINANCE_WEIGHT: float = 0.85


# Helper functions
def basic_sentiment_analysis(text: str, commodity: Optional[str] = None) -> dict:
    """Basic keyword-based sentiment analysis"""
    positive_words = ['surge', 'gain', 'profit', 'growth', 'increase', 'rise', 'boom', 'rally', 'strong', 'high']
    negative_words = ['fall', 'drop', 'loss', 'decline', 'decrease', 'crash', 'plunge', 'cut', 'weak', 'low']
    
    text_lower = text.lower()
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    if positive_count > negative_count:
        sentiment = "BULLISH"
        confidence = min(0.85, 0.6 + (positive_count * 0.08))
    elif negative_count > positive_count:
        sentiment = "BEARISH"
        confidence = min(0.85, 0.6 + (negative_count * 0.08))
    else:
        sentiment = "NEUTRAL"
        confidence = 0.5
    
    return {
        "sentiment": sentiment,
        "confidence": round(confidence, 3),
        "method": "basic_keyword",
        "commodity_specific": commodity is not None
    }


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


# Aliases -> canonical commodity. Order is irrelevant: resolution scores every
# alias and takes the strongest, rather than returning whichever happened to be
# first in a dict.
_COMMODITY_ALIASES: Dict[str, str] = {
    "oil": "oil", "crude": "oil", "crude oil": "oil", "wti": "oil",
    "brent": "oil", "petroleum": "oil",
    # Refined products belong with crude, not with natural gas. "gasoline"
    # previously resolved to `gas` on a substring match, which routed every
    # motor-fuel story into the natural-gas rulebook.
    "refinery": "oil", "refining": "oil",
    # Product names route to refined_products, which has its own book: products
    # move INVERSELY to crude on a refinery outage, because crude that cannot be
    # processed backs up while product supply tightens. "refinery" itself stays
    # with oil -- a refinery attack is as much a crude story as a product one.
    "gasoline": "refined_products", "diesel": "refined_products",
    "gasoil": "refined_products", "jet fuel": "refined_products",
    "naphtha": "refined_products", "distillate": "refined_products",

    "gas": "gas", "nat gas": "gas", "natural gas": "gas", "lng": "gas",
    "henry hub": "gas", "ttf": "gas", "jkm": "gas",

    "gold": "gold", "bullion": "gold",
    "silver": "silver",
    "uranium": "uranium", "u3o8": "uranium", "yellowcake": "uranium",
    "forex": "forex", "fx": "forex", "usd": "forex", "dollar": "forex",
    "eurusd": "forex", "usdjpy": "forex",
    "bitcoin": "bitcoin", "btc": "bitcoin",
    "wheat": "wheat",
    "corn": "corn", "maize": "corn",
    "macro": "macro",
    "weather": "weather",

    # Markets the archive already classifies (topic_taxonomy tracks 39 topics)
    # and the rulebook could not previously speak about.
    "copper": "copper", "lme copper": "copper",
    "lithium": "lithium", "spodumene": "lithium", "lithium carbonate": "lithium",
    "fertilizer": "fertilizer", "fertiliser": "fertilizer", "urea": "fertilizer",
    "ammonia": "fertilizer", "potash": "fertilizer", "phosphate": "fertilizer",
    "refined products": "refined_products", "crack spread": "refined_products",
    "freight": "freight", "tanker rates": "freight", "baltic dry": "freight",
    "dry bulk": "freight", "charter rates": "freight",
    "tin": "tin",
    "helium": "helium",
    "lpg": "lpg", "propane": "lpg", "butane": "lpg", "ngl": "lpg",
    "coltan": "coltan", "columbite": "coltan", "tantalum": "coltan",
    "niobium": "coltan",
}


# Cross-cutting factors rather than markets. Demoted in resolution so a real
# commodity mentioned in the same article always wins.
_PSEUDO_COMMODITIES = frozenset({"weather", "macro", "forex"})


# Longest alias first, so "crude oil" and "natural gas" win over "oil"/"gas".
_ALIAS_PATTERNS: List[tuple] = [
    (
        alias,
        canonical,
        # \b on both sides. Without it "Goldman" matched gold, "Las Vegas"
        # matched gas, "Cornerstone" matched corn and "spoiled" matched oil --
        # and since this function chooses WHICH rulebook runs, a wrong answer
        # here applies the wrong directional rules to the whole article.
        # Trailing plural tolerated: \b after "spread" fails on "crack spreads",
        # because the following "s" is a word character. Without this the alias
        # silently never matches its own most common written form.
        re.compile(r"\b" + re.escape(alias) + r"(?:s|es)?\b", re.IGNORECASE),
    )
    for alias, canonical in sorted(
        _COMMODITY_ALIASES.items(), key=lambda kv: -len(kv[0])
    )
]


def normalize_commodity(commodity: Optional[str], text: Optional[str] = None) -> Optional[str]:
    """Normalize a commodity name, or infer one from text.

    Inference scores every alias by occurrence count, weighted by alias length
    so a specific term outranks a generic one, and returns the strongest.
    Previously it returned the first dict key found anywhere in the text as a
    bare substring, which produced:

        "Goldman Sachs downgraded..."        -> gold
        "Las Vegas Sands reported..."        -> gas
        "Cornerstone Capital raised..."      -> corn
        "The plan was spoiled by a delay"    -> oil

    Every one of those runs the wrong rulebook over the article.
    """
    if commodity:
        key = commodity.strip().lower()
        return _COMMODITY_ALIASES.get(key, key)
    if not text:
        return None

    scores: Dict[str, float] = {}
    for alias, canonical, pattern in _ALIAS_PATTERNS:
        hits = len(pattern.findall(text))
        if hits:
            # Length weighting breaks the common tie where an article says
            # "natural gas" once and "gas" five times -- both point at gas, but
            # "crude oil" vs "oil" in an article that also mentions "oil prices"
            # should not let a generic term outvote a specific one.
            weight = hits * (1 + len(alias) / 20.0)
            # "weather" and "macro" are cross-cutting factors, not markets. They
            # remain as fallback books for articles that resolve to nothing
            # else, but must never outrank a real commodity that is also
            # present: a drought story about wheat is a WHEAT story, and only
            # wheat's book knows a drought is bullish there.
            if canonical in _PSEUDO_COMMODITIES:
                weight *= 0.4
            scores[canonical] = scores.get(canonical, 0.0) + weight
    if not scores:
        return None
    return max(scores.items(), key=lambda kv: kv[1])[0]


_SIGNAL_WEIGHTS: Dict[str, float] = {
    # Decisive, market-defining
    "OPEC supply cut": 1.0,
    "OPEC quota increase": 1.0,
    # Strong physical signals
    "Infrastructure attack": 0.9,
    "Export halt": 0.85,
    "Supply restored": 0.9,
    "SPR release": 0.85,
    "Inventory draw": 0.8,
    "Inventory build": 0.8,
    "Shipping interdiction": 0.8,
    "Sanctions relief": 0.85,
    # Sanctions on a major exporter are a decisive supply event, and belong
    # alongside their bearish mirror rather than with the vaguer
    # "conflict/war mentioned near oil" pattern, which stays at 0.7.
    "Sanctions imposed": 0.85,
    "Storage draw": 0.8,
    "Storage surplus": 0.8,
    # Real but slower-acting
    "Supply disruption risk": 0.7,
    # A chokepoint closing is as decisive as an attack on a refinery:
    # it removes real barrels from the water, not just sentiment.
    # Observed, not inferred: the headline states the direction rather than a
    # cause from which direction must be guessed. Weighted to clear the
    # dominance gate alone, because a stated price move should not be
    # overturned by the tone of the words around it.
    "Price action up": 0.85,
    "Price action down": 0.85,
    "Production disruption": 0.7,
    "Supply growth": 0.7,
    "De-escalation": 0.7,
    "Supply constraint": 0.7,
    "OPEC compliance slippage": 0.6,
    "Demand strengthening": 0.6,
    "Demand weakness": 0.6,
    "Macro demand risk": 0.6,
    # Curve structure -- observed, not forecast, and the market's own statement
    # about physical tightness. Weighted high for that reason.
    "Backwardation": 0.9,
    "Contango": 0.9,
    "Prompt spread firming": 0.7,
    "Prompt spread weakening": 0.7,
    "Storage economics": 0.7,
    # Agriculture. Stocks-to-use is the primary valuation anchor in grains and
    # WASDE is the largest scheduled volatility event in the ag calendar.
    "Stocks tightening": 0.9,
    "Stocks building": 0.9,
    "WASDE downgrade": 0.9,
    "WASDE upgrade": 0.9,
    "Crop conditions deteriorating": 0.7,
    "Crop conditions improving": 0.7,
    "Export demand strength": 0.6,
    "Export demand weakness": 0.6,
    # Industrial metals and the newly covered markets
    "Mine supply disruption": 0.9,
    "Mine supply growth": 0.9,
    "Exchange stock draw": 0.8,
    "Exchange stock build": 0.8,
    "Concentrate tightness": 0.7,
    "Concentrate surplus": 0.7,
    "China stimulus": 0.7,
    "China demand weakness": 0.7,
    "Electrification demand": 0.6,
    "Supply curtailment": 0.85,
    "Capacity additions": 0.85,
    "Export restriction": 0.85,
    "Export restriction lifted": 0.85,
    "Battery demand growth": 0.7,
    "Battery demand weakness": 0.7,
    "Lithium oversupply": 0.8,
    "Feedstock cost push": 0.8,
    "Feedstock cost relief": 0.8,
    "Plant curtailment": 0.85,
    "Indian tender demand": 0.6,
    "Crack spread widening": 0.9,
    "Crack spread narrowing": 0.9,
    "Refinery outage": 0.85,
    "Refinery runs rising": 0.85,
    "Product stock draw": 0.8,
    "Product stock build": 0.8,
    "Seasonal demand": 0.5,
    "Refining capacity additions": 0.6,
    "Freight rates rising": 0.8,
    "Freight rates falling": 0.8,
    "Chokepoint disruption": 0.9,
    # Mirror of the line above, which the freight rulebook has used since it
    # was written. Same weight, or the dominance gate tilts toward disruption.
    "Chokepoint flows normalise": 0.9,
    "Port congestion": 0.7,
    "Congestion easing": 0.7,
    "War risk premium": 0.7,
    "Fleet growth": 0.6,
    "Helium shortage": 0.85,
    "Helium surplus": 0.85,
    "Source supply risk": 0.8,
    "Supply tightness": 0.8,
    "Supply surplus": 0.8,
    "Technical demand": 0.5,
    "Demand substitution": 0.5,
    "Electronics demand": 0.6,
    "Electronics demand weakness": 0.6,
    "Petrochemical demand": 0.7,
    "Petrochemical demand weakness": 0.7,
    "NGL supply growth": 0.7,
    "Export constraint": 0.7,
    # Directionally suggestive, rarely decisive on its own
    "Adverse crop weather": 0.8,
    "Favourable crop weather": 0.8,
    "Heating demand surge": 0.8,
    "Weak heating demand": 0.8,
    "Gulf production shut-in": 0.85,
    "Refinery weather outage": 0.85,
    "Hydro shortfall": 0.7,
    "Cooling demand": 0.6,
    "Dollar weakness": 0.7,
    "Dollar strength": 0.7,
    "Growth-supportive macro": 0.7,
    "Growth downside risk": 0.7,
    "Safe-haven demand": 0.7,
    "Reduced defensive demand": 0.7,
    "Energy security support": 0.3,
    "Policy headwind": 0.4,
}


def signal_weight(signal: str) -> float:
    return _SIGNAL_WEIGHTS.get(signal, 1.0)


# Curve structure applies to every storable physical commodity, so it is defined
# once and merged into each rulebook rather than repeated eleven times.
#
# The forward curve is the market's own statement about physical tightness, and
# unlike a forecast it is OBSERVED. Backwardation means the spot market is
# bidding for barrels it cannot wait for; contango steep enough to pay storage
# means the opposite. This is the highest information-per-pattern signal
# available in commodities and the rulebook had none of it.
_CURVE_RULES: Dict[str, List[Dict[str, str]]] = {
    "bullish": [
        {"pattern": r"backwardat\w+", "signal": "Backwardation"},
                # A reported price move is DIRECT evidence of direction, which
                # is why it outweighs most inferred causes. Nothing read it
                # before: "Oil Prices Surge to Four-Month Highs as War Risks
                # Mount" scored NEUTRAL because the only rule that fired was the
                # war risk, and the word "surge" — the actual answer — was
                # visible to VADER only, which read the sentence as fearful.
                {"pattern": r"(oil|crude|brent|wti|price\w*|barrel)\w*.{0,30}(surg\w+|soar\w*|jump\w*|rall\w+|climb\w*|spike\w*|rose|ris\w*|gain\w*|top\w*|highest|multi[- ]?month high|\d+[- ]month high)", "signal": "Price action up"},
        {"pattern": r"(prompt|time|front)[- ]spread\w*.{0,24}(widen\w*|strengthen\w*|firm\w*)", "signal": "Prompt spread firming"},
        {"pattern": r"curve.{0,24}(flip\w*|mov\w+).{0,16}backwardat\w+", "signal": "Backwardation"},
    ],
    "bearish": [
        {"pattern": r"contango", "signal": "Contango"},
                # Mirror of Price action up. _MIRROR_PAIRS asserts equal weight.
                {"pattern": r"(oil|crude|brent|wti|price\w*|barrel)\w*.{0,30}(slump\w*|plunge\w*|tumbl\w+|slid\w*|sank|sink\w*|fall\w*|fell|drop\w*|declin\w+|lowest|multi[- ]?month low|\d+[- ]month low)", "signal": "Price action down"},
        {"pattern": r"(floating storage|storage economics|carry trade)", "signal": "Storage economics"},
        {"pattern": r"(prompt|time|front)[- ]spread\w*.{0,24}(collaps\w+|weaken\w*|narrow\w*)", "signal": "Prompt spread weakening"},
    ],
}


# Commodities where a forward curve exists and the language is used. Excluded:
# forex, macro and weather, which have no storage economics.
_CURVE_APPLIES = (
    "oil", "gas", "wheat", "corn", "copper", "lithium", "uranium",
    "silver", "gold", "refined_products", "lpg", "fertilizer", "tin",
)


def _merge_curve_rules(book: Dict[str, Dict[str, List[Dict[str, str]]]]) -> Dict[str, Dict[str, List[Dict[str, str]]]]:
    """Attach the shared curve rules to every commodity that has a curve."""
    for name in _CURVE_APPLIES:
        entry = book.get(name)
        if not entry:
            continue
        for side in ("bullish", "bearish"):
            entry[side] = list(entry.get(side, [])) + list(_CURVE_RULES[side])
    return book


# Weather and macro are MODIFIERS, not commodities.
#
# They sat in the rulebook alongside oil and gold with fixed directional signs,
# but neither has a direction of its own -- only a direction with respect to a
# commodity:
#
#                  wheat / corn      natural gas         gold
#   drought        bullish (yield)   bullish (hydro)     --
#   cold snap      ~neutral          bullish (heating)   --
#   warm winter    ~neutral          BEARISH             --
#   hurricane      --                bullish (shut-ins)  --
#   strong dollar  bearish           bearish             BEARISH
#   recession      bearish (demand)  bearish             BULLISH (safe haven)
#
# A single sign per event is wrong for at least one market in every row. The
# handoff already recorded the symptom -- drought scored -0.07, hurricane -0.07,
# both wrong for wheat.
#
# These merge into each commodity's book with that commodity's sign, the same
# way curve rules do. The standalone "weather" and "macro" books are kept only
# as a fallback for articles that resolve to no real commodity.
_WEATHER_MODIFIERS: Dict[str, Dict[str, List[Dict[str, str]]]] = {
    "wheat": {
        "bullish": [{"pattern": r"(drought|heatwave|frost|freeze|flood|excessive rain|dry spell)", "signal": "Adverse crop weather"}],
        "bearish": [{"pattern": r"(timely rain|favou?rable weather|beneficial rain|ideal conditions)", "signal": "Favourable crop weather"}],
    },
    "corn": {
        "bullish": [{"pattern": r"(drought|heatwave|frost|freeze|flood|excessive rain|dry spell)", "signal": "Adverse crop weather"}],
        "bearish": [{"pattern": r"(timely rain|favou?rable weather|beneficial rain|ideal conditions)", "signal": "Favourable crop weather"}],
    },
    "gas": {
        "bullish": [
            {"pattern": r"(cold snap|arctic|polar vortex|freeze|winter storm|colder[- ]than[- ]normal|below[- ]normal temperatures?)", "signal": "Heating demand surge"},
            {"pattern": r"(hurricane|tropical storm).{0,30}(gulf|offshore|platform|shut[- ]?in)", "signal": "Gulf production shut-in"},
            # Verb order varies ("drought cut hydro output" vs "hydro output fell
            # on drought"), so anchor on the two nouns co-occurring rather than
            # on a verb between them.
            {"pattern": r"(drought|low water|dry conditions).{0,40}(hydro|reservoir)", "signal": "Hydro shortfall"},
            {"pattern": r"(hydro|reservoir).{0,40}(drought|low water|dry conditions)", "signal": "Hydro shortfall"},
            {"pattern": r"(heatwave|hotter[- ]than[- ]normal).{0,26}(power|cooling|electricity|burn)", "signal": "Cooling demand"},
        ],
        "bearish": [
            {"pattern": r"(mild|warm|warmer[- ]than[- ]normal|above[- ]normal temperatures?).{0,24}(winter|weather|forecast)", "signal": "Weak heating demand"},
        ],
    },
    "oil": {
        "bullish": [
            {"pattern": r"(hurricane|tropical storm).{0,30}(gulf|offshore|platform|refinery|shut[- ]?in|evacuat\w+)", "signal": "Gulf production shut-in"},
        ],
        "bearish": [],
    },
    "refined_products": {
        "bullish": [
            {"pattern": r"(hurricane|freeze|winter storm).{0,30}(refinery|refineries|gulf coast)", "signal": "Refinery weather outage"},
        ],
        "bearish": [],
    },
}


# Macro modifiers. The dollar leg is the important one: commodities are priced
# in USD, so dollar strength is a headwind for ALL of them -- not only for the
# metals where it happened to be coded.
_MACRO_MODIFIERS: Dict[str, Dict[str, List[Dict[str, str]]]] = {
    "_usd_priced": {
        "bullish": [{"pattern": r"(dollar|usd|greenback).{0,20}(weak\w*|fall\w*|fell|declin\w+|slid\w*|softer)", "signal": "Dollar weakness"}],
        "bearish": [{"pattern": r"(dollar|usd|greenback).{0,20}(strong\w*|strengthen\w*|rall\w+|rose|ris\w*|firmer)", "signal": "Dollar strength"}],
    },
    "_cyclical": {
        # Growth-sensitive: industrial metals, energy, freight.
        "bullish": [{"pattern": r"(soft landing|stimulus|pmi.{0,16}(expand\w*|beat)|growth.{0,16}(accelerat\w+|beat))", "signal": "Growth-supportive macro"}],
        "bearish": [{"pattern": r"(recession|hard landing|demand destruction|pmi.{0,16}(contract\w+|miss))", "signal": "Growth downside risk"}],
    },
    "_defensive": {
        # Gold and silver invert the cyclical leg: a recession brings rate cuts.
        "bullish": [{"pattern": r"(recession|hard landing|risk[- ]off|flight to safety)", "signal": "Safe-haven demand"}],
        "bearish": [{"pattern": r"(risk[- ]on|soft landing|strong payrolls)", "signal": "Reduced defensive demand"}],
    },
}


_USD_PRICED = ("oil", "gas", "gold", "silver", "copper", "wheat", "corn",
               "uranium", "lithium", "tin", "refined_products", "lpg",
               "fertilizer", "coltan", "helium")


_CYCLICAL = ("oil", "copper", "lithium", "tin", "freight", "refined_products", "lpg")


_DEFENSIVE = ("gold", "silver")


def _merge_modifier_rules(book: Dict[str, Dict[str, List[Dict[str, str]]]]) -> Dict[str, Dict[str, List[Dict[str, str]]]]:
    """Attach weather and macro modifiers with each commodity's own sign."""

    def attach(name: str, rules: Dict[str, List[Dict[str, str]]]) -> None:
        entry = book.get(name)
        if not entry:
            return
        for side in ("bullish", "bearish"):
            entry[side] = list(entry.get(side, [])) + list(rules.get(side, []))

    for name, rules in _WEATHER_MODIFIERS.items():
        attach(name, rules)
    for name in _USD_PRICED:
        attach(name, _MACRO_MODIFIERS["_usd_priced"])
    for name in _CYCLICAL:
        attach(name, _MACRO_MODIFIERS["_cyclical"])
    for name in _DEFENSIVE:
        attach(name, _MACRO_MODIFIERS["_defensive"])
    return book


def get_commodity_rulebook() -> Dict[str, Dict[str, List[Dict[str, str]]]]:
    """Commodity-specific directional rules layered on top of VADER tone."""
    return _merge_modifier_rules(_merge_curve_rules({
        "oil": {
            "bullish": [
                {"pattern": r"opec\+?.{0,20}(cut\w*|reduce|curb)", "signal": "OPEC supply cut"},
                {"pattern": r"(inventor\w+|stockpile\w*).{0,26}(draw\w*|drew|drawdown|drop\w*|fall\w*|fell|declin\w+)", "signal": "Inventory draw"},
                # The trailing group was optional, so a bare mention of "sanctions"
                # matched -- including "sanctions on crude exports were eased",
                # which is the bearish case. Imposition language is now required,
                # and relief is handled by the "Sanctions relief" rule below.
                {"pattern": r"(sanctions?|embargo)\w*.{0,30}(impos\w+|tighten\w*|expand\w*\w*|widen\w*|announc\w+|new)", "signal": "Sanctions imposed"},
                {"pattern": r"(impos\w+|tighten\w*|expand\w*\w*|widen\w*).{0,30}(sanctions?|embargo)", "signal": "Sanctions imposed"},
                {"pattern": r"(conflict|war|hostilit\w+|geopolitical|military action).{0,30}(oil|crude|shipping|export|supply|risk\w*|premium)", "signal": "Supply disruption risk"},
                # Same event with the commodity first. Headlines lead with the
                # price move at least as often as with the cause ("Oil surges as
                # war risks mount"), and the pattern above matched none of them.
                {"pattern": r"(oil|crude|brent|wti|price\w*).{0,40}(war|conflict|hostilit\w+|geopolitical|military action|attack\w*)", "signal": "Supply disruption risk"},
                {"pattern": r"(hurricane|storm|outage|disruption).{0,24}(production|supply|export|offshore)?", "signal": "Production disruption"},
                # Kinetic supply disruption. The rulebook's vocabulary was
                # war/conflict/sanctions/embargo/hurricane/storm/outage/disruption,
                # none of which appear in a story that says a refinery was
                # "hit in a new attack" and "struck again". A physical strike on
                # export infrastructure is the most direct bullish-crude event
                # there is, and nothing matched it.
                #
                # Anchored to infrastructure nouns in both directions, because
                # bare "attack" is far too broad — "attack on inflation" must
                # not read as a supply shock.
                {"pattern": r"(attack|attacked|strike|struck|drone|missile|shelling|sabotage|explosion|blast)\w*.{0,40}(refinery|refineries|pipeline|terminal|tanker|vessel|facilit\w*|oilfield|oil field|port|depot|infrastructure|installation\w*|energy site\w*|energy asset\w*|processing plant|pumping station|export)", "signal": "Infrastructure attack"},
                {"pattern": r"(refinery|refineries|pipeline|terminal|tanker|vessel|facilit\w+|oilfield|oil field|port|depot|infrastructure|installation\w*|energy site\w*|energy asset\w*).{0,40}(attack|struck|hit|damaged|ablaze|sabotage|offline|shut in)", "signal": "Infrastructure attack"},
                {"pattern": r"(blockade|seiz\w+|impound\w*|detain\w*).{0,30}(tanker|vessel|ship|cargo|export|shipment)", "signal": "Shipping interdiction"},
                # Chokepoints. A named waterway carrying less than usual is a
                # supply event whatever verb the wire chose, and no rule knew
                # what Hormuz was — so "Hormuz Tanker Traffic Slumps" scored on
                # tone alone and came out bearish for crude.
                {"pattern": r"(hormuz|suez|bab el[- ]?mandeb|malacca|bosphorus|dardanelles|panama canal|red sea|strait|chokepoint).{0,44}(slump\w*|fall\w*|fell|drop\w*|plunge\w*|halt\w*|clos\w+|block\w*|disrupt\w*|divert\w*|avoid\w*|reroute\w*|suspend\w*|down \d)", "signal": "Chokepoint disruption"},
                {"pattern": r"(traffic|transit\w*|flow\w*|shipment\w*|voyage\w*|passage).{0,30}(hormuz|suez|bab el[- ]?mandeb|malacca|red sea|strait|canal).{0,30}(slump\w*|fall\w*|fell|drop\w*|plunge\w*|halt\w*|disrupt\w*|down \d)", "signal": "Chokepoint disruption"},
                {"pattern": r"(export|shipment|loading|output|production).{0,24}(halt\w*\w*|suspend\w*|stopp?\w*|curtail\w*)", "signal": "Export halt"},
                {"pattern": r"demand.{0,18}(ris\w*|rose|strong\w*|strengthen\w*|increas\w+|recover\w*)", "signal": "Demand strengthening"},
                # Demand as a flow. A refiner does not "demand" crude in a
                # headline — it buys, imports or lifts it.
                {"pattern": r"(import\w*|buying|purchas\w+|lifting\w*|intake|appetite|consumption|refinery runs).{0,26}(ris\w*|rose|rebound\w*|jump\w*|surg\w+|climb\w*|grew|grow\w*|increas\w+|recover\w*|strong\w*)", "signal": "Demand strengthening"}
            ],
            "bearish": [
                {"pattern": r"(production|output|supply).{0,18}(ris\w*|rose|increas\w+|boost\w*|grow\w*|grew)", "signal": "Supply growth"},
                {"pattern": r"(inventor\w+|stockpile\w*).{0,26}(build\w*|built|ris\w*|rose|increas\w+|surplus)", "signal": "Inventory build"},
                {"pattern": r"demand.{0,18}(slow\w*|weak\w*|fall\w*|fell|declin\w+)", "signal": "Demand weakness"},
                # Mirror of the flow rule above. Both sides get the same
                # vocabulary or the dominance gate tilts — see _MIRROR_PAIRS.
                {"pattern": r"(import\w*|buying|purchas\w+|lifting\w*|intake|appetite|consumption|refinery runs).{0,26}(fall\w*|fell|slump\w*|slid\w*|drop\w*|declin\w+|weaken\w*|slow\w*)", "signal": "Demand weakness"},
                {"pattern": r"(recession|slowdown|demand destruction)", "signal": "Macro demand risk"},
                # Mirror vocabulary for the kinetic/geopolitical patterns above.
                # Without these the bullish side had nine patterns against four,
                # and because the dominance gate reads accumulated evidence, an
                # unbalanced rulebook is a directional prior nobody chose.
                # Every bullish disruption rule now has a bearish inverse.
                {"pattern": r"(spr|strategic petroleum reserve|strategic reserve).{0,30}(release|sale|draw\w*|drew|tap)", "signal": "SPR release"},
                {"pattern": r"(release|sale|tap\w*).{0,30}(spr|strategic petroleum reserve|strategic reserve)", "signal": "SPR release"},
                {"pattern": r"(sanctions?|embargo).{0,30}(lift\w*|eas\w+|waiv\w+|relax\w*|suspend\w*)", "signal": "Sanctions relief"},
                {"pattern": r"(waiver|exemption)\w*.{0,30}(oil|crude|export|barrel)", "signal": "Sanctions relief"},
                {"pattern": r"(ceasefire|cease-fire|truce|peace deal|de-escalat\w+|deescalat\w+)", "signal": "De-escalation"},
                # Mirror of Chokepoint disruption. _MIRROR_PAIRS asserts the
                # two weigh the same; a one-sided addition tilts the gate.
                {"pattern": r"(hormuz|suez|bab el[- ]?mandeb|malacca|bosphorus|panama canal|red sea|strait|chokepoint).{0,44}(reopen\w*|resum\w+|normalis\w+|normaliz\w+|recover\w*|rebound\w*|restor\w+|return\w*|rose|ris\w*|climb\w*)", "signal": "Chokepoint flows normalise"},
                {"pattern": r"(refinery|refineries|pipeline|terminal|field|port|output|export)\w*.{0,40}(restart\w*|resum\w+|back online|repaired|restored|reopen\w*)", "signal": "Supply restored"},
                {"pattern": r"(restart\w*|resum\w+|reopen\w*|restor\w+).{0,40}(refinery|refineries|pipeline|terminal|production|output|export)", "signal": "Supply restored"},
                {"pattern": r"opec\+?.{0,30}(raise|increas\w+|boost\w*|unwind\w*|ease|hike).{0,20}(quota|output|production|target)?", "signal": "OPEC quota increase"},
                {"pattern": r"(quota|compliance).{0,24}(breach\w*|slip\w*|overproduc\w+|exceed\w*)", "signal": "OPEC compliance slippage"}
            ]
        },
        "gas": {
            "bullish": [
                {"pattern": r"(cold|freeze|arctic|winter storm)", "signal": "Heating demand surge"},
                {"pattern": r"(storage|inventor\w+).{0,26}(draw\w*|drew|drawdown|drop\w*|below)", "signal": "Storage draw"},
                {"pattern": r"(lng|pipeline).{0,18}(outage|disruption|constraint)", "signal": "Supply constraint"}
            ],
            "bearish": [
                {"pattern": r"(warm|mild).{0,18}(weather|winter)", "signal": "Weak heating demand"},
                {"pattern": r"(storage|inventor\w+).{0,26}(build\w*|built|surplus|above|glut)", "signal": "Storage surplus"},
                {"pattern": r"production.{0,18}(ris\w*|rose|increas\w+|record)", "signal": "Production increase"}
            ]
        },
        "gold": {
            "bullish": [
                {"pattern": r"(rate cut\w*|cuts rates|dovish|lower yields|yield fall\w*|fell|yield drops?)", "signal": "Lower real-rate pressure"},
                {"pattern": r"(inflation|cpi).{0,18}(ris\w*|rose|hot|sticky)", "signal": "Inflation hedge demand"},
                {"pattern": r"(geopolitical|conflict|war|safe[- ]haven)", "signal": "Safe-haven demand"},
                {"pattern": r"(dollar|usd).{0,18}(weak\w*|falls?|declines?)", "signal": "Dollar weakness"}
            ],
            "bearish": [
                {"pattern": r"(rate hike|hawkish|higher yields|yield ris\w*|rose|yield jumps?)", "signal": "Higher yield pressure"},
                {"pattern": r"(dollar|usd).{0,18}(strong\w*|strengthen\w*|rall(y|ies)|rises?)", "signal": "Dollar strength"},
                {"pattern": r"(risk-on|equities rally|strong\w*|strengthen\w* payrolls|strong\w*|strengthen\w* growth)", "signal": "Reduced defensive demand"}
            ]
        },
        "silver": {
            "bullish": [
                {"pattern": r"(rate cut\w*|dovish|lower yields)", "signal": "Lower-rate support"},
                {"pattern": r"(solar|electronics|industrial demand).{0,18}(ris\w*|rose|strong\w*|strengthen\w*|increas\w+)", "signal": "Industrial demand strength"},
                {"pattern": r"(dollar|usd).{0,18}(weak\w*|falls?|declines?)", "signal": "Dollar weakness"}
            ],
            "bearish": [
                {"pattern": r"(rate hike|hawkish|higher yields)", "signal": "Higher-rate pressure"},
                {"pattern": r"(industrial|manufacturing).{0,18}(slowdown|weakness|contract)", "signal": "Industrial demand weakness"},
                {"pattern": r"(dollar|usd).{0,18}(strong\w*|strengthen\w*|rises?)", "signal": "Dollar strength"}
            ]
        },
        "uranium": {
            "bullish": [
                {"pattern": r"(nuclear|reactor|smr|small modular reactor).{0,24}(build\w*|built|approval|restart|expand\w*)", "signal": "Nuclear demand growth"},
                {"pattern": r"(uranium|fuel supply).{0,24}(shortage|tight|disruption|sanction)", "signal": "Fuel supply tightening"},
                {"pattern": r"(energy security|baseload power)", "signal": "Energy security support"}
            ],
            "bearish": [
                {"pattern": r"(nuclear|reactor).{0,24}(delay|shutdown|closure|cancel)", "signal": "Reactor demand delay"},
                {"pattern": r"(uranium|fuel supply).{0,24}(surplus|glut|oversupply)", "signal": "Fuel oversupply"},
                {"pattern": r"(regulatory|policy).{0,24}(pushback|block|ban|banned|bans)", "signal": "Policy headwind"}
            ]
        },
        "forex": {
            "bullish": [
                {"pattern": r"(hawkish fed|rate hike|higher yields|dollar strength|usd rally)", "signal": "Dollar-positive macro"},
                {"pattern": r"(safe[- ]haven|risk-off|flight to quality)", "signal": "Defensive FX bid"},
                {"pattern": r"(ecb|boj|boe).{0,24}(dovish|cut\w*|ease)", "signal": "Foreign central-bank easing"}
            ],
            "bearish": [
                {"pattern": r"(dovish fed|rate cut\w*|lower yields|dollar weakness|usd falls?)", "signal": "Dollar-negative macro"},
                {"pattern": r"(risk-on|carry trade|growth rebound)", "signal": "Risk-on FX rotation"},
                {"pattern": r"(ecb|boj|boe).{0,24}(hawkish|hike|tighten)", "signal": "Foreign central-bank support"}
            ]
        },
        "bitcoin": {
            "bullish": [
                {"pattern": r"(etf|spot etf).{0,18}(inflow|approval|demand)", "signal": "ETF demand"},
                {"pattern": r"(rate cut\w*|liquidity|easing|dovish)", "signal": "Liquidity tailwind"},
                {"pattern": r"(institutional|adoption|treasury).{0,18}(buy|demand|allocation)", "signal": "Institutional adoption"}
            ],
            "bearish": [
                {"pattern": r"(sec|regulator|crackdown|ban|banned|bans|lawsuit)", "signal": "Regulatory pressure"},
                {"pattern": r"(hack|liquidation|outflow)", "signal": "Market stress"},
                {"pattern": r"(rate hike|higher yields|tightening)", "signal": "Liquidity headwind"}
            ]
        },
        "wheat": {
            "bullish": [
                {"pattern": r"(drought|flood|freeze|frost|heatwave)", "signal": "Crop risk"},
                {"pattern": r"(export ban|banned|bans|supply shortage|crop damage)", "signal": "Supply tightening"},
                {"pattern": r"(yield|harvest).{0,18}(fall\w*|fell|drop\w*|miss\w*)", "signal": "Weak harvest outlook"},
                # Stocks-to-use is the primary valuation anchor in grains and
                # the rulebook had no inventory rules for ags at all -- only
                # weather and harvest -- while oil and gas both had them.
                {"pattern": r"(ending stocks?|carryout|stocks?[- ]to[- ]use|grain stocks?).{0,26}(fall\w*|fell|drop\w*|declin\w+|tighten\w*|below|cut\w*)", "signal": "Stocks tightening"},
                {"pattern": r"(wasde|usda).{0,30}(cut\w*|lower\w*|reduc\w+).{0,20}(yield|production|stocks?|acreage)", "signal": "WASDE downgrade"},
                {"pattern": r"(crop conditions?|good[- ]to[- ]excellent|good/excellent).{0,24}(fall\w*|fell|drop\w*|declin\w+|deteriorat\w+|worsen\w*)", "signal": "Crop conditions deteriorating"},
                {"pattern": r"(export sales?|export inspections?).{0,24}(strong\w*|strengthen\w*|surge\w*|surging|jump\w*|beat)", "signal": "Export demand strength"},
            ],
            "bearish": [
                {"pattern": r"(bumper crop|record harvest|strong\w*|strengthen\w* yield)", "signal": "Strong harvest"},
                {"pattern": r"(export|supply).{0,18}(increas\w+|recover\w*)", "signal": "Supply recovery"},
                {"pattern": r"(rainfall|weather).{0,18}(improv\w+|favorable)", "signal": "Improving crop conditions"},
                {"pattern": r"(ending stocks?|carryout|stocks?[- ]to[- ]use|grain stocks?).{0,26}(ris\w*|rose|build\w*|built|increas\w+|above|ample|raise\w*)", "signal": "Stocks building"},
                {"pattern": r"(wasde|usda).{0,30}(rais\w+|increas\w+|higher).{0,20}(yield|production|stocks?|acreage)", "signal": "WASDE upgrade"},
                {"pattern": r"(crop conditions?|good[- ]to[- ]excellent|good/excellent).{0,24}(ris\w*|rose|improv\w+|better)", "signal": "Crop conditions improving"},
                {"pattern": r"(export sales?|export inspections?).{0,24}(weak\w*|slow\w*|disappoint\w*|fall\w*|fell)", "signal": "Export demand weakness"},
            ]
        },
        "corn": {
            "bullish": [
                {"pattern": r"(drought|heatwave|crop stress|yield loss)", "signal": "Crop stress"},
                {"pattern": r"(ethanol demand|export sales).{0,18}(ris\w*|rose|strong\w*|strengthen\w*)", "signal": "Demand support"},
                {"pattern": r"(ending stocks?|carryout|stocks?[- ]to[- ]use|grain stocks?).{0,26}(fall\w*|fell|drop\w*|declin\w+|tighten\w*|below|cut\w*)", "signal": "Stocks tightening"},
                {"pattern": r"(wasde|usda).{0,30}(cut\w*|lower\w*|reduc\w+).{0,20}(yield|production|stocks?|acreage)", "signal": "WASDE downgrade"},
                {"pattern": r"(crop conditions?|good[- ]to[- ]excellent|good/excellent).{0,24}(fall\w*|fell|drop\w*|declin\w+|deteriorat\w+)", "signal": "Crop conditions deteriorating"},
            ],
            "bearish": [
                {"pattern": r"(record crop|strong\w*|strengthen\w* yield|ample supply)", "signal": "Ample supply"},
                {"pattern": r"(rainfall|weather).{0,18}(improv\w+|favorable)", "signal": "Improving crop conditions"},
                {"pattern": r"(ending stocks?|carryout|stocks?[- ]to[- ]use|grain stocks?).{0,26}(ris\w*|rose|build\w*|built|increas\w+|above|ample|raise\w*)", "signal": "Stocks building"},
                {"pattern": r"(wasde|usda).{0,30}(rais\w+|increas\w+|higher).{0,20}(yield|production|stocks?|acreage)", "signal": "WASDE upgrade"},
                {"pattern": r"(crop conditions?|good[- ]to[- ]excellent|good/excellent).{0,24}(ris\w*|rose|improv\w+|better)", "signal": "Crop conditions improving"},
            ]
        },
        "macro": {
            "bullish": [
                {"pattern": r"(soft landing|rate cut\w*|disinflation|stimulus)", "signal": "Growth-supportive macro"},
                {"pattern": r"(cpi|inflation).{0,18}(cool|ease|slow\w*)", "signal": "Cooling inflation"}
            ],
            "bearish": [
                {"pattern": r"(recession|slowdown|hard landing)", "signal": "Growth downside risk"},
                {"pattern": r"(cpi|inflation).{0,18}(hot|sticky|ris\w*|rose)", "signal": "Inflation pressure"},
                {"pattern": r"(hawkish|rate hike|tightening)", "signal": "Tighter policy"}
            ]
        },
        "weather": {
            "bullish": [
                {"pattern": r"(hurricane|storm|drought|flood|freeze|heatwave)", "signal": "Weather event risk"},
                {"pattern": r"(forecast|models?).{0,18}(worsen|intensif(y|ies))", "signal": "Forecast deterioration"}
            ],
            "bearish": [
                {"pattern": r"(forecast|models?).{0,18}(improv\w+|moderate|weaken)", "signal": "Forecast improvement"},
                {"pattern": r"(storm|hurricane).{0,18}(downgrade|dissipate)", "signal": "Event weakening"}
            ]
        },
        # ---------------------------------------------------------------
        # Markets the archive has always classified and the rulebook could
        # not speak about. topic_taxonomy sorts articles into 39 topics;
        # this book covered 11, so the other 28 were scored on prose tone
        # alone -- the mechanism that read a refinery attack as 93% bearish.
        # ---------------------------------------------------------------
        "copper": {
            "bullish": [
                {"pattern": r"(mine|mining|smelter).{0,30}(strike|halt\w*\w*|disrupt\w+|landslide|outage|force majeure)", "signal": "Mine supply disruption"},
                {"pattern": r"(lme|shfe|comex|exchange).{0,26}(stocks?|inventor\w+).{0,20}(fall\w*|fell|drop\w*|draw\w*|drew|declin\w+|low)", "signal": "Exchange stock draw"},
                {"pattern": r"(grid|electrification|ev|data cent\w+|renewable).{0,26}(demand|build\w*|built[- ]?out|investment)", "signal": "Electrification demand"},
                {"pattern": r"(treatment charge|tc/rc|spot tc).{0,24}(fall\w*|fell|drop\w*|collaps\w+|negative)", "signal": "Concentrate tightness"},
                {"pattern": r"(china|chinese).{0,24}(stimulus|infrastructure|property support)", "signal": "China stimulus"},
            ],
            "bearish": [
                {"pattern": r"(lme|shfe|comex|exchange).{0,26}(stocks?|inventor\w+).{0,20}(ris\w*|rose|build\w*|built|surge\w*|surging|climb\w*)", "signal": "Exchange stock build"},
                {"pattern": r"(mine|smelter).{0,26}(expansion|ramp[- ]?up|restart\w*|new supply)", "signal": "Mine supply growth"},
                {"pattern": r"(china|chinese).{0,26}(pmi|property|construction).{0,20}(weak\w*|contract\w+|slump|fall\w*|fell)", "signal": "China demand weakness"},
                {"pattern": r"(treatment charge|tc/rc).{0,24}(ris\w*|rose|increas\w+|widen)", "signal": "Concentrate surplus"},
            ]
        },
        "lithium": {
            "bullish": [
                {"pattern": r"(ev|battery|cathode|gigafactory).{0,26}(demand|sales|output).{0,18}(ris\w*|rose|strong\w*|strengthen\w*|record|surge\w*|surging)", "signal": "Battery demand growth"},
                {"pattern": r"(mine|spodumene|brine|refinery).{0,30}(curtail\w+|suspend\w*|halt\w*\w*|closure|care and maintenance)", "signal": "Supply curtailment"},
                {"pattern": r"(export|permit|licence|license).{0,24}(restrict\w+|ban|banned|bans|suspend\w*)", "signal": "Export restriction"},
            ],
            "bearish": [
                {"pattern": r"(oversupply|glut|surplus).{0,24}(lithium|carbonate|hydroxide|spodumene)?", "signal": "Lithium oversupply"},
                {"pattern": r"(new|additional).{0,20}(capacity|supply|project).{0,20}(online|start|ramp)", "signal": "Capacity additions"},
                {"pattern": r"(ev|battery).{0,26}(demand|sales).{0,18}(slow\w*|weak\w*|fall\w*|fell|miss\w*|disappoint)", "signal": "Battery demand weakness"},
            ]
        },
        "fertilizer": {
            "bullish": [
                {"pattern": r"(gas|feedstock|energy).{0,24}(cost|price).{0,18}(ris\w*|rose|surge\w*|surging|spike|higher)", "signal": "Feedstock cost push"},
                {"pattern": r"(urea|ammonia|potash|phosphate|nitrogen).{0,26}(plant|producer).{0,24}(halt\w*\w*|curtail\w+|shut|outage)", "signal": "Plant curtailment"},
                {"pattern": r"(export).{0,20}(ban|banned|bans|restrict\w+|quota|tariff|tax).{0,24}(urea|fertili[sz]er|potash|phosphate)?", "signal": "Export restriction"},
                {"pattern": r"(india|indian).{0,20}tender", "signal": "Indian tender demand"},
                {"pattern": r"sanctions?.{0,26}(potash|belarus|fertili[sz]er)", "signal": "Sanctions imposed"},
            ],
            "bearish": [
                {"pattern": r"(gas|feedstock|energy).{0,24}(cost|price).{0,18}(fall\w*|fell|drop\w*|declin\w+|lower)", "signal": "Feedstock cost relief"},
                {"pattern": r"(urea|ammonia|potash|phosphate|nitrogen).{0,26}(capacity|supply|output).{0,20}(ris\w*|rose|expand\w*|ramp|restart)", "signal": "Capacity additions"},
                {"pattern": r"(export).{0,20}(quota|ban|banned|bans|restrict\w+).{0,20}(lift\w*|eas\w+|relax\w*|remov\w+)", "signal": "Export restriction lifted"},
                {"pattern": r"(affordability|demand destruction|application rates?).{0,24}(fall\w*|fell|weak\w*|cut\w*)", "signal": "Demand weakness"},
            ]
        },
        "refined_products": {
            # Products move INVERSELY to crude on a refinery outage: crude that
            # cannot be processed backs up while product supply tightens. This
            # is why they need their own book rather than inheriting oil's.
            "bullish": [
                {"pattern": r"(crack spread|refining margin|product margin).{0,24}(widen\w*|surge\w*|surging|strengthen\w*|ris\w*|rose)", "signal": "Crack spread widening"},
                {"pattern": r"(refinery|refineries).{0,30}(outage|fire|shut\w*|unplanned|run cut\w*|turnaround)", "signal": "Refinery outage"},
                {"pattern": r"(gasoline|diesel|distillate|jet).{0,26}(stocks?|inventor\w+).{0,20}(draw\w*|drew|fall\w*|fell|drop\w*|tight)", "signal": "Product stock draw"},
                {"pattern": r"(driving season|summer demand|heating oil demand).{0,20}(strong\w*|strengthen\w*|ris\w*|rose|peak)?", "signal": "Seasonal demand"},
            ],
            "bearish": [
                {"pattern": r"(crack spread|refining margin|product margin).{0,24}(narrow\w*|collaps\w+|weaken\w*|fall\w*|fell)", "signal": "Crack spread narrowing"},
                {"pattern": r"(refinery|refineries).{0,30}(restart\w*|return\w*|ramp\w*|utili[sz]ation.{0,12}(ris\w*|rose|high))", "signal": "Refinery runs rising"},
                {"pattern": r"(gasoline|diesel|distillate|jet).{0,26}(stocks?|inventor\w+).{0,20}(build\w*|built|ris\w*|rose|surplus)", "signal": "Product stock build"},
                {"pattern": r"(new|additional).{0,20}refin\w+.{0,20}(capacity|complex|unit)", "signal": "Refining capacity additions"},
            ]
        },
        "freight": {
            "bullish": [
                {"pattern": r"(tanker|freight|charter|dry bulk|baltic dry).{0,24}(rate|index).{0,18}(ris\w*|rose|surge\w*|surging|jump\w*|spike)", "signal": "Freight rates rising"},
                {"pattern": r"(congestion|queue|delay|waiting time).{0,24}(port|canal|terminal|strait)?", "signal": "Port congestion"},
                {"pattern": r"(suez|panama canal|hormuz|bab[- ]el[- ]mandeb|red sea|turkish straits|bosphorus).{0,30}(closur\w+|restrict\w+|divert\w+|attack\w*|block\w*|draft)", "signal": "Chokepoint disruption"},
                {"pattern": r"war risk premium", "signal": "War risk premium"},
            ],
            "bearish": [
                {"pattern": r"(tanker|freight|charter|dry bulk|baltic dry).{0,24}(rate|index).{0,18}(fall\w*|fell|drop\w*|slump|declin\w+)", "signal": "Freight rates falling"},
                {"pattern": r"(newbuild|new vessel|fleet).{0,24}(deliver\w+|growth|order book)", "signal": "Fleet growth"},
                {"pattern": r"(congestion|queue|backlog).{0,24}(eas\w+|clear\w*|resolv\w+)", "signal": "Congestion easing"},
            ]
        },
        "tin": {
            "bullish": [
                {"pattern": r"(myanmar|wa state|indonesia\w*).{0,30}(ban|banned|bans|suspend\w*|halt\w*\w*|licence|license|permit|export)", "signal": "Export restriction"},
                {"pattern": r"(lme).{0,24}tin.{0,20}(stocks?|inventor\w+).{0,18}(fall\w*|fell|low|draw\w*|drew)", "signal": "Exchange stock draw"},
                {"pattern": r"(solder|semiconductor|electronics).{0,24}demand.{0,16}(ris\w*|rose|strong\w*|strengthen\w*|recover\w*)", "signal": "Electronics demand"},
            ],
            "bearish": [
                {"pattern": r"(smelter|mine).{0,26}(restart\w*|resum\w+|ramp\w*|export.{0,12}resum\w+)", "signal": "Supply restored"},
                {"pattern": r"(lme).{0,24}tin.{0,20}(stocks?|inventor\w+).{0,18}(ris\w*|rose|build\w*|built)", "signal": "Exchange stock build"},
                {"pattern": r"(electronics|semiconductor).{0,24}(demand|orders?).{0,18}(weak\w*|fall\w*|fell|slow\w*)", "signal": "Electronics demand weakness"},
            ]
        },
        "helium": {
            "bullish": [
                {"pattern": r"(helium).{0,30}(shortage|rationing|allocation|force majeure|outage)", "signal": "Helium shortage"},
                {"pattern": r"(qatar|algeria|russia\w*|amur|blm).{0,30}(outage|delay|halt\w*\w*|maintenance|export)", "signal": "Source supply risk"},
                {"pattern": r"(semiconductor|mri|fibre optic|fiber optic).{0,24}demand", "signal": "Technical demand"},
            ],
            "bearish": [
                {"pattern": r"(new|additional).{0,24}helium.{0,20}(plant|capacity|project|supply)", "signal": "Capacity additions"},
                {"pattern": r"(helium).{0,24}(surplus|oversupply|ample)", "signal": "Helium surplus"},
                {"pattern": r"(recycl\w+|conservation|substitut\w+).{0,24}helium", "signal": "Demand substitution"},
            ]
        },
        "lpg": {
            "bullish": [
                {"pattern": r"(propane|butane|lpg|ngl).{0,26}(stocks?|inventor\w+).{0,20}(draw\w*|drew|fall\w*|fell|tight|below)", "signal": "Inventory draw"},
                {"pattern": r"(petrochemical|cracker|pdh).{0,26}(demand|feedstock|margin).{0,18}(ris\w*|rose|strong\w*|strengthen\w*|improv\w+)", "signal": "Petrochemical demand"},
                {"pattern": r"(export terminal|loading|dock).{0,26}(constraint|full|outage|delay)", "signal": "Export constraint"},
            ],
            "bearish": [
                {"pattern": r"(propane|butane|lpg|ngl).{0,26}(stocks?|inventor\w+).{0,20}(build\w*|built|ris\w*|rose|surplus|above)", "signal": "Inventory build"},
                {"pattern": r"(ngl|gas processing).{0,26}(output|production).{0,18}(ris\w*|rose|record|increas\w+)", "signal": "NGL supply growth"},
                {"pattern": r"(cracker|pdh|petrochemical).{0,26}(shut\w*|idle|margin.{0,12}(weak\w*|negative))", "signal": "Petrochemical demand weakness"},
            ]
        },
        "coltan": {
            # Tantalum-niobium ore. Sits under critical minerals rather than
            # rare earths in the strict sense, so it needs its own entry.
            "bullish": [
                {"pattern": r"(drc|congo|rwanda).{0,30}(conflict|ban|banned|bans|suspend\w*|smuggl\w+|blockad\w+|export)", "signal": "Source supply risk"},
                {"pattern": r"(tantalum|niobium|coltan|columbite).{0,26}(shortage|tight\w*|deficit)", "signal": "Supply tightness"},
                {"pattern": r"(shortage|tighten\w*|deficit|squeez\w+).{0,30}(tantalum|niobium|coltan|columbite)", "signal": "Supply tightness"},
                {"pattern": r"(capacitor|aerospace|electronics).{0,24}demand.{0,16}(ris\w*|rose|strong\w*|strengthen\w*)", "signal": "Electronics demand"},
            ],
            "bearish": [
                {"pattern": r"(tantalum|niobium|coltan|columbite).{0,26}(surplus|oversupply|ample)", "signal": "Supply surplus"},
                {"pattern": r"(new|additional).{0,24}(tantalum|niobium|coltan).{0,20}(mine|supply|capacity)", "signal": "Capacity additions"},
                {"pattern": r"(recycl\w+|substitut\w+).{0,24}(tantalum|capacitor)", "signal": "Demand substitution"},
            ]
        }
    }))


def analyze_fundamental_direction(text: str, commodity: Optional[str]) -> Dict[str, Any]:
    """Interpret whether the text is fundamentally bullish or bearish for a commodity."""
    normalized = normalize_commodity(commodity, text)
    rulebook = get_commodity_rulebook()
    if not normalized or normalized not in rulebook:
        return {
            "commodity": normalized,
            "directional_score": 0.0,
            "matched_signals": [],
            "rule_bias": "NONE"
        }
    text_lower = text.lower()
    bullish_matches = []
    bearish_matches = []
    for entry in rulebook[normalized]["bullish"]:
        if re.search(entry["pattern"], text_lower):
            bullish_matches.append(entry["signal"])
    for entry in rulebook[normalized]["bearish"]:
        if re.search(entry["pattern"], text_lower):
            bearish_matches.append(entry["signal"])
    # Distinct signals, weighted. Two patterns can emit the same signal name --
    # "Infrastructure attack" has both an attack-then-noun and a noun-then-attack
    # form -- and one event described twice is not two pieces of evidence.
    bullish_unique = list(dict.fromkeys(bullish_matches))
    bearish_unique = list(dict.fromkeys(bearish_matches))
    bullish_weight = sum(signal_weight(sig) for sig in bullish_unique)
    bearish_weight = sum(signal_weight(sig) for sig in bearish_unique)
    score = SENTIMENT_RULE_COEF * (bullish_weight - bearish_weight)
    score = _clamp(score, -0.9, 0.9)
    if score > 0:
        bias = "BULLISH"
    elif score < 0:
        bias = "BEARISH"
    else:
        bias = "NEUTRAL"
    matched = [
        {"signal": signal, "direction": "bullish", "weight": signal_weight(signal)}
        for signal in bullish_unique
    ] + [
        {"signal": signal, "direction": "bearish", "weight": signal_weight(signal)}
        for signal in bearish_unique
    ]
    return {
        "commodity": normalized,
        "directional_score": round(score, 3),
        "matched_signals": matched[:6],
        "rule_bias": bias,
        "bullish_weight": round(bullish_weight, 3),
        "bearish_weight": round(bearish_weight, 3)
    }


def analyze_market_sentiment(text: str, commodity: Optional[str] = None, scores: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
    """Blend VADER tone with commodity-specific fundamental rules."""
    if scores is None:
        # get_analyzer(), never a module global. `vader_analyzer` was set only
        # inside main_simple_nlp's FastAPI lifespan hook, so every caller that
        # was not a request handler — the scorer, the fetcher, the tuner, the
        # tests — found None here and fell through to basic_sentiment_analysis,
        # a 20-word keyword list, while stamping rows "vader_v2_commodity".
        # get_analyzer builds the lexicon-enriched analyser on demand and
        # raises if it cannot, so this can no longer degrade quietly.
        from services.sentiment_engine import get_analyzer

        scores = get_analyzer().polarity_scores(text)
    compound = scores["compound"]
    if compound >= 0.05:
        base_sentiment = "BULLISH"
    elif compound <= -0.05:
        base_sentiment = "BEARISH"
    else:
        base_sentiment = "NEUTRAL"
    base_confidence = 0.5 + (abs(compound) * 0.5 if base_sentiment != "NEUTRAL" else abs(compound) * 2)
    fundamental = analyze_fundamental_direction(text, commodity)
    has_rules = bool(fundamental["matched_signals"])
    combined_score = compound
    # VADER now scores against an extended finance lexicon (Henry + SentiBignomics),
    # so the pure-VADER path is much more informative than before this PR.
    method = "vader_v2"

    # Is the fundamental read one-sided? Conflicting signals mean the situation
    # is genuinely ambiguous and tone deserves an equal vote; agreement across
    # several independent rules does not.
    bull_w = fundamental.get("bullish_weight", 0.0)
    bear_w = fundamental.get("bearish_weight", 0.0)
    one_sided = (bull_w > 0) != (bear_w > 0)
    evidence = max(bull_w, bear_w)

    if has_rules and one_sided and evidence >= SENTIMENT_RULE_DOMINANCE_WEIGHT:
        # Fundamentals DETERMINE the direction; tone only sets confidence.
        #
        # The 50/50 blend below cannot express commodity reality. Worked example
        # from production, "Saudi Aramco's Jizan Refinery Hit Again as Houthi
        # Attacks Escalate": VADER reads -0.902, because "attack", "hit",
        # "escalate" and "threatening" are negative words in every general
        # lexicon. An attack on Red Sea export infrastructure is bullish for
        # crude. Under the blend, with directional_score clamped to +-0.9, even
        # EVERY bullish rule firing yields -0.001 -- NEUTRAL. The label could
        # never be BULLISH no matter how strong the fundamental evidence.
        #
        # That is backwards for this domain. The prose describing a supply shock
        # is always grim; the price implication is the opposite. Event type
        # decides direction, tone decides how strongly it is held.
        #
        # Deliberately gated on one-sided evidence of at least
        # SENTIMENT_RULE_DOMINANCE_WEIGHT. Weight, not match count: counting
        # made an unbalanced rulebook into a directional prior, and let two
        # vague matches outrank one decisive one. At 0.85, a single decisive
        # signal (OPEC cut 1.0, infrastructure attack 0.9) qualifies alone,
        # while "Energy security support" at 0.3 never does.
        # The bias direction IS the answer here; comparing a rule-derived
        # magnitude against a VADER-calibrated threshold would re-introduce the
        # coupling this branch exists to break. SENTIMENT_THRESHOLD is tuned for
        # tone in [-1, 1]; rule weight is a different unit entirely.
        dominant_direction = "BULLISH" if bull_w > bear_w else "BEARISH"
        combined_score = (1 if dominant_direction == "BULLISH" else -1) * max(
            abs(fundamental["directional_score"]), SENTIMENT_THRESHOLD
        )
        method = "commodity_rules_v3"
    elif has_rules:
        combined_score = (
            compound * SENTIMENT_BLEND_VADER
            + fundamental["directional_score"] * (1 - SENTIMENT_BLEND_VADER)
        )
        method = "commodity_vader_v2"

    if combined_score >= SENTIMENT_THRESHOLD:
        sentiment = "BULLISH"
    elif combined_score <= -SENTIMENT_THRESHOLD:
        sentiment = "BEARISH"
    else:
        sentiment = "NEUTRAL"
    confidence = base_confidence
    if has_rules:
        confidence = _clamp(
            0.52 + (abs(combined_score) * 0.4) + min(0.12, len(fundamental["matched_signals"]) * 0.03),
            0.5,
            0.96
        )
    return {
        "sentiment": sentiment,
        "confidence": round(confidence, 3),
        "method": method,
        "commodity_specific": fundamental["commodity"] is not None,
        "commodity": fundamental["commodity"],
        "market_context": {
            "base_sentiment": base_sentiment,
            "base_confidence": round(_clamp(base_confidence, 0.5, 0.95), 3),
            "fundamental_bias": fundamental["rule_bias"],
            "directional_score": fundamental["directional_score"],
            "bullish_weight": fundamental.get("bullish_weight", 0.0),
            "bearish_weight": fundamental.get("bearish_weight", 0.0),
            "matched_signals": fundamental["matched_signals"]
        }
    }


def infer_market_targets(topic_text: str, commodity: Optional[str] = None) -> List[str]:
    """Infer the most relevant target assets for a market/topic prompt."""
    normalized = normalize_commodity(commodity, topic_text)
    if normalized:
        if normalized == "macro":
            return ["forex", "gold"]
        if normalized == "weather":
            return ["oil", "gas"]
        return [normalized]

    text_lower = topic_text.lower()
    target_rules = [
        (["wti", "brent", "crude", "opec", "hormuz", "oil", "shipping", "refinery"], ["oil"]),
        (["gold", "bullion", "safe haven"], ["gold"]),
        (["silver"], ["silver"]),
        (["uranium", "u3o8", "nuclear", "reactor", "smr"], ["uranium"]),
        (["forex", "fx", "usd", "dollar", "eur", "jpy", "gbp", "cad", "aud", "boj", "ecb", "boe"], ["forex"]),
        (["iran", "israel", "middle east", "strait of hormuz", "sanctions"], ["oil", "gold", "silver"]),
        (["fed", "rate cut", "rate hike", "inflation", "cpi", "payrolls", "central bank"], ["gold", "silver", "forex"]),
        (["risk-on", "risk-off", "recession", "growth"], ["gold", "forex"])
    ]

    inferred: List[str] = []
    for keywords, assets in target_rules:
        if any(keyword in text_lower for keyword in keywords):
            for asset in assets:
                if asset not in inferred:
                    inferred.append(asset)
    return inferred[:3]


def build_headline_sentiment_overview(
    topic_text: str,
    articles: List[Dict[str, Any]],
    commodity: Optional[str] = None,
    max_headlines: int = 20,
    event_url: Optional[str] = None,
    event_slug: Optional[str] = None
) -> Dict[str, Any]:
    """Summarize the last N relevant headlines into a single market-facing sentiment read."""
    canonical_event_slug = extract_polymarket_event_slug(event_slug) or extract_polymarket_event_slug(event_url)
    canonical_event_url = event_url if is_official_polymarket_event_url(event_url) else build_polymarket_event_url(canonical_event_slug)
    target_assets = infer_market_targets(topic_text, commodity)
    ranked_articles = sorted(
        articles,
        key=lambda article: score_article_relevance(article, topic_text, target_assets),
        reverse=True
    )
    relevant_articles = [
        article for article in ranked_articles
        if score_article_relevance(article, topic_text, target_assets) > 0
    ][:max_headlines]

    primary_target = target_assets[0] if target_assets else normalize_commodity(commodity, topic_text)
    if not relevant_articles:
        primary_label = primary_target.upper() if primary_target else "the market"
        return {
            "topic_text": topic_text,
            "primary_target": primary_target,
            "target_assets": [asset.upper() for asset in target_assets],
            "overall_sentiment": "NEUTRAL",
            "confidence": 0.5,
            "headline_count": 0,
            "summary": f"No recent relevant headlines were available, so the overall sentiment for {primary_label} remains neutral.",
            "sentiment_breakdown": {"bullish": 0, "bearish": 0, "neutral": 0},
            "sample_headlines": [],
            "method": "recent_headlines_cache",
            "event_url": canonical_event_url,
            "event_slug": canonical_event_slug,
            "source_url": canonical_event_url
        }

    weighted_score = 0.0
    total_weight = 0.0
    sentiment_breakdown = {"bullish": 0, "bearish": 0, "neutral": 0}
    signals: List[str] = []

    for article in relevant_articles:
        article_text = f"{article.get('title', '')}. {article.get('summary', '')}"
        article_commodity = primary_target or normalize_commodity(article.get("commodity"), article_text)
        market_result = analyze_market_sentiment(article_text, article_commodity)
        article_score = market_result["confidence"]
        if market_result["sentiment"] == "BULLISH":
            weighted_score += article_score
            sentiment_breakdown["bullish"] += 1
        elif market_result["sentiment"] == "BEARISH":
            weighted_score -= article_score
            sentiment_breakdown["bearish"] += 1
        else:
            sentiment_breakdown["neutral"] += 1
        total_weight += max(article_score, 0.2)
        for signal in market_result.get("market_context", {}).get("matched_signals", []):
            label = signal.get("signal")
            if label and label not in signals:
                signals.append(label)

    normalized_score = weighted_score / total_weight if total_weight else 0.0
    if normalized_score >= 0.15:
        overall_sentiment = "BULLISH"
    elif normalized_score <= -0.15:
        overall_sentiment = "BEARISH"
    else:
        overall_sentiment = "NEUTRAL"

    confidence = _clamp(
        0.52 + abs(normalized_score) * 0.35 + min(0.1, len(relevant_articles) * 0.01),
        0.5,
        0.95
    )
    label = (primary_target or "market").upper()
    summary = (
        f"Overall sentiment across the last {len(relevant_articles)} relevant headlines is "
        f"{overall_sentiment.lower()} for {label}, based on {sentiment_breakdown['bullish']} bullish, "
        f"{sentiment_breakdown['bearish']} bearish, and {sentiment_breakdown['neutral']} neutral reads."
    )
    if signals:
        summary += f" Key drivers include {', '.join(signals[:3]).lower()}."

    return {
        "topic_text": topic_text,
        "primary_target": primary_target,
        "target_assets": [asset.upper() for asset in target_assets],
        "overall_sentiment": overall_sentiment,
        "confidence": round(confidence, 3),
        "headline_count": len(relevant_articles),
        "summary": summary,
        "sentiment_breakdown": sentiment_breakdown,
        "sample_headlines": [article.get("title", "") for article in relevant_articles[:5]],
        "matched_signals": signals[:5],
        "method": "recent_headlines_cache",
        "event_url": canonical_event_url,
        "event_slug": canonical_event_slug,
        "source_url": canonical_event_url
    }


_DRIVER_TERMS = [
    # commodities first, so they lead the truncated list
    "oil", "gas", "wheat", "corn", "gold", "silver", "copper", "coffee",
    "sugar", "bitcoin", "btc",
    # market drivers
    "price", "production", "supply", "demand", "forecast", "harvest",
    "export", "import", "inflation", "fed", "yield", "weather",
]


# Word-boundary matchers, built once. Unanchored `term in text_lower` matched
# far more than it should, and these are what the app labels "Key Sentiment
# Drivers": "gas" fired on Vegas and gasket, "oil" on spoiled and turmoil,
# "corn" on cornerstone, "fed" on federal and offered, "import" on important
# — which appears in a large share of financial copy.
#
# `\w*` still allows inflections ("prices", "exports", "forecasting"), it just
# stops a term matching from the middle of another word.
_DRIVER_PATTERNS = {
    term: re.compile(r"\b" + re.escape(term) + r"\w*\b", re.IGNORECASE)
    for term in _DRIVER_TERMS
}


# Expansions that \w* admits but which are a different word in practice.
_DRIVER_FALSE_FORMS = {
    "fed": {"federal", "federally", "fedora", "federation"},
    "import": {"important", "importantly", "importance"},
    "gas": {"gasket", "gaskets"},
    "corn": {"cornerstone", "corner", "cornered"},
}


def extract_keywords(text: str) -> List[str]:
    """Extract relevant market drivers from text.

    At most five terms, ordered by _DRIVER_TERMS so commodities lead.
    Word-boundary anchored — see the note above _DRIVER_PATTERNS.
    """
    if not text:
        return []
    keywords: List[str] = []
    for term in _DRIVER_TERMS:
        bad = _DRIVER_FALSE_FORMS.get(term, frozenset())
        if any(h.lower() not in bad for h in _DRIVER_PATTERNS[term].findall(text)):
            keywords.append(term)
    return keywords[:5]  # Return top 5 keywords


def extract_trigger_keywords_with_relevance(text: str, commodity: Optional[str] = None) -> List[Dict[str, Any]]:
    """Extract trigger keywords with relevance scores for comprehensive analysis"""
    import re
    from collections import Counter
    
    text_lower = text.lower()
    trigger_keywords = []
    
    # Define keyword categories with base relevance scores
    keyword_patterns = {
        # High relevance (0.8-1.0) - Direct market movers
        'high': {
            'patterns': [
                (r'opec\+?\s*(decision|meeting|cut|increase)', 'OPEC decision'),
                (r'(production|output)\s+(cut|reduction|increase|boost)', 'production change'),
                (r'(supply|demand)\s+(shortage|surplus|disruption|shock)', 'supply/demand shock'),
                (r'(price|prices)\s+(surge|plunge|spike|crash)', 'price movement'),
                (r'sanctions?\s+(imposed|lifted|announced)', 'sanctions'),
                (r'(hurricane|storm|drought|flood)\s+(threat|damage|impact)', 'weather event'),
                (r'(inventory|stockpile)\s+(draw|build|change)', 'inventory change'),
                (r'fed\s+(rate|decision|meeting|hike|cut)', 'Fed policy'),
                (r'(war|conflict|tension)\s+(escalate|easing|risk)', 'geopolitical'),
            ],
            'base_relevance': 0.85
        },
        # Medium relevance (0.5-0.8) - Important indicators
        'medium': {
            'patterns': [
                (r'(export|import)\s+(ban|restriction|increase)', 'trade policy'),
                (r'(bullish|bearish)\s+(sentiment|outlook|trend)', 'market sentiment'),
                (r'technical\s+(support|resistance|breakout)', 'technical analysis'),
                (r'(harvest|planting)\s+(season|forecast|delay)', 'agricultural cycle'),
                (r'(refinery|pipeline)\s+(outage|maintenance|restart)', 'infrastructure'),
                (r'economic\s+(growth|recession|slowdown)', 'economic indicator'),
                (r'(futures|options)\s+(trading|volume|position)', 'derivatives market'),
            ],
            'base_relevance': 0.65
        },
        # Low relevance (0.3-0.5) - Context indicators
        'low': {
            'patterns': [
                (r'analyst\s+(forecast|prediction|estimate)', 'analyst view'),
                (r'market\s+(open|close|trading)', 'market status'),
                (r'year\s+(high|low|average)', 'price level'),
                (r'seasonal\s+(pattern|trend|demand)', 'seasonality'),
            ],
            'base_relevance': 0.45
        }
    }
    
    # Extract keywords based on patterns
    found_keywords = set()  # Track to avoid duplicates
    
    for priority, config in keyword_patterns.items():
        for pattern, keyword_phrase in config['patterns']:
            matches = re.finditer(pattern, text_lower)
            for match in matches:
                matched_text = match.group(0)
                
                # Skip if we already have this keyword
                if keyword_phrase in found_keywords:
                    continue
                    
                found_keywords.add(keyword_phrase)
                
                # Calculate relevance based on factors
                relevance = config['base_relevance']
                
                # Boost relevance if commodity-specific
                if commodity and commodity.lower() in matched_text:
                    relevance += 0.1
                
                # Boost if appears in first 100 characters (likely headline)
                if match.start() < 100:
                    relevance += 0.05
                
                # Boost if appears multiple times
                count = len(re.findall(pattern, text_lower))
                if count > 1:
                    relevance += min(0.1, count * 0.03)
                
                # Cap at 1.0
                relevance = min(1.0, relevance)
                
                trigger_keywords.append({
                    'keyword': keyword_phrase,
                    'relevance': round(relevance, 2),
                    'matched_text': matched_text,
                    'category': priority
                })
    
    # Also extract standalone important terms
    important_terms = [
        ('surge', 0.7), ('plunge', 0.7), ('spike', 0.7), ('crash', 0.75),
        ('rally', 0.65), ('selloff', 0.65), ('breakout', 0.6),
        ('disruption', 0.8), ('shortage', 0.8), ('surplus', 0.75),
        ('sanctions', 0.85), ('embargo', 0.85), ('blockade', 0.8),
        ('OPEC', 0.8), ('Fed', 0.75), ('ECB', 0.7),
        ('inflation', 0.7), ('recession', 0.75), ('recovery', 0.65),
    ]
    
    for term, base_relevance in important_terms:
        if term.lower() in text_lower and term not in found_keywords:
            # Find context around the term
            index = text_lower.find(term.lower())
            start = max(0, index - 20)
            end = min(len(text), index + len(term) + 20)
            context = text[start:end].strip()
            
            # Extract 2-3 word phrase around the term
            words = context.split()
            term_index = next((i for i, w in enumerate(words) if term.lower() in w.lower()), None)
            
            if term_index is not None:
                # Get surrounding words
                phrase_start = max(0, term_index - 1)
                phrase_end = min(len(words), term_index + 2)
                keyword_phrase = ' '.join(words[phrase_start:phrase_end])
                
                # Clean up the phrase
                keyword_phrase = re.sub(r'[.,;!?]', '', keyword_phrase).strip()
                
                if keyword_phrase and keyword_phrase not in found_keywords:
                    found_keywords.add(keyword_phrase)
                    trigger_keywords.append({
                        'keyword': keyword_phrase,
                        'relevance': base_relevance,
                        'matched_text': context,
                        'category': 'extracted'
                    })
    
    # Sort by relevance and return top keywords
    trigger_keywords.sort(key=lambda x: x['relevance'], reverse=True)
    
    # Return top 10 keywords, but ensure we have at least 3
    result = trigger_keywords[:10]
    
    # If we have fewer than 3 keywords, add some basic ones
    if len(result) < 3:
        basic_keywords = extract_keywords(text)
        for kw in basic_keywords:
            if len(result) >= 10:
                break
            if kw not in [k['keyword'] for k in result]:
                result.append({
                    'keyword': kw,
                    'relevance': 0.4,
                    'category': 'basic'
                })
    
    return result


def determine_market_impact(sentiment: str, confidence: float) -> str:
    """Determine market impact based on sentiment and confidence"""
    if confidence >= 0.8:
        if sentiment == "BULLISH":
            return "strong_positive"
        elif sentiment == "BEARISH":
            return "strong_negative"
    elif confidence >= 0.6:
        if sentiment == "BULLISH":
            return "moderate_positive"
        elif sentiment == "BEARISH":
            return "moderate_negative"
    
    return "neutral"


def extract_commodity_tickers(text: str) -> List[str]:
    """Extract commodity tickers from text"""
    tickers = []
    text_lower = text.lower()
    
    # Map commodities to tickers
    commodity_map = {
        'oil': ['WTI', 'BRENT'],
        'crude': ['WTI', 'BRENT'],
        'petroleum': ['WTI'],
        'gas': ['NAT GAS'],
        'natural gas': ['NAT GAS'],
        'gold': ['GOLD'],
        'silver': ['SILVER'],
        'bitcoin': ['BTC'],
        'btc': ['BTC'],
        'copper': ['COPPER'],
        'wheat': ['WHEAT'],
        'corn': ['CORN'],
        'coffee': ['COFFEE'],
        'sugar': ['SUGAR']
    }
    
    for commodity, ticker_list in commodity_map.items():
        if commodity in text_lower:
            tickers.extend(ticker_list)
    
    return list(set(tickers))  # Remove duplicates


# Per-signal weight. The rulebook previously treated every match as equal, so
# "Energy security support" -- a vague policy phrase -- carried exactly the
# weight of "OPEC supply cut", the most consequential recurring event in crude.
# Two weak matches outranked one decisive one, and under the dominance rule they
# could set the label on their own.
#
# Anything not listed here is 1.0, so this only records deviations and stays
# readable. These are analyst priors, not measured coefficients -- the archive
# is what would turn them into measured ones, by asking what the front month
# actually did after each signal fired historically.
# Mirror pairs MUST carry equal weight. An asymmetry here is a directional
# prior smuggled in through the back door: "Sanctions relief" at 0.80 against
# "Sanctions imposed" at 0.85 meant imposition cleared the dominance gate on its
# own and relief did not, so the same event read bullish going in and neutral
# coming out. test_mirror_pairs_weigh_the_same pins this.
_MIRROR_PAIRS = (
    ("OPEC supply cut", "OPEC quota increase"),
    ("Infrastructure attack", "Supply restored"),
    ("Sanctions imposed", "Sanctions relief"),
    ("Supply disruption risk", "De-escalation"),
    ("Chokepoint disruption", "Chokepoint flows normalise"),
    ("Price action up", "Price action down"),
    ("Inventory draw", "Inventory build"),
    ("Storage draw", "Storage surplus"),
    ("Demand strengthening", "Demand weakness"),
    ("Backwardation", "Contango"),
    ("Prompt spread firming", "Prompt spread weakening"),
    ("Stocks tightening", "Stocks building"),
    ("WASDE downgrade", "WASDE upgrade"),
    ("Crop conditions deteriorating", "Crop conditions improving"),
    ("Export demand strength", "Export demand weakness"),
    ("Mine supply disruption", "Mine supply growth"),
    ("Exchange stock draw", "Exchange stock build"),
    ("Concentrate tightness", "Concentrate surplus"),
    ("China stimulus", "China demand weakness"),
    ("Battery demand growth", "Battery demand weakness"),
    ("Supply curtailment", "Capacity additions"),
    ("Export restriction", "Export restriction lifted"),
    ("Feedstock cost push", "Feedstock cost relief"),
    ("Crack spread widening", "Crack spread narrowing"),
    ("Refinery outage", "Refinery runs rising"),
    ("Product stock draw", "Product stock build"),
    ("Freight rates rising", "Freight rates falling"),
    ("Helium shortage", "Helium surplus"),
    ("Supply tightness", "Supply surplus"),
    ("Electronics demand", "Electronics demand weakness"),
    ("Petrochemical demand", "Petrochemical demand weakness"),
    ("Port congestion", "Congestion easing"),
    ("Adverse crop weather", "Favourable crop weather"),
    ("Heating demand surge", "Weak heating demand"),
    ("Dollar weakness", "Dollar strength"),
    ("Growth-supportive macro", "Growth downside risk"),
    ("Safe-haven demand", "Reduced defensive demand"),
)
