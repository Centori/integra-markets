"""Topic taxonomy for the prediction-market divergence system.

Bridges three things:
  1. The news pipeline's sentiment scores
  2. The user's alert preferences ("notify me about Fed, Iran, OPEC")
  3. Polymarket / Kalshi markets to match against

Each topic declares:
  * `label`            human-visible name shown in mobile UI
  * `category`         grouping (commodities / macro / geopolitical / political / crypto)
  * `news_keywords`    case-insensitive substring matches for tagging news
  * `polymarket_match` function: market dict -> bool
  * `kalshi_match`     function: market dict -> bool

Designed as a flat dict so it can be serialized to JSON for the mobile
app's settings screen without code generation.

Keyword lists are intentionally conservative. Iterate after launch
based on observed false-positives / false-negatives.
"""

from __future__ import annotations

import re
from typing import Any, Callable, Dict, List, Optional


def _kw_in_title(keywords: List[str]) -> Callable[[Dict[str, Any]], bool]:
    """Build a market-matcher that returns True if any keyword is in market title."""
    lowered = [k.lower() for k in keywords]
    def matcher(market: Dict[str, Any]) -> bool:
        haystack = " ".join([
            str(market.get("title") or ""),
            str(market.get("question") or ""),
            str(market.get("subtitle") or ""),
            str(market.get("category") or ""),
            " ".join(market.get("tags") or []),
        ]).lower()
        return any(k in haystack for k in lowered)
    return matcher


