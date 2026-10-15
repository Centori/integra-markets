"""WAF module: acceptance tests from docs/waf/WAF_BUILD_SPEC.md, no network or database."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

import pytest

from waf import balance, meman, pdf_text, report, sources, taxonomy, vessels, weeks
from waf.taxonomy import Tags


# ----------------------------------------------------------------- taxonomy

@pytest.mark.parametrize("spelling", ["Bonny Lt", "BONNY LIGHT", "Bonny-Light", "bonny light"])
def test_grade_spellings_resolve_to_bonny_light(spelling):
    assert taxonomy.normalise_grade(spelling) == "bonny_light"


@pytest.mark.parametrize("text, absent_tag", [
    ("The meeting was about refinery capacity", ("grades", "abo")),
    ("Prices rose two weeks ago", ("products", "AGO")),
    ("Geopolitical tension in the region", ("grades", "ten")),
    ("Goldmanship and bullion desks", ("products", "PMS")),
])
def test_word_boundaries_and_acronym_case(text, absent_tag):
    tag_type, tag = absent_tag
    assert tag not in getattr(taxonomy.tag_text(text), tag_type)


def test_tags_products_entities_and_country():
    tags = taxonomy.tag_text("Dangote Refinery cuts PMS ex-depot price in Lagos as NMDPRA reviews AGO supply")
    assert {"PMS", "AGO"} <= set(tags.products)
    assert {"dangote_refinery", "nmdpra"} <= set(tags.entities)
    assert "NG" in tags.countries
    assert "downstream" in tags.segments


def test_relevance_gate():
    assert not taxonomy.is_waf_relevant(taxonomy.tag_text("Senate confirms new ministers in Abuja"))
    assert taxonomy.is_waf_relevant(taxonomy.tag_text("Petrol queues return to Abuja filling stations"))
    assert taxonomy.is_waf_relevant(taxonomy.tag_text("Forcados differentials weaken on unsold cargoes"))


# ----------------------------------------------------------------- vessels

PIS_INLINE = ("PIS SUMATERA - PMS / Quantity: 27,000 MT / Arrival Date: 01 OCT-26 / Jetty: New Oil / "
              "Berth Date: 01 OCT-26 / Receiver: NIPCO / Remarks: Discharging in progress")

PIS_BLOCK = """Confirmed tanker positions:
Lagos
PIS SUMATERA - PMS
﻿﻿Quantity: 27,000 MT
﻿﻿Arrival Date: 01 OCT-26
﻿﻿Jetty: New Oil
﻿﻿Berth Date: 01 OCT-26
﻿﻿Receiver: NIPCO
﻿﻿Remarks: Discharging in progress
MH DAISEN - PMS
Quantity: 30,000 MT
Arrival Date: 03 OCT-26
"""


@pytest.mark.parametrize("text", [PIS_INLINE, PIS_BLOCK])
def test_parses_pis_sumatera_with_correct_litres(text):
    first = vessels.parse_tanker_positions(text, source="petroleumprice.ng")[0]
    assert first.vessel_name == "PIS SUMATERA"
    assert first.product == "PMS"
    assert first.quantity_mt == 27000
    assert first.quantity_litres == pytest.approx(27000 * 1000 / 0.74)
    assert first.arrival_date == date(2026, 10, 1) == first.berth_date
    assert (first.jetty, first.receiver, first.status) == ("New Oil", "NIPCO", "discharging")


def test_second_vessel_without_berth_is_at_anchorage():
    positions = vessels.parse_tanker_positions(PIS_BLOCK, source="petroleumprice.ng")
    assert [p.vessel_name for p in positions] == ["PIS SUMATERA", "MH DAISEN"]
    assert positions[0].port == "Lagos"
    assert positions[1].status == "anchorage"


NPA_TEXT = (
    "The Nigerian Ports Authority (NPA) says that 46 ships laden with petroleum products, food items and "
    "other goods are expected at Apapa, Lekki Deep Sea Port and Tincan Island Ports in Lagos on Tuesday. "
    "Disclosing this in its Daily Shipping Position, the authority said the vessels are expected from April 28 "
    "to May 8, 2026. It said that 14 of the expected ships contained containers of different goods, while 32 "
    "other ships are expected to berth with fresh fish, general cargos, aviation fuel, crude oil, base oil, "
    "diesel, gasoline, petrol and bulk wheat. Meanwhile, the NPA noted that 11 ships and tanker vessels had "
    "arrived at the three ports waiting to berth with general cargos, bulk urea, aviation fuel, gasoline, bulk "
    "fertiliser and crude oil. It also stated that 21 ships are presently discharging bulk urea, containers, "
    "bulk gas, gasoline, petrol, bulk gypsum, bulk fertiliser, crude oil, bulk urea and bulk fertiliser."
)


def test_parses_npa_shipping_position_counts_and_products():
    position = vessels.parse_npa_position(NPA_TEXT, report_date=date(2026, 4, 28), source_url="https://x")
    assert (position.expected, position.waiting, position.discharging) == (46, 11, 21)
    assert "PMS" in position.products["waiting"] and "PMS" in position.products["discharging"]
    assert "LPG" in position.products["discharging"]  # "bulk gas"
    assert "AGO" not in position.products["waiting"]


def test_npa_parser_sums_waiting_across_ports_and_reads_number_words():
    text = ("In its Daily Shipping Position, the NPA said six vessels were waiting to berth at Apapa with "
            "diesel. It said another five vessels were waiting to berth at Lekki Deep Sea Port, carrying petrol.")
    position = vessels.parse_npa_position(text)
    assert position.waiting == 11
    assert {"AGO", "PMS"} <= set(position.products["waiting"])


def test_non_npa_text_is_not_a_position():
    assert vessels.parse_npa_position("Dangote cuts petrol price by N20") is None


# ----------------------------------------------------------------- balance

def _position(day, waiting=5, products=("PMS",)):
    return vessels.PortPosition(report_date=day, waiting=waiting, discharging=3,
                                products={"expected": [], "waiting": list(products), "discharging": []},
                                source_url=f"https://npa/{day}")


def test_balance_without_stock_data_still_returns_status_drivers_and_gaps():
    as_of = date(2026, 10, 15)  # NMDPRA reference figures are months old -> stale
    window = [_position(as_of - timedelta(days=i)) for i in range(5)]
    trailing = [_position(as_of - timedelta(days=10 + i), products=()) for i in range(20)]
    result = balance.compute_balance("PMS", as_of, window, trailing)
    assert result["status"] in ("GLUT", "COMFORTABLE", "BALANCED", "TIGHT", "SHORTAGE RISK")
    assert result["score"] > 0  # PMS inbound far more often than its trailing norm
    assert result["drivers"] and result["sources"]
    assert any("stale" in g for g in result["data_gaps"])
    assert any("price" in g for g in result["data_gaps"])
    assert result["confidence"] < 1


def test_balance_with_no_inputs_is_insufficient_not_balanced():
    result = balance.compute_balance("AGO", date(2026, 10, 15), [], [])
    assert result["status"] == "INSUFFICIENT DATA" and result["score"] is None and result["data_gaps"]


def test_balance_uses_fresh_nmdpra_cover():
    result = balance.compute_balance("PMS", date(2026, 4, 20), [], [])
    assert result["components"]["cover"] == pytest.approx((21.2 - 20) / 10, abs=1e-3)


def test_tanker_litres_drive_inflow_when_available():
    tankers = [vessels.TankerPosition("A", "PMS", quantity_litres=200e6, status="discharging")]
    result = balance.compute_balance("PMS", date(2026, 10, 15), [], [], tankers, window_days=7)
    assert result["components"]["inflow"] == pytest.approx(200e6 / (50e6 * 7) - 1, abs=1e-3)


def test_labels():
    assert balance.label_for(60) == "GLUT"
    assert balance.label_for(50) == "COMFORTABLE"
    assert balance.label_for(0) == "BALANCED"
    assert balance.label_for(-30) == "TIGHT"
    assert balance.label_for(-80) == "SHORTAGE RISK"


# ----------------------------------------------------------------- weeks

def test_report_week_ids_and_tiling():
    week = weeks.week_ending(datetime(2026, 10, 14, 12, tzinfo=timezone.utc))  # Wednesday
    assert week.report_id == "WAF-2026-W42"
    assert week.cutoff == datetime(2026, 10, 16, 17, tzinfo=weeks.WAT)
    assert week.publish_at == datetime(2026, 10, 16, 18, tzinfo=weeks.WAT)
    assert week.previous.cutoff == week.start  # no gap between weeks
    assert weeks.from_report_id("WAF-2026-W42") == week


def test_latest_closed_week():
    before = datetime(2026, 10, 16, 16, 59, tzinfo=weeks.WAT)
    after = datetime(2026, 10, 16, 17, 1, tzinfo=weeks.WAT)
    assert weeks.latest_closed_week(before).report_id == "WAF-2026-W41"
    assert weeks.latest_closed_week(after).report_id == "WAF-2026-W42"


def test_bad_report_id():
    with pytest.raises(ValueError):
        weeks.from_report_id("W42")


# ----------------------------------------------------------------- report

WEEK = weeks.from_report_id("WAF-2026-W42")


def _doc(i, title, source, published, label="bullish", tags=None):
    return {"id": f"d{i}", "title": title, "source": source, "url": f"https://news/{i}",
            "published_at": published.isoformat(), "sentiment": {"sentiment": label},
            "tags": tags or {"country": ["NG"], "product": ["PMS"]}}


def _docs():
    t = WEEK.cutoff - timedelta(days=1)
    return [
        _doc(1, "Dangote cuts petrol price", "Punch", t, tags={"product": ["PMS"], "entity": ["dangote_refinery"]}),
        _doc(2, "Dangote cuts petrol price", "Vanguard", t),
        _doc(3, "NUPRC sets new crude OSP rules", "WAF Wire: Regulators", t, "bearish",
             {"entity": ["nuprc"], "grade": ["bonny_light"], "product": ["CRUDE"]}),
        _doc(4, "Leaked after cutoff", "Punch", WEEK.cutoff + timedelta(minutes=5)),
    ]


def _build(docs=None, balances=None):
    balances = balances if balances is not None else {
        "PMS": {"status": "TIGHT", "score": -30, "drivers": ["d1"], "sources": [{"url": "https://npa"}],
                "data_gaps": [], "congestion": {"flag": True, "waiting": 20, "trailing_avg": 8.0, "scope": "x"}}}
    return report.build_report(WEEK, docs if docs is not None else _docs(), [], balances, [], [])


def test_report_has_no_look_ahead():
    payload = _build()
    assert payload["documents_analysed"] == 3
    assert all(e["title"] != "Leaked after cutoff" for e in payload["key_events"])


def test_syndicated_story_is_one_event_with_two_sources():
    event = next(e for e in _build()["key_events"] if e["title"] == "Dangote cuts petrol price")
    assert event["syndicated_by"] == ["Punch", "Vanguard"]


def test_every_summary_bullet_has_a_source_and_teaser_fits():
    payload = _build()
    assert payload["executive_summary"]
    assert all(b["sources"] for b in payload["executive_summary"])
    assert len(payload["teaser"]) <= report.TEASER_MAX
    long = _build(balances={"PMS": {"status": "TIGHT", "score": -30, "drivers": ["x" * 300],
                                    "sources": [{"url": "u"}], "data_gaps": []}})
    assert len(long["teaser"]) <= report.TEASER_MAX


def test_report_is_reproducible():
    assert _build()["inputs_hash"] == _build()["inputs_hash"]
    assert _build()["inputs_hash"] != _build(docs=_docs()[:2])["inputs_hash"]


def test_report_sections_and_regulatory_and_implications():
    payload = _build()
    assert payload["grade_watch"][0]["grade"] == "bonny_light"
    assert [e["title"] for e in payload["regulatory"]] == ["NUPRC sets new crude OSP rules"]
    assert any("congestion" in i["text"].lower() for i in payload["implications"])
    assert payload["sentiment"]["segments"]["pms"]["articles"] == 2


def test_report_still_builds_with_no_documents():
    payload = _build(docs=[], balances={})
    assert payload["documents_analysed"] == 0 and payload["data_gaps"]


# ----------------------------------------------------------------- redistribution

def test_petroleumprice_rows_are_headline_only_until_licensed(monkeypatch):
    row = {"id": "1", "source": "petroleumprice.ng", "title": "Depot prices", "url": "u",
           "published_at": "2026-10-01", "content": "₦X depot prices...", "tags": {"product": ["PMS"]}}
    monkeypatch.delenv("PPNG_LICENSED", raising=False)
    assert sources.filter_for_public([row]) == [{"id": "1", "source": "petroleumprice.ng", "title": "Depot prices",
                                                "url": "u", "published_at": "2026-10-01", "restricted": True}]
    assert not sources.is_public_source(sources.PPNG_SOURCE)
    monkeypatch.setenv("PPNG_LICENSED", "true")
    assert sources.filter_for_public([row]) == [row]


def test_restricted_events_never_leak_into_report(monkeypatch):
    monkeypatch.delenv("PPNG_LICENSED", raising=False)
    doc = _doc(9, "Tanker positions", "petroleumprice.ng", WEEK.cutoff - timedelta(hours=1))
    doc["content"] = "PIS SUMATERA 27,000 MT"
    event = _build(docs=[doc])["key_events"][0]
    assert event.get("restricted") and "instruments" not in event


# ----------------------------------------------------------------- MEMAN

def test_drive_share_link_converts_to_direct_download():
    url = "https://drive.google.com/file/d/1S-5P5jnpHKHZS6N7pUI8vo_8y4PVsldr/view?usp=sharing"
    assert meman.drive_direct_url(url) == (
        "https://drive.google.com/uc?export=download&id=1S-5P5jnpHKHZS6N7pUI8vo_8y4PVsldr")


def test_extracts_upload_pdfs_and_drive_links_once():
    html = ('<a href="https://moman.org/wp-content/uploads/2026/10/Digest.pdf">x</a>'
            '<a href="https://moman.org/wp-content/uploads/2026/10/Digest.pdf">again</a>'
            '<a href="https://drive.google.com/file/d/ABC123/view?usp=sharing">drive</a>')
    assert meman.extract_document_links(html, "https://moman.org/post/") == [
        "https://moman.org/wp-content/uploads/2026/10/Digest.pdf",
        "https://drive.google.com/uc?export=download&id=ABC123",
    ]


def test_finds_bulletin_and_dates_it():
    html = '<a href="https://moman.org/wp-content/uploads/2026/10/CC-Bulletin-New-October-13-2026.pdf">Download</a>'
    url = meman.find_bulletin_url(html)
    assert url.endswith("CC-Bulletin-New-October-13-2026.pdf")
    assert meman._bulletin_date(url).date() == date(2026, 10, 13)


def test_doc_types():
    assert meman.doc_type_for(["Energy Digest"]) == "energy_digest"
    assert meman.doc_type_for(["Market Analysis by the Industry Competency Centre"]) == "market_analysis"
    assert meman.doc_type_for([], "Daily bulletin") == "cc_bulletin"


def _pdf_with_text(text: str) -> bytes:
    """Minimal one-page PDF with a Helvetica text line (hand-built, no generator dependency)."""
    stream = f"BT /F1 12 Tf 50 750 Td ({text}) Tj ET".encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = bytearray(b"%PDF-1.4\n"), []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % number + body + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    out += b"".join(b"%010d 00000 n \n" % o for o in offsets)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objects) + 1, xref)
    return bytes(out)


def test_pdf_text_extraction_and_ocr_flag():
    good = pdf_text.extract(_pdf_with_text(
        "MEMAN members hold significant stock of PMS and AGO in Lagos depots and expect no outages"))
    assert "significant stock" in good.text and good.pages_needing_ocr == [] and len(good.sha256) == 64
    blank = pdf_text.extract(_pdf_with_text(""))
    assert blank.pages_needing_ocr == [1]
    with pytest.raises(ValueError):
        pdf_text.extract(b"<html>not a pdf</html>")


FEED = """<?xml version="1.0"?><rss version="2.0"><channel><title>MEMAN</title>
<item><title>Energy Digest - October 2026 1</title><link>https://moman.org/energy-digest-october-2026-1/?utm_source=rss</link>
<pubDate>Wed, 07 Oct 2026 16:19:39 +0000</pubDate><category>Energy Digest</category><guid>https://moman.org/?p=9007</guid></item>
<item><title>Old Post</title><link>https://moman.org/old/</link><pubDate>Wed, 01 Jul 2026 10:00:00 +0000</pubDate>
<category>Articles</category><guid>https://moman.org/?p=1</guid></item>
</channel></rss>"""


class FakeClient:
    def __init__(self, pdf):
        self.pdf_bytes, self.fetched = pdf, []

    def text(self, url):
        self.fetched.append(url)
        if url == meman.FEED_URL:
            return FEED
        if url == meman.BASE_URL:
            return '<a href="/wp-content/uploads/2026/10/CC-Bulletin-New-October-13-2026.pdf">Bulletin</a>'
        return '<a href="https://moman.org/wp-content/uploads/2026/10/Energy-Digest.pdf">PDF</a>'

    def pdf(self, url):
        self.fetched.append(url)
        return self.pdf_bytes


def test_collect_new_post_pdf_and_bulletin_tagged_from_full_text():
    client = FakeClient(_pdf_with_text("MEMAN assures significant stock of PMS in Nigeria, no outages expected"))
    docs = meman.collect(known_urls={"https://moman.org/old/"}, client=client)
    assert [d.doc_type for d in docs] == ["energy_digest", "cc_bulletin"]
    digest = docs[0]
    assert digest.url == "https://moman.org/wp-content/uploads/2026/10/Energy-Digest.pdf"
    assert digest.page_url == "https://moman.org/energy-digest-october-2026-1/"
    assert digest.supply_signal and "PMS" in digest.tags.products and "meman" in digest.tags.entities
    assert digest.as_article()["source"] == "MEMAN"
    assert "https://moman.org/old/" not in client.fetched


def test_collect_skips_already_archived_pdfs():
    client = FakeClient(_pdf_with_text("x" * 60))
    known = {"https://moman.org/wp-content/uploads/2026/10/Energy-Digest.pdf",
             "https://moman.org/wp-content/uploads/2026/10/CC-Bulletin-New-October-13-2026.pdf",
             "https://moman.org/old/"}
    assert meman.collect(known_urls=known, client=client) == []
