"""Word-boundary matching for the financial keyword lists.

Lives apart from `enhanced_sentiment` because that module imports torch and
textblob at load time, which makes the matching logic -- the part most worth
testing -- unreachable in any environment without the ML stack installed.

Background: these keywords were matched with unanchored `word in text_lower`
containment, so every one of them fired on unrelated vocabulary:

    "supply"     contains "up"    -> bullish
    "bullion"    contains "bull"  -> bullish   (on gold articles)
    "shutdown"   contains "down"  -> bearish
    "downstream" contains "down"  -> bearish
    "against"    contains "gain"  -> bullish
    "bearing"    contains "bear"  -> bearish

Any energy story containing the word "supply" -- which is to say all of them
-- picked up a spurious bullish driver.

Inflections still have to match ("rallying", "gains", "dropped"); that is the
only thing containment was really providing. A trailing `\\w*` is not the way
to get them, because `\\bbull\\w*\\b` still matches "bullion" and
`\\bdown\\w*\\b` still matches "downstream". So surface forms are enumerated.
"""

from __future__ import annotations

import re
from typing import Dict, List, Pattern, Set

_VOWELS = "aeiou"

# Morphologically correct inflections whose common sense is not the financial
# one. "bearing" is a real form of "bear", but in commodity copy it is almost
# always a load-bearing structure or "bearing the cost" -- never sentiment.
# In finance these two words are nouns/adjectives, not verbs.
_FORM_EXCLUSIONS: Set[str] = {
    "bearing", "bearings", "beared", "bulling", "bulled", "upping", "upped",
}

# Adjectival forms the regular rules do not generate, but which carry the
# strongest signal of any surface form in financial copy.
_FORM_ADDITIONS: Dict[str, Set[str]] = {
    "bull": {"bullish"},
    "bear": {"bearish"},
}

_PATTERNS: Dict[str, Pattern[str]] = {}


def surface_forms(word: str) -> List[str]:
    """Regular English inflections of `word`, without over-generating.

    Deliberately conservative: it misses irregulars ("fell" for "fall"), which
    costs a little recall. Over-matching costs precision, and precision is the
    thing that was broken.
    """
    w = (word or "").lower().strip()
    if not w:
        return []
    forms = {w}
    if len(w) > 2 and w.endswith("y") and w[-2] not in _VOWELS:
        forms |= {w[:-1] + "ies", w[:-1] + "ied", w + "ing"}     # rally -> rallies/rallied
    elif w.endswith("e"):
        forms |= {w + "s", w + "d", w[:-1] + "ing"}              # surge -> surges/surged
    else:
        forms |= {w + "s", w + "es", w + "ed", w + "ing"}        # gain  -> gains/gained
        # A single final consonant after a single vowel doubles: drop -> dropped.
        if len(w) > 2 and w[-1] not in _VOWELS and w[-2] in _VOWELS and w[-3] not in _VOWELS:
            forms |= {w + w[-1] + "ed", w + w[-1] + "ing"}       # drop  -> dropped
    forms |= _FORM_ADDITIONS.get(w, set())
    forms -= _FORM_EXCLUSIONS
    return sorted(forms, key=len, reverse=True)


def keyword_pattern(word: str) -> Pattern[str]:
    """Compiled, boundary-anchored matcher over `word`'s regular inflections."""
    pat = _PATTERNS.get(word)
    if pat is None:
        forms = surface_forms(word)
        alt = "|".join(re.escape(f) for f in forms) if forms else re.escape(word)
        pat = re.compile(r"\b(?:" + alt + r")\b", re.IGNORECASE)
        _PATTERNS[word] = pat
    return pat


def count_hits(word: str, text: str) -> int:
    """How many times `word` (in any regular inflection) occurs in `text`."""
    if not text:
        return 0
    return len(keyword_pattern(word).findall(text))