TOPICS: Dict[str, Dict[str, Any]] = {
    # =========================================================
    # COMMODITIES — the original Integra strength
    # =========================================================
    "crude_oil": {
        "label": "Crude oil",
        "category": "commodities",
        "news_keywords": [
            "crude", "oil", "wti", "brent", "opec", "barrel",
            "refinery", "petroleum",
        ],
        "polymarket_match": _kw_in_title(["oil", "crude", "brent", "wti", "opec"]),
        "kalshi_match": _kw_in_title(["oil", "crude", "brent", "wti", "opec"]),
    },
    "natural_gas": {
        "label": "Natural gas / LNG",
        "category": "commodities",
        "news_keywords": [
            "natural gas", "lng", "henry hub", "ttf", "jkm",
            "european gas", "gas storage",
        ],
        "polymarket_match": _kw_in_title(["natural gas", "lng", "henry hub"]),
        "kalshi_match": _kw_in_title(["natural gas", "lng", "henry hub"]),
    },
    "copper": {
        "label": "Copper",
        "category": "commodities",
        "news_keywords": ["copper", "lme copper", "chile copper", "comex copper"],
        "polymarket_match": _kw_in_title(["copper"]),
        "kalshi_match": _kw_in_title(["copper"]),
    },
    "gold": {
        "label": "Gold",
        "category": "commodities",
        "news_keywords": ["gold", "xau", "bullion", "gold price"],
        "polymarket_match": _kw_in_title(["gold"]),
        "kalshi_match": _kw_in_title(["gold"]),
    },
    "wheat": {
        "label": "Wheat / Agricultural",
        "category": "commodities",
        "news_keywords": ["wheat", "corn", "soybean", "harvest", "agricultural"],
        "polymarket_match": _kw_in_title(["wheat", "corn", "soybean", "agriculture"]),
        "kalshi_match": _kw_in_title(["wheat", "corn", "soybean", "agriculture"]),
    },

    # =========================================================
    # MACRO / POLICY — moves commodity prices via rate decisions
    # =========================================================
    "fed_rates": {
        "label": "Fed / Interest rates",
        "category": "macro",
        "news_keywords": [
            "fed ", "fomc", "federal reserve", "powell", "rate hike",
            "rate cut", "rate decision", "fed funds", "tightening",
            "dovish", "hawkish", "monetary policy",
        ],
        "polymarket_match": _kw_in_title(["fed", "rate", "fomc", "powell"]),
        "kalshi_match": _kw_in_title(["fed", "rate", "fomc"]),
    },
    "inflation": {
        "label": "Inflation (CPI / PPI)",
        "category": "macro",
        "news_keywords": [
            "inflation", "cpi", "ppi", "core inflation", "disinflation",
            "consumer prices", "producer prices",
        ],
        "polymarket_match": _kw_in_title(["inflation", "cpi", "ppi"]),
        "kalshi_match": _kw_in_title(["inflation", "cpi", "ppi"]),
    },
    "jobs_employment": {
        "label": "Jobs / Employment",
        "category": "macro",
        "news_keywords": [
            "unemployment", "nonfarm payrolls", "jobs report", "jobless claims",
            "labor market", "wage growth",
        ],
        "polymarket_match": _kw_in_title(["unemployment", "jobs", "payrolls"]),
        "kalshi_match": _kw_in_title(["unemployment", "jobs", "payrolls", "labor"]),
    },
    "recession": {
        "label": "Recession / GDP",
        "category": "macro",
        "news_keywords": [
            "recession", "gdp", "economic contraction", "slowdown",
            "soft landing", "hard landing",
        ],
        "polymarket_match": _kw_in_title(["recession", "gdp"]),
        "kalshi_match": _kw_in_title(["recession", "gdp"]),
    },
    "usd_strength": {
        "label": "USD / Dollar strength",
        "category": "macro",
        "news_keywords": [
            "dollar", "dxy", "usd", "greenback", "yuan", "yen",
            "currency", "fx market",
        ],
        "polymarket_match": _kw_in_title(["dollar", "dxy", "yuan", "yen"]),
        "kalshi_match": _kw_in_title(["dollar", "dxy", "currency"]),
    },

    # =========================================================
    # GEOPOLITICS — direct commodity-price impact
    # =========================================================
    "iran_middle_east": {
        "label": "Iran / Middle East",
        "category": "geopolitical",
        "news_keywords": [
            "iran", "tehran", "irgc", "iranian", "jcpoa",
            "strait of hormuz", "houthis", "yemen", "israel", "gaza",
            "hezbollah", "middle east",
        ],
        "polymarket_match": _kw_in_title([
            "iran", "israel", "houthi", "hormuz", "middle east", "gaza",
        ]),
        "kalshi_match": _kw_in_title([
            "iran", "israel", "houthi", "hormuz", "middle east", "gaza",
        ]),
    },
    "opec_decisions": {
        "label": "OPEC+ decisions",
        "category": "geopolitical",
        "news_keywords": [
            "opec", "opec+", "production cut", "production quota",
            "saudi arabia", "saudi", "uae oil", "russia oil",
        ],
        "polymarket_match": _kw_in_title(["opec", "saudi", "production cut"]),
        "kalshi_match": _kw_in_title(["opec", "saudi"]),
    },
    "russia_ukraine": {
        "label": "Russia / Ukraine",
        "category": "geopolitical",
        "news_keywords": [
            "russia", "ukraine", "putin", "zelensky", "kyiv", "moscow",
            "ukraine war", "russian sanctions", "nord stream",
        ],
        "polymarket_match": _kw_in_title(["russia", "ukraine", "putin"]),
        "kalshi_match": _kw_in_title(["russia", "ukraine"]),
    },
    "china_trade": {
        "label": "China / Trade",
        "category": "geopolitical",
        "news_keywords": [
            "china", "beijing", "xi jinping", "taiwan", "trade war",
            "chinese economy", "tariff", "tariffs",
        ],
        "polymarket_match": _kw_in_title(["china", "taiwan", "tariff"]),
        "kalshi_match": _kw_in_title(["china", "taiwan", "tariff"]),
    },

    # =========================================================
    # POLITICS — price-relevant political events
    # =========================================================
    "us_elections": {
        "label": "US elections",
        "category": "political",
        "news_keywords": [
            "election", "trump", "biden", "harris", "republican",
            "democrat", "senate race", "house race", "presidential",
        ],
        "polymarket_match": _kw_in_title([
            "election", "president", "trump", "biden", "senate", "house",
        ]),
        "kalshi_match": _kw_in_title([
            "election", "president", "senate", "house", "republican", "democrat",
        ]),
    },
    "energy_policy": {
        "label": "Energy / Climate policy",
        "category": "political",
        "news_keywords": [
            "climate policy", "carbon", "emissions", "energy transition",
            "renewable", "eia ", "doe ", "epa ", "drilling permit",
        ],
        "polymarket_match": _kw_in_title(["climate", "carbon", "emissions", "energy policy"]),
        "kalshi_match": _kw_in_title(["climate", "carbon", "emissions", "energy"]),
    },

    # =========================================================
    # CRYPTO — largest Polymarket category; macro-correlated
    # =========================================================
    "bitcoin": {
        "label": "Bitcoin (BTC)",
        "category": "crypto",
        "news_keywords": ["bitcoin", "btc", "bitcoin price", "crypto"],
        "polymarket_match": _kw_in_title(["bitcoin", "btc"]),
        "kalshi_match": _kw_in_title(["bitcoin", "btc"]),
    },
    "ethereum": {
        "label": "Ethereum (ETH)",
        "category": "crypto",
        "news_keywords": ["ethereum", "eth", "ether"],
        "polymarket_match": _kw_in_title(["ethereum", "eth"]),
        "kalshi_match": _kw_in_title(["ethereum", "eth"]),
    },

    # =========================================================
    # REFINED PRODUCTS & GAS LIQUIDS
    # No prediction market prices these, so they never carry a divergence
    # badge (market_coverage=False) — they exist so the news is TAGGED,
    # filterable, and matchable against user alert preferences.
    # =========================================================
    "lpg_ngl": {
        "label": "LPG / NGLs",
        "category": "energy_products",
        "market_coverage": False,
        "news_keywords": [
            "lpg", "ngl", "ngls", "propane", "butane", "liquefied petroleum gas",
            "natural gas liquids", "ethane", "mont belvieu",
        ],
    },
    "refined_products": {
        "label": "Diesel / Gasoline / Jet",
        "category": "energy_products",
        "market_coverage": False,
        "news_keywords": [
            "diesel", "gasoil", "gasoline", "petrol", "jet fuel", "kerosene",
            "naphtha", "fuel oil", "crack spread", "rbob",
        ],
    },
    "coal": {
        "label": "Coal",
        "category": "energy_products",
        "market_coverage": False,
        "news_keywords": ["coal", "thermal coal", "coking coal", "metallurgical coal", "newcastle coal"],
    },
    "power_electricity": {
        "label": "Power / Electricity",
        "category": "energy_products",
        "market_coverage": False,
        "news_keywords": [
            "electricity", "power prices", "power grid", "megawatt", "mwh",
            "baseload", "ercot", "grid operator",
        ],
    },

    # =========================================================
    # BATTERY / ENERGY-TRANSITION METALS
    # =========================================================
    "lithium": {
        "label": "Lithium",
        "category": "transition_metals",
        "market_coverage": False,
        "news_keywords": ["lithium", "spodumene", "lithium carbonate", "lithium hydroxide"],
    },
    "cobalt_nickel": {
        "label": "Cobalt / Nickel",
        "category": "transition_metals",
        "market_coverage": False,
        "news_keywords": ["cobalt", "nickel", "laterite", "nickel pig iron"],
    },
    "rare_earths": {
        "label": "Rare earths",
        "category": "transition_metals",
        "market_coverage": False,
        "news_keywords": [
            "rare earth", "rare earths", "neodymium", "praseodymium",
            "dysprosium", "samarium", "critical minerals",
        ],
    },
    "uranium": {
        "label": "Uranium",
        "category": "transition_metals",
        "market_coverage": False,
        "news_keywords": ["uranium", "u3o8", "yellowcake", "enrichment", "nuclear fuel"],
    },
    "helium": {
        "label": "Helium / Industrial gases",
        "category": "transition_metals",
        "market_coverage": False,
        "news_keywords": [
            "helium", "industrial gas", "industrial gases", "argon", "neon gas", "krypton",
        ],
    },

    # =========================================================
    # PRECIOUS & INDUSTRIAL METALS (beyond gold/copper)
    # =========================================================
    "silver": {
        "label": "Silver",
        "category": "commodities",
        "market_coverage": False,
        "news_keywords": ["silver", "xag", "silver price"],
    },
    "platinum_palladium": {
        "label": "Platinum / Palladium",
        "category": "commodities",
        "market_coverage": False,
        "news_keywords": ["platinum", "palladium", "pgm", "pgms", "autocatalyst"],
    },
    "iron_ore_steel": {
        "label": "Iron ore / Steel",
        "category": "commodities",
        "market_coverage": False,
        "news_keywords": [
            "iron ore", "steel", "steelmaking", "rebar", "hot-rolled coil",
            "blast furnace", "scrap steel",
        ],
    },
    "aluminium_zinc": {
        "label": "Aluminium / Zinc",
        "category": "commodities",
        "market_coverage": False,
        "news_keywords": ["aluminium", "aluminum", "alumina", "bauxite", "zinc", "lead smelter", "tin"],
    },

    # =========================================================
    # SOFTS, LIVESTOCK & INPUTS
    # =========================================================
    "softs": {
        "label": "Coffee / Cocoa / Sugar",
        "category": "agriculture",
        "market_coverage": False,
        "news_keywords": [
            "coffee", "arabica", "robusta", "cocoa", "sugar", "raw sugar",
            "cotton", "orange juice", "palm oil", "rubber",
        ],
    },
    "livestock": {
        "label": "Livestock",
        "category": "agriculture",
        "market_coverage": False,
        "news_keywords": [
            "cattle", "live cattle", "feeder cattle", "hogs", "lean hogs",
            "poultry", "beef", "pork", "dairy", "milk price",
        ],
    },
    "fertilizer": {
        "label": "Fertilizer / Inputs",
        "category": "agriculture",
        "market_coverage": False,
        "news_keywords": [
            "fertilizer", "fertiliser", "urea", "potash", "phosphate",
            "ammonia", "nitrogen fertilizer", "dap", "map fertilizer",
        ],
    },

    # =========================================================
    # LOGISTICS & CARBON — move commodity prices, tradable context
    # =========================================================
    "freight_shipping": {
        "label": "Freight / Shipping",
        "category": "logistics",
        "market_coverage": False,
        "news_keywords": [
            "freight", "shipping rates", "baltic dry", "tanker rates", "vlcc",
            "container rates", "suez canal", "panama canal", "port strike",
        ],
    },
    "carbon_markets": {
        "label": "Carbon markets",
        "category": "logistics",
        "market_coverage": False,
        "news_keywords": [
            "carbon credit", "carbon credits", "carbon price", "emissions trading",
            "eu ets", "cbam", "offsets market",
        ],
    },
}


