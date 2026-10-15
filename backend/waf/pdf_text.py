"""PDF text extraction for WAF publications (MEMAN bulletins, digests, reports).

pypdf only — pure Python, no system packages, fits the slim image. Pages that
yield almost no text are scanned images; they are reported in
`pages_needing_ocr` rather than silently treated as blank, so a scanned bulletin
shows up as a data gap instead of an empty document. OCR (Tesseract) would need
system packages in the image and is deliberately not installed yet.
"""

from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass, field
from typing import List

MIN_CHARS_PER_PAGE = 50


@dataclass
class PdfText:
    sha256: str
    pages: List[str] = field(default_factory=list)
    pages_needing_ocr: List[int] = field(default_factory=list)  # 1-based page numbers

    @property
    def text(self) -> str:
        return "\n\n".join(p for p in self.pages if p)

    @property
    def page_count(self) -> int:
        return len(self.pages)


def extract(pdf_bytes: bytes) -> PdfText:
    """Extract per-page text. Raises ValueError for bytes that are not a PDF."""
    if not pdf_bytes.startswith(b"%PDF"):
        raise ValueError("not a PDF (missing %PDF header)")
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(pdf_bytes))
    result = PdfText(sha256=hashlib.sha256(pdf_bytes).hexdigest())
    for number, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        result.pages.append(text)
        if len(text) < MIN_CHARS_PER_PAGE:
            result.pages_needing_ocr.append(number)
    return result
