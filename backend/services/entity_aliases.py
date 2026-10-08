"""Two vocabularies write into `entity_mentions.entity`. Reconcile them on read.

What is actually going on
-------------------------
`entity` is populated by two independent labelling systems:

  * ``commodity_sentiment._COMMODITY_ALIASES`` — 20 canonical commodity names
    (``oil``, ``gas``, ``freight``, ``lpg`` …), assigned by the scoring engine.
  * ``topic_taxonomy.TOPICS`` — 39 topics across 9 categories, which covers the
    same commodities plus macro and geopolitical subjects (``fed_rates``,
    ``opec_decisions``, ``russia_ukraine``).

Both are legitimate and both are wanted. The defect is that they are
indistinguishable once written, and on four subjects they disagree about the
NAME:

    oil ↔ crude_oil      gas ↔ natural_gas
    freight ↔ freight_shipping      lpg ↔ lpg_ngl

`/v1/commodities` therefore lists 49 entries in which four subjects appear
twice, with nothing marking them as the same thing. A customer who picks
``crude_oil`` gets 86% of what ``oil`` would have given them and no way to
discover why.

What this is NOT
----------------
It is not split coverage, and the correction matters because it changes the size
of the fix. Measured on 2026-09-29: 93% of ``crude_oil`` documents also carry an
``oil`` mention (48,699 of 52,148). Merging the two gains **3,449 documents,
5.7%** — not the ~50% a raw count comparison suggests.

Which makes DOUBLE COUNTING the real hazard, not missing data. A naive union
over both labels re-reads 48,699 documents and averages each of them twice,
producing a number that is wrong in a way nothing would surface. Every read path
here deduplicates by ``document_id``, and the tests assert it.
"""

from __future__ import annotations

from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

# The only four subjects the two vocabularies name differently. Canonical name
# first — it is the one the scoring engine emits and the one with the larger
# share of documents in every pair.
#
# Deliberately explicit rather than derived: an inferred equivalence (say, by
# stripping underscores) would silently marry `refined_products` to something
# one day, and a wrong merge here corrupts an average rather than failing.
EQUIVALENT_NAMES: Dict[str, Tuple[str, ...]] = {
    "oil": ("oil", "crude_oil"),
    "gas": ("gas", "natural_gas"),
    "freight": ("freight", "freight_shipping"),
    "lpg": ("lpg", "lpg_ngl"),
}

# Reverse index: every known name -> its canonical.
_TO_CANONICAL: Dict[str, str] = {
    alias: canonical
    for canonical, aliases in EQUIVALENT_NAMES.items()
    for alias in aliases
}


def _engine_alias(key: str) -> Optional[str]:
    """What the SCORING ENGINE normalises `key` to, if it knows it.

    `commodity_sentiment._COMMODITY_ALIASES` maps 68 synonyms and market tickers
    onto 20 canonical names — `brent` and `wti` to `oil`, `henry hub`, `ttf` and
    `jkm` to `gas`. It has always been applied at WRITE time and never at read
    time, so the API's own documentation told customers that "`brent` matches
    nothing": a correct map existed two modules away and nothing consulted it.

    The consequence was an empty 200, which is indistinguishable from "no news
    about this commodity" — the exact failure mode this codebase keeps hitting.
    """
    try:
        from services.commodity_sentiment import _COMMODITY_ALIASES

        return _COMMODITY_ALIASES.get(key)
    except Exception:  # noqa: BLE001 — resolution must never break a request
        return None


def canonical(entity: Optional[str]) -> str:
    """The preferred stored name for `entity`. Unknown names pass through.

    Resolves in two steps, because there are two independent kinds of alias:

      1. Stored-name variants, where the two labelling systems that write
         `entity_mentions.entity` disagree — `crude_oil` -> `oil`.
      2. Engine synonyms and market tickers — `brent` -> `oil`, `ttf` -> `gas`.

    Step 2's output is fed back through step 1, so a ticker that resolves to a
    name which itself has a stored variant lands on the right one.

    Unknown names are returned unchanged rather than rejected: the taxonomy
    grows, and an entity this module has not heard of is a normal state.
    """
    key = (entity or "").strip().lower()
    if not key:
        return key
    if key in _TO_CANONICAL:
        return _TO_CANONICAL[key]

    engine = _engine_alias(key)
    if engine:
        return _TO_CANONICAL.get(engine, engine)
    return key