CATEGORIES: Dict[str, Dict[str, Any]] = {
    "commodities":       {"label": "Commodities",            "default_expanded": True},
    "energy_products":   {"label": "Energy products",        "default_expanded": True},
    "transition_metals": {"label": "Battery & transition",   "default_expanded": False},
    "agriculture":       {"label": "Agriculture & softs",    "default_expanded": False},
    "logistics":         {"label": "Freight & carbon",       "default_expanded": False},
    "macro":             {"label": "Macro / Policy",         "default_expanded": True},
    "geopolitical":      {"label": "Geopolitics",            "default_expanded": True},
    "political":         {"label": "Politics",               "default_expanded": False},
    "crypto":            {"label": "Crypto",                 "default_expanded": False},
}


def has_market_coverage(topic_key: str) -> bool:
    """True when a prediction market actually prices this topic.

    Only these topics can produce a divergence reading (news sentiment vs
    market-implied odds). The rest are news-tagging only: they power feed
    personalization, filtering and alerts, but never show a divergence badge.
    """
    topic = TOPICS.get(topic_key)
    return bool(topic) and topic.get("market_coverage", True)


def tradable_topics() -> List[str]:
    """Topic keys eligible for divergence enrichment."""
    return [k for k in TOPICS if has_market_coverage(k)]


