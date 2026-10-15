"""WAF tagger: map free text to countries, crude grades, products, entities, segments, topics.

Matching rules (each one is here because the codebase has shipped the opposite):

* Word boundaries on both sides. A bare substring match is how "bullion" read as
  bullish and "Goldman" as gold. "Abo" must not fire inside "about", "TEN" must
  not fire inside "tension".
* Case-insensitive, except for aliases written fully in capitals and up to five
  letters (PMS, AGO, NPA, CBN, TEN, EA ...). Those are acronyms and are matched
  case-sensitively, so "ago" in "two weeks ago" is not diesel.
* Hyphens and whitespace inside an alias are interchangeable, so "Bonny-Light",
  "Bonny Light" and "Bonny  Light" all resolve to bonny_light.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Pattern, Tuple

TAXONOMY_PATH = Path(__file__).with_name("taxonomy.json")
TAG_TYPES = ("countries", "grades", "products", "entities", "segments", "topics")


@dataclass
class Tags:
    """Tags found in one document, keyed by tag type, values sorted and unique."""

    countries: List[str] = field(default_factory=list)
    grades: List[str] = field(default_factory=list)
    products: List[str] = field(default_factory=list)
    entities: List[str] = field(default_factory=list)
    segments: List[str] = field(default_factory=list)
    topics: List[str] = field(default_factory=list)

    def as_rows(self) -> List[Tuple[str, str]]:
        """Flatten to (tag_type, tag) pairs, singular tag_type names."""
        rows: List[Tuple[str, str]] = []
        for tag_type in TAG_TYPES:
            for tag in getattr(self, tag_type):
                rows.append((tag_type.rstrip("s") if tag_type != "entities" else "entity", tag))
        return rows

    def is_empty(self) -> bool:
        return not any(getattr(self, t) for t in TAG_TYPES)


def _is_acronym(alias: str) -> bool:
    return alias.isupper() and len(alias.replace(" ", "")) <= 5


def _alias_pattern(alias: str) -> str:
    parts = [re.escape(p) for p in re.split(r"[\s\-]+", alias.strip()) if p]
    return r"[\s\-]+".join(parts)


def _compile(aliases: List[str]) -> List[Pattern[str]]:
    """Two patterns per canonical tag: acronyms case-sensitive, the rest not."""
    acronyms = [_alias_pattern(a) for a in aliases if _is_acronym(a)]
    words = [_alias_pattern(a) for a in aliases if not _is_acronym(a)]
    patterns: List[Pattern[str]] = []
    if acronyms:
        patterns.append(re.compile(r"(?<![\w])(?:%s)(?![\w])" % "|".join(acronyms)))
    if words:
        patterns.append(re.compile(r"(?<![\w])(?:%s)(?![\w])" % "|".join(words), re.IGNORECASE))
    return patterns


@lru_cache(maxsize=1)
def load_taxonomy() -> Dict[str, Dict[str, List[Pattern[str]]]]:
    raw = json.loads(TAXONOMY_PATH.read_text(encoding="utf-8"))
    compiled: Dict[str, Dict[str, List[Pattern[str]]]] = {}
    for tag_type in TAG_TYPES:
        compiled[tag_type] = {
            tag: _compile(aliases)
            for tag, aliases in raw[tag_type].items()
            if not tag.startswith("_")
        }
    return compiled


def tag_text(text: str) -> Tags:
    """Tag a piece of text. Empty input returns empty Tags."""
    tags = Tags()
    if not text:
        return tags
    for tag_type, vocab in load_taxonomy().items():
        found = sorted(
            tag for tag, patterns in vocab.items() if any(p.search(text) for p in patterns)
        )
        setattr(tags, tag_type, found)
    return tags


def normalise_grade(name: str) -> str | None:
    """Resolve a grade spelling ("BONNY LIGHT", "Bonny Lt") to its canonical key."""
    found = tag_text(name).grades
    return found[0] if len(found) == 1 else None


def is_waf_relevant(tags: Tags) -> bool:
    """Relevance gate for general-news feeds: a WAF location plus an energy/mining hit.

    A named WAF crude grade is relevant on its own — a Reuters line on Bonny Light
    differentials often never says "Nigeria".
    """
    if tags.grades:
        return True
    if not tags.countries:
        return False
    return bool(tags.grades or tags.products or tags.entities or tags.segments or tags.topics)