def names_for(entity: Optional[str]) -> List[str]:
    """Every stored name that means the same subject as `entity`.

    Pass this to an ``IN`` filter. Always includes the input, so a caller that
    asks for a name outside the table still queries the name they asked for.
    """
    key = (entity or "").strip().lower()
    if not key:
        return []
    canon = canonical(key)
    group = EQUIVALENT_NAMES.get(canon)
    if group:
        return list(group)
    # A ticker resolves to a canonical with no stored variants — query the
    # canonical, NOT the ticker, which matches nothing in the table.
    return [canon] if canon != key else [key]


def is_alias(entity: Optional[str]) -> bool:
    """True when `entity` is a secondary name for some other canonical."""
    key = (entity or "").strip().lower()
    return key in _TO_CANONICAL and _TO_CANONICAL[key] != key


def dedupe_by_document(rows: Iterable[dict]) -> List[dict]:
    """Collapse rows that describe the same document.

    THE point of this module. Querying `oil` and `crude_oil` together returns
    the same document twice for 93% of them, and averaging a score over that
    counts most articles twice — an error that moves the number without moving
    anything a test would normally look at.

    The first row for a document wins. Rows with no `document_id` are kept as-is
    rather than collapsed together, since they cannot be shown to be duplicates.
    """
    seen: Set[str] = set()
    out: List[dict] = []
    for row in rows:
        doc = row.get("document_id")
        if doc is None:
            out.append(row)
            continue
        key = str(doc)
        if key in seen:
            continue
        seen.add(key)
        out.append(row)
    return out


def describe(entity: str) -> Dict[str, Optional[str]]:
    """Human label, category and same-subject pointer for one stored entity.

    Read from topic_taxonomy where it knows the entity, so the API stops
    returning bare strings that a caller has to guess the meaning of — `macro`
    and `oil` are both valid values of the same field and mean very different
    things.
    """
    key = (entity or "").strip().lower()
    canon = canonical(key)

    label: Optional[str] = None
    category: Optional[str] = None
    try:
        from services.topic_taxonomy import TOPICS

        # Search the whole equivalence group, not just this name. The taxonomy
        # is keyed on ITS spelling — `crude_oil`, `natural_gas` — while the
        # canonical is the engine's, so looking up `oil` alone finds nothing and
        # the canonical subjects came back with a null category and a label that
        # was just the key echoed. The aliases are exactly where the description
        # lives.
        meta: Dict[str, object] = {}
        for candidate in (key, canon, *EQUIVALENT_NAMES.get(canon, ())):
            found = TOPICS.get(candidate)
            if found:
                meta = found
                break
        label = meta.get("label")  # type: ignore[assignment]
        category = meta.get("category")  # type: ignore[assignment]
    except Exception:  # noqa: BLE001 — description must never break a response
        pass

    return {
        "entity": key,
        "label": label or key.replace("_", " "),
        "category": category,
        # Set only when this name is a secondary spelling, so clients can
        # collapse the list without knowing the pairs themselves.
        "same_as": canon if canon != key else None,
    }


def collapse(details: Sequence[dict], count_key: str = "article_count") -> List[dict]:
    """Merge alias entries in a commodity listing into one row per subject.

    Counts are SUMMED, and that is an over-estimate for the four aliased pairs
    because the underlying documents overlap — the listing has per-entity counts
    and no document ids, so an exact merge is not available here. The summed
    figure is labelled `article_count_upper_bound` rather than presented as a
    total, and the exact number is what `/v1/sentiment` returns after
    deduplication.
    """
    merged: Dict[str, dict] = {}
    for row in details:
        name = (row.get("commodity") or row.get("entity") or "").strip().lower()
        if not name:
            continue
        canon = canonical(name)
        entry = merged.get(canon)
        if entry is None:
            merged[canon] = {
                **row,
                "commodity": canon,
                "aliases": [name] if name != canon else [],
            }
            continue
        entry[count_key] = (entry.get(count_key) or 0) + (row.get(count_key) or 0)
        entry["article_count_upper_bound"] = True
        if name != canon and name not in entry["aliases"]:
            entry["aliases"].append(name)
    return sorted(
        merged.values(), key=lambda r: (-(r.get(count_key) or 0), r["commodity"])
    )