# Topics turned on by default for a new user — chosen for highest signal
# per the commodity-trader-adjacent persona.
DEFAULT_USER_TOPICS = [
    "crude_oil", "natural_gas", "fed_rates", "opec_decisions",
    "iran_middle_east",
]


def list_topics_for_api() -> List[Dict[str, Any]]:
    """JSON-serializable topic list for the mobile-app settings screen.

    The match functions are stripped (they are not serializable); the
    mobile app does not need them, it only displays labels and persists
    the chosen topic keys.
    """
    return [
        {
            "key": key,
            "label": t["label"],
            "category": t["category"],
            "category_label": CATEGORIES[t["category"]]["label"],
            "news_keywords": t["news_keywords"][:3],  # preview only
            # False → tagged in the feed, but never carries a divergence badge
            "market_coverage": t.get("market_coverage", True),
        }
        for key, t in TOPICS.items()
    ]


def list_categories_for_api() -> List[Dict[str, Any]]:
    return [
        {"key": k, "label": v["label"], "default_expanded": v["default_expanded"]}
        for k, v in CATEGORIES.items()
    ]


# Compiled word-boundary patterns, built lazily per topic. Substring matching
# caused two classes of false positives that blanket-stamped divergence onto
# nearly every card: "eth" inside "whether", "oil" inside "turmoil", and
# "crypto" inside the Fusion Media "cryptocurrencies are volatile" boilerplate.
_TOPIC_PATTERNS: Dict[str, "re.Pattern[str]"] = {}


