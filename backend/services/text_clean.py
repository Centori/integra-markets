"""Shared summary-text hygiene.

These two helpers used to live in `user_news_service` and were therefore
reachable only from the live-RSS path. Every other producer of card text --
the store reader (`services.feed_store`) and the on-demand summarizer
(`api.summarize`) -- emitted whatever it had, which is how a raw
`<a href="https://news.google.com/rss/articles/CBMixgF...">` anchor reached
production article cards.

They live here so every path can reach them without importing
`user_news_service` (which pulls in VADER and the lexicons at module load).
`user_news_service` re-exports both names for backwards compatibility.
"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

# Publisher legal/footer text that scrapers pick up when they fail to isolate
# the article body. Investing.com sits behind bot protection, so summarize_url()
# there returned Fusion Media's site-wide disclaimer instead of the story -- the
# same paragraph on every card. Any candidate summary matching these is
# discarded rather than shown.
_BOILERPLATE_RE = re.compile(
    r"fusion media|"
    r"cryptocurrencies are extremely volatile|"
    r"prohibited to use, store, reproduce|"
    r"not necessarily real-time nor accurate|"
    r"would like to remind you|"
    r"all rights reserved|"
    r"terms of use|privacy policy|cookie policy|"
    r"is not responsible for any loss|"
    r"enable javascript|subscribe to (?:continue|read)",
    re.IGNORECASE,
)

# Below this a "summary" carries no more information than the headline.
_MIN_SUMMARY_CHARS = 60

# Bare URLs left in RSS descriptions. get_text() drops the href attribute but
# not a URL that *is* the link text, which is the common Google News shape.
_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)

# Syndication tails appended after the article body by WordPress-style feeds.
_TAIL_RE = re.compile(
    r"\s*(?:"
    r"the post .{0,120}? appeared first on .{0,80}$|"
    r"this (?:post|article) (?:first )?appeared on .{0,80}$|"
    r"read more(?: here)?[.:\s]*$|"
    r"continue reading[.:\s]*$|"
    r"\[\s*\.\.\.\s*\]$"
    r")",
    re.IGNORECASE,
)


def clean_summary_text(raw: str) -> str:
    """Strip markup/entities/URLs out of a description and normalise spacing."""
    if not raw:
        return ""
    text = BeautifulSoup(str(raw), "html.parser").get_text(" ")
    text = _URL_RE.sub(" ", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = _TAIL_RE.sub("", text).strip()
    # Leading/trailing separator debris left behind once a URL is removed.
    return text.strip(" -–—|·,;:")


def is_usable_summary(text: str, title: str = "") -> bool:
    """
    True when `text` is worth showing as an article summary.

    Rejects: empties, publisher boilerplate, anything too short to add detail,
    and text that merely restates the headline (which is what the feed emitted
    for every article before this).
    """
    cleaned = clean_summary_text(text)
    if len(cleaned) < _MIN_SUMMARY_CHARS:
        return False
    if _BOILERPLATE_RE.search(cleaned):
        return False
    if title:
        norm = lambda s: re.sub(r"\W+", " ", s).strip().lower()
        if norm(cleaned) == norm(title) or (
            norm(cleaned).startswith(norm(title)) and len(cleaned) < len(title) * 1.3
        ):
            return False
    return True


def _restates(text: str, title: str) -> bool:
    """True when `text` carries no more information than the headline."""
    if not title:
        return False
    norm = lambda s: re.sub(r"\W+", " ", s).strip().lower()
    nt, nx = norm(title), norm(text)
    return nx == nt or (nx.startswith(nt) and len(text) < len(title) * 1.3)


def best_summary(content: str, title: str) -> str:
    """Pick the text to show on a card, cleaned.

    Returns the cleaned body unless it is empty, publisher boilerplate, or a
    restatement of the headline -- in which case the cleaned title is used.
    Never returns markup, a bare URL, or an empty string when a title exists:
    the card contract downstream assumes `summary` is always populated.

    Deliberately does NOT apply `is_usable_summary`'s 60-character floor. That
    floor exists to decide whether to go looking for a *better* source, and it
    is right there. Here the only fallback is the headline, so discarding a
    short-but-real body ("OPEC cuts output by 1m bpd.") in favour of the title
    would lose information rather than gain it.
    """
    cleaned_title = clean_summary_text(title)
    cleaned_body = clean_summary_text(content)
    if not cleaned_body:
        return cleaned_title
    if _BOILERPLATE_RE.search(cleaned_body):
        return cleaned_title
    if _restates(cleaned_body, cleaned_title):
        return cleaned_title
    return cleaned_body
