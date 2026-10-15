"""Vessel / cargo parsers.

Two inputs, two very different levels of detail — kept as separate types so a
count from the NPA summary is never mistaken for a tonnage:

* `parse_tanker_positions` — receiver-level tanker lists in the format
  petroleumprice.ng publishes ("PIS SUMATERA - PMS / Quantity: 27,000 MT / ...").
  Licence-gated source: rows carry their `source`, and waf.sources decides what
  may be published.
* `parse_npa_position` — the Nigerian Ports Authority "Daily Shipping Position"
  as reprinted by NAN, Daily Trust, etc. Free and public, but only COUNTS of
  ships per status, plus which products each status group mentions.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional

from waf.taxonomy import tag_text

REFERENCE_PATH = Path(__file__).with_name("reference.json")

_VESSEL_HEADER = re.compile(
    r"^(?P<name>[A-Z0-9][A-Z0-9 .'\-]{2,40}?)\s+[-–]\s+(?P<product>PMS|AGO|LPG|DPK|ATK|CRUDE|JET A1)\s*$"
)
_FIELD = re.compile(r"^(?P<key>[A-Za-z ]{3,20}):\s*(?P<value>.+)$")
_KNOWN_PORTS = ("Lagos", "Calabar", "Port Harcourt", "Warri", "Onne", "Lekki", "Apapa")
_NUMBER_WORDS = {
    w: i for i, w in enumerate(
        "zero one two three four five six seven eight nine ten eleven twelve thirteen "
        "fourteen fifteen sixteen seventeen eighteen nineteen twenty".split()
    )
}


@lru_cache(maxsize=1)
def reference() -> Dict:
    return json.loads(REFERENCE_PATH.read_text(encoding="utf-8"))


def mt_to_litres(product: str, quantity_mt: float) -> Optional[float]:
    density = reference()["density_kg_per_litre"].get(product)
    return None if density is None else quantity_mt * 1000.0 / density


@dataclass
class TankerPosition:
    vessel_name: str
    product: str
    port: Optional[str] = None
    quantity_mt: Optional[float] = None
    quantity_litres: Optional[float] = None
    arrival_date: Optional[date] = None
    berth_date: Optional[date] = None
    jetty: Optional[str] = None
    receiver: Optional[str] = None
    remarks: Optional[str] = None
    status: str = "anchorage"
    direction: str = "import"
    source: Optional[str] = None
    source_url: Optional[str] = None

    def as_row(self) -> Dict:
        row = asdict(self)
        for key in ("arrival_date", "berth_date"):
            row[key] = row[key].isoformat() if row[key] else None
        return row


def _parse_date(value: str) -> Optional[date]:
    cleaned = value.strip().upper().replace("–", "-")
    for fmt in ("%d %b-%y", "%d %b %y", "%d-%b-%y", "%d %b %Y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


def _status(position: TankerPosition) -> str:
    remarks = (position.remarks or "").lower()
    if "sailed" in remarks:
        return "sailed"
    if "discharged" in remarks or "completed" in remarks:
        return "discharged"
    if "discharg" in remarks:
        return "discharging"
    if "loading" in remarks:
        return "loading"
    if position.berth_date:
        return "berthed"
    return "anchorage"


def _apply_field(position: TankerPosition, key: str, value: str) -> None:
    key = key.strip().lower()
    value = value.strip()
    if key == "quantity":
        number = re.search(r"[\d,.]+", value)
        if number:
            position.quantity_mt = float(number.group(0).replace(",", ""))
            position.quantity_litres = mt_to_litres(position.product, position.quantity_mt)
    elif key in ("arrival date", "berth date"):
        setattr(position, key.replace(" ", "_"), _parse_date(value))
    elif key in ("jetty", "receiver", "remarks"):
        setattr(position, key, value)


def parse_tanker_positions(text: str, source: str, source_url: Optional[str] = None) -> List[TankerPosition]:
    """Parse a tanker-position post. Accepts newline- or ' / '-separated fields."""
    lines = [
        part.strip().replace("﻿", "")
        for line in text.replace("\r", "").split("\n")
        for part in line.split(" / ")
    ]
    positions: List[TankerPosition] = []
    port: Optional[str] = None
    current: Optional[TankerPosition] = None
    for line in lines:
        if not line:
            continue
        if line in _KNOWN_PORTS:
            port = line
            continue
        header = _VESSEL_HEADER.match(line)
        if header:
            product = "ATK" if header.group("product") == "JET A1" else header.group("product")
            current = TankerPosition(
                vessel_name=header.group("name").strip(), product=product, port=port,
                source=source, source_url=source_url,
            )
            positions.append(current)
            continue
        field_match = _FIELD.match(line)
        if current and field_match:
            _apply_field(current, field_match.group("key"), field_match.group("value"))
    for position in positions:
        position.status = _status(position)
    return positions


# --------------------------------------------------------------------------- NPA


@dataclass
class PortPosition:
    """Counts of ships by status from one NPA Daily Shipping Position report."""

    report_date: Optional[date]
    expected: int = 0
    waiting: int = 0
    discharging: int = 0
    products: Dict[str, List[str]] = field(default_factory=lambda: {"expected": [], "waiting": [], "discharging": []})
    product_counts: Dict[str, Dict[str, int]] = field(default_factory=dict)  # bucket -> product -> n
    source_url: Optional[str] = None

    def as_row(self) -> Dict:
        row = asdict(self)
        row["report_date"] = self.report_date.isoformat() if self.report_date else None
        return row


def _first_number(sentence: str) -> Optional[int]:
    match = re.search(r"\b(\d{1,3}|%s)\b(?=[^.]*?\b(?:ships?|vessels?|tankers?)\b)" % "|".join(_NUMBER_WORDS),
                      sentence, re.I)
    if not match:
        return None
    token = match.group(1).lower()
    return int(token) if token.isdigit() else _NUMBER_WORDS[token]


def _bucket(sentence: str) -> Optional[str]:
    lowered = sentence.lower()
    if "waiting to berth" in lowered or "awaiting berth" in lowered or "awaiting berthing" in lowered:
        return "waiting"
    if "discharging" in lowered:
        return "discharging"
    if "expected" in lowered or "will berth" in lowered:
        return "expected"
    return None


def parse_npa_position(text: str, report_date: Optional[date] = None,
                       source_url: Optional[str] = None) -> Optional[PortPosition]:
    """Parse an NPA shipping-position news report. None if the text is not one."""
    if "shipping position" not in text.lower():
        return None
    position = PortPosition(report_date=report_date, source_url=source_url)
    expected_counts: List[int] = []
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        bucket = _bucket(sentence)
        count = _first_number(sentence)
        if bucket is None or count is None:
            continue
        products = [p for p in tag_text(sentence).products if p != "CRUDE" or "crude" in sentence.lower()]
        position.products[bucket] = sorted(set(position.products[bucket]) | set(products))
        if bucket == "expected":
            expected_counts.append(count)
            if len(products) == 1 and re.search(r"\b(carry|carrying|with)\b", sentence, re.I):
                position.product_counts.setdefault(bucket, {})[products[0]] = count
        else:
            setattr(position, bucket, getattr(position, bucket) + count)
    # The headline total and its breakdown ("14 of the expected ships ...") both say
    # "expected"; the total is the largest of them.
    position.expected = max(expected_counts, default=0)
    if not (position.expected or position.waiting or position.discharging):
        return None
    return position