def _pattern_for(topic_key: str) -> "re.Pattern[str]":
    pat = _TOPIC_PATTERNS.get(topic_key)
    if pat is None:
        kws = sorted(TOPICS[topic_key]["news_keywords"], key=len, reverse=True)
        joined = "|".join(re.escape(k) for k in kws)
        pat = re.compile(r"\b(?:" + joined + r")\b", re.IGNORECASE)
        _TOPIC_PATTERNS[topic_key] = pat
    return pat


def detect_topics(text: str, title: Optional[str] = None) -> List[str]:
    """Word-boundary topic tagging with a relevance bar.

    A topic is tagged when its keywords hit the *title*, or appear at least
    twice in the full text. A single passing body mention (or legal
    boilerplate) no longer tags an article — previously that stamped one
    divergence reading across nearly every card in the feed.

    `title=None` keeps the legacy call signature working (the ≥2-hits rule
    still applies to the full text).
    """
    body = text or ""
    matches: List[str] = []
    for key in TOPICS:
        pat = _pattern_for(key)
        if title and pat.search(title):
            matches.append(key)
            continue
        if len(pat.findall(body)) >= 2:
            matches.append(key)
    return matches


def matching_markets(topic_key: str, markets: List[Dict[str, Any]], provider: str) -> List[Dict[str, Any]]:
    """Filter a list of market dicts down to those matching `topic_key`.

    `provider` selects between polymarket_match / kalshi_match.
    """
    topic = TOPICS.get(topic_key)
    if not topic:
        return []
    matcher_key = "polymarket_match" if provider.lower() == "polymarket" else "kalshi_match"
    # News-tagging-only topics (market_coverage=False) declare no matcher.
    matcher = topic.get(matcher_key)
    if matcher is None:
        return []
    return [m for m in markets if matcher(m)]
