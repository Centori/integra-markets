"""MEMAN (Major Energies Marketers Association of Nigeria) ingestion.

Site: https://moman.org (meman.org.ng redirects there; meman.com.ng disallows
bots and is not used). Two triggers:

* RSS — https://moman.org/feed/ lists new posts (Energy Digest, Market Analysis,
  press releases ...). Items carry title/link/date/category only, no body, so a
  new item means: fetch the post page, collect the PDFs it links (WordPress
  uploads or Google Drive shares), extract their text.
* Bulletin watcher — the Daily Competency Centre Bulletin is NOT in the feed;
  its PDF is linked from the homepage ("Download Bulletin").

Full PDF text is used for tagging and supply-signal detection at ingest time;
only the bounded excerpt is stored (archive_writer.CONTENT_MAX_CHARS), the same
rule as every other source. Every item links back to MEMAN.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Iterable, List, Optional, Set
from urllib.parse import urljoin

from waf.pdf_text import PdfText, extract
from waf.taxonomy import Tags, tag_text

logger = logging.getLogger(__name__)

BASE_URL = "https://moman.org"
FEED_URL = f"{BASE_URL}/feed/"
USER_AGENT = "IntegraMarkets-WAF/1.0 (+https://integramarkets.app; attribution: MEMAN)"
TIMEOUT_S = 30
MAX_PDF_BYTES = 25 * 1024 * 1024

_UPLOAD_PDF = re.compile(r"https?://[^\s\"'<>]*/wp-content/uploads/[^\s\"'<>]+?\.pdf", re.I)
_DRIVE_FILE = re.compile(r"https?://drive\.google\.com/file/d/([A-Za-z0-9_-]+)")
_BULLETIN = re.compile(r"/wp-content/uploads/\d{4}/\d{2}/CC-Bulletin[^\"'<>\s]*\.pdf", re.I)

# RSS category -> document type. Unknown categories fall through to "article".
_DOC_TYPES = {
    "energy digest": "energy_digest",
    "market analysis by the industry competency centre": "market_analysis",
    "industry data sheet": "industry_data_sheet",
    "press releases": "press_release",
    "industry news": "industry_news",
}


@dataclass
class FeedItem:
    guid: str
    title: str
    link: str
    published: Optional[datetime]
    categories: List[str] = field(default_factory=list)


@dataclass
class MemanDocument:
    title: str
    url: str                      # the PDF if there is one, else the post page
    page_url: str
    published: Optional[datetime]
    doc_type: str
    text: str
    tags: Tags
    pdf: Optional[PdfText] = None

    @property
    def supply_signal(self) -> bool:
        return "supply_assurance" in self.tags.topics

    def as_article(self) -> dict:
        """The shape NewsDataSources fetchers return, for the shared scoring/archive path."""
        return {
            "source": "MEMAN",
            "title": self.title,
            "summary": self.text,
            "url": self.url,
            "published": self.published,
            "category": "energy",
        }


def doc_type_for(categories: Iterable[str], title: str = "") -> str:
    for category in categories:
        mapped = _DOC_TYPES.get(category.strip().lower())
        if mapped:
            return mapped
    if "bulletin" in title.lower():
        return "cc_bulletin"
    return "article"


def parse_feed(xml_text: str) -> List[FeedItem]:
    import feedparser
    from services.feed_dates import parse_published

    items = []
    for entry in feedparser.parse(xml_text).entries:
        items.append(FeedItem(
            guid=getattr(entry, "id", "") or entry.link,
            title=entry.title,
            link=entry.link.split("?")[0],
            published=parse_published(getattr(entry, "published", "")),
            categories=[t.get("term", "") for t in getattr(entry, "tags", [])],
        ))
    return items


def drive_direct_url(url: str) -> Optional[str]:
    """Google Drive share link -> direct download URL, or None if not a Drive file link."""
    match = _DRIVE_FILE.search(url)
    if not match:
        return None
    return f"https://drive.google.com/uc?export=download&id={match.group(1)}"


def extract_document_links(html: str, page_url: str) -> List[str]:
    """PDF links on a post page: WordPress uploads plus Google Drive shares, de-duplicated."""
    links: List[str] = []
    for match in _UPLOAD_PDF.finditer(html):
        links.append(match.group(0))
    for match in _DRIVE_FILE.finditer(html):
        links.append(drive_direct_url(match.group(0)))
    seen: Set[str] = set()
    ordered = []
    for link in links:
        absolute = urljoin(page_url, link)
        if absolute not in seen:
            seen.add(absolute)
            ordered.append(absolute)
    return ordered


def find_bulletin_url(homepage_html: str) -> Optional[str]:
    match = _BULLETIN.search(homepage_html)
    return urljoin(BASE_URL, match.group(0)) if match else None


def _bulletin_date(url: str) -> Optional[datetime]:
    """'CC-Bulletin-New-October-13-2026.pdf' -> 2026-10-13 (UTC midnight)."""
    match = re.search(r"([A-Za-z]+)-(\d{1,2})-(\d{4})\.pdf$", url)
    if not match:
        return None
    try:
        from datetime import timezone
        return datetime.strptime(" ".join(match.groups()), "%B %d %Y").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


class MemanClient:
    """Thin HTTP layer, separate so parsing can be tested without the network."""

    def __init__(self, session=None):
        import requests

        self._session = session or requests.Session()
        self._session.headers.update({"User-Agent": USER_AGENT})

    def text(self, url: str) -> str:
        response = self._session.get(url, timeout=TIMEOUT_S)
        response.raise_for_status()
        return response.text

    def pdf(self, url: str) -> bytes:
        response = self._session.get(url, timeout=TIMEOUT_S, stream=True)
        response.raise_for_status()
        data = response.raw.read(MAX_PDF_BYTES + 1, decode_content=True)
        if len(data) > MAX_PDF_BYTES:
            raise ValueError(f"PDF larger than {MAX_PDF_BYTES} bytes: {url}")
        return data


def _document(client: MemanClient, title: str, pdf_url: Optional[str], page_url: str,
              published: Optional[datetime], doc_type: str) -> MemanDocument:
    pdf: Optional[PdfText] = None
    text = title
    if pdf_url:
        try:
            pdf = extract(client.pdf(pdf_url))
            text = pdf.text or title
        except Exception as exc:  # noqa: BLE001 — one bad PDF must not stop the tick
            logger.error("meman: PDF %s unreadable: %s", pdf_url, exc)
    return MemanDocument(
        title=title, url=pdf_url or page_url, page_url=page_url, published=published,
        doc_type=doc_type, text=text, tags=tag_text(f"{title}\n{text}"), pdf=pdf,
    )


def collect(known_urls: Set[str], client: Optional[MemanClient] = None) -> List[MemanDocument]:
    """New MEMAN documents since last run. `known_urls` = URLs already archived."""
    client = client or MemanClient()
    documents: List[MemanDocument] = []

    for item in parse_feed(client.text(FEED_URL)):
        doc_type = doc_type_for(item.categories, item.title)
        if item.link in known_urls:
            continue
        try:
            links = extract_document_links(client.text(item.link), item.link)
        except Exception as exc:  # noqa: BLE001
            logger.error("meman: post page %s failed: %s", item.link, exc)
            continue
        pending = [u for u in links if u not in known_urls] or ([] if links else [None])
        for pdf_url in pending:
            documents.append(_document(client, item.title, pdf_url, item.link, item.published, doc_type))

    bulletin = find_bulletin_url(client.text(BASE_URL))
    if bulletin is None:
        logger.error("meman: homepage has no CC-Bulletin PDF link — page layout changed?")
    elif bulletin not in known_urls:
        title = f"MEMAN Competency Centre Bulletin {(_bulletin_date(bulletin) or datetime.min).date()}"
        documents.append(_document(client, title, bulletin, BASE_URL, _bulletin_date(bulletin), "cc_bulletin"))
    return documents
