"""WAF Weekly Report builder — a pure function of stored inputs.

Everything here is deterministic: the same documents, positions and balances
always produce the same report and the same `inputs_hash`, which is what makes a
backfilled week reproducible. No LLM writes any of it yet; every bullet is built
from a stored headline or a computed metric and carries its source.

Sentiment is NET sentiment: bullish share minus bearish share, in points
(-100..+100), taken from each document's label under the active scoring model.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import defaultdict
from datetime import datetime
from typing import Dict, Iterable, List, Optional, Sequence

from waf.sources import filter_for_public, tier_of
from waf.weeks import ReportWeek

SEGMENTS = {
    "crude": lambda t: bool(t.get("grade")) or "CRUDE" in t.get("product", []) or "upstream" in t.get("segment", []),
    "pms": lambda t: "PMS" in t.get("product", []),
    "ago": lambda t: "AGO" in t.get("product", []),
    "lpg": lambda t: "LPG" in t.get("product", []),
    "refining": lambda t: "refining" in t.get("segment", []) or "dangote_refinery" in t.get("entity", []),
    "fx_macro": lambda t: "fx_macro" in t.get("segment", []) or "cbn" in t.get("entity", []),
    "mining": lambda t: "mining" in t.get("segment", []) or "solid_minerals" in t.get("entity", []),
}
REGULATORS = {"nuprc", "nmdpra", "nnpc", "cbn", "ministry_petroleum"}
_DIRECTION = {"bullish": 1, "bearish": -1}
_TIER_WEIGHT = {1: 1.0, 2: 0.8, 3: 0.6}
MAX_EVENTS = 8
TEASER_MAX = 120


def _signed(doc: Dict) -> int:
    return _DIRECTION.get((doc.get("sentiment") or {}).get("sentiment"), 0)


def _net(docs: Sequence[Dict]) -> Optional[int]:
    scored = [d for d in docs if d.get("sentiment")]
    if not scored:
        return None
    return round(100 * sum(_signed(d) for d in scored) / len(scored))


def _bullish_share(docs: Sequence[Dict]) -> Optional[int]:
    scored = [d for d in docs if d.get("sentiment")]
    return round(100 * sum(_signed(d) == 1 for d in scored) / len(scored)) if scored else None


def segment_block(now: Sequence[Dict], prev: Sequence[Dict]) -> Dict:
    net, prev_net = _net(now), _net(prev)
    change = None if net is None or prev_net is None else net - prev_net
    return {
        "net": net, "bullish_share": _bullish_share(now), "articles": len(now),
        "prev_net": prev_net, "change": change,
        "direction": None if change is None else ("up" if change > 0 else "down" if change < 0 else "flat"),
    }


def sentiment_section(docs: Sequence[Dict], prev_docs: Sequence[Dict]) -> Dict:
    section = {"overall": segment_block(docs, prev_docs), "segments": {}}
    for name, member in SEGMENTS.items():
        section["segments"][name] = segment_block(
            [d for d in docs if member(d["tags"])], [d for d in prev_docs if member(d["tags"])]
        )
    movers = sorted(
        ((n, b["change"]) for n, b in section["segments"].items() if b["change"] is not None),
        key=lambda x: abs(x[1]), reverse=True,
    )
    section["top_movers"] = [{"segment": n, "change": c} for n, c in movers[:3]]
    return section


def _title_key(title: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", (title or "").lower()).strip()[:80]


def cluster_events(docs: Iterable[Dict]) -> List[Dict]:
    """Group syndicated copies of one story; rank by credibility x reach x strength."""
    clusters: Dict[str, List[Dict]] = defaultdict(list)
    for doc in docs:
        clusters[_title_key(doc.get("title", ""))].append(doc)
    events = []
    for members in clusters.values():
        lead = min(members, key=lambda d: (tier_of(d["source"]), d.get("published_at") or ""))
        sources = sorted({d["source"] for d in members})
        strength = 0.5 + abs(_signed(lead)) * 0.5
        events.append({
            "title": lead.get("title"), "url": lead.get("url"), "source": lead["source"],
            "published_at": lead.get("published_at"), "document_id": lead.get("id"),
            "syndicated_by": sources,
            "instruments": {k: lead["tags"].get(k, []) for k in ("grade", "product", "entity")},
            "sentiment": (lead.get("sentiment") or {}).get("sentiment", "unscored"),
            "rank_score": round(_TIER_WEIGHT.get(tier_of(lead["source"]), 0.6) * len(sources) * strength, 3),
        })
    return sorted(events, key=lambda e: (-e["rank_score"], e["published_at"] or ""))


def grade_watch(docs: Sequence[Dict], prev_docs: Sequence[Dict]) -> List[Dict]:
    grades = sorted({g for d in docs for g in d["tags"].get("grade", [])})
    rows = []
    for grade in grades:
        now = [d for d in docs if grade in d["tags"].get("grade", [])]
        prev = [d for d in prev_docs if grade in d["tags"].get("grade", [])]
        block = segment_block(now, prev)
        block["grade"] = grade
        block["headlines"] = [{"title": d.get("title"), "url": d.get("url"), "source": d["source"]} for d in now[:2]]
        rows.append(block)
    return sorted(rows, key=lambda r: -r["articles"])


def implications(balances: Dict[str, Dict], sentiment: Dict) -> List[Dict]:
    """Conditional statements tied to the numbers. Model view, not advice."""
    out = []
    for product, bal in balances.items():
        status, score = bal.get("status"), bal.get("score")
        if status in ("TIGHT", "SHORTAGE RISK"):
            out.append({"text": f"{product} reads {status} ({score}). If no additional {product} cargoes berth in the "
                                f"coming week, expect the call to hold; ex-depot prices rising would confirm it.",
                        "basis": bal.get("drivers", [])})
        elif status in ("COMFORTABLE", "GLUT"):
            out.append({"text": f"{product} reads {status} ({score}). If inbound activity stays above its 30-day "
                                f"norm, downward pressure on ex-depot prices is the expected direction.",
                        "basis": bal.get("drivers", [])})
        congestion = bal.get("congestion") or {}
        if congestion.get("flag"):
            out.append({"text": f"Port congestion: {congestion['waiting']} ships waiting vs {congestion['trailing_avg']} "
                                f"30-day average. If berthing does not clear, discharge delays tighten prompt supply.",
                        "basis": [congestion.get("scope", "")]})
    for mover in sentiment.get("top_movers", [])[:1]:
        if abs(mover["change"]) >= 20:
            out.append({"text": f"{mover['segment'].upper()} sentiment moved {mover['change']:+d} pts week on week; "
                                f"a second week in the same direction would make it a trend rather than noise.",
                        "basis": ["Integra WAF sentiment index"]})
    return out[:5]


def executive_summary(balances: Dict[str, Dict], events: List[Dict], sentiment: Dict) -> List[Dict]:
    bullets: List[Dict] = []
    overall = sentiment["overall"]
    if overall["net"] is not None:
        change = "" if overall["change"] is None else f" ({overall['change']:+d} w/w)"
        bullets.append({"text": f"WAF net sentiment {overall['net']:+d}{change} across {overall['articles']} articles.",
                        "sources": ["Integra WAF sentiment index"]})
    for product, bal in balances.items():
        if bal.get("score") is not None:
            bullets.append({"text": f"{product} supply: {bal['status']} ({bal['score']:+d}) — {bal['drivers'][0]}.",
                            "sources": [s.get("url") or s.get("title") for s in bal.get("sources", [])]})
    for event in events:
        if len(bullets) >= 5:
            break
        bullets.append({"text": f"{event['title']} ({event['source']}).", "sources": [event["url"]]})
    return bullets[:5]


def teaser(summary: List[Dict], overall: Dict) -> str:
    head = next((b["text"] for b in summary if "supply:" in b["text"]), summary[0]["text"] if summary else "")
    net = "" if overall.get("net") is None else f" | Net {overall['net']:+d}"
    room = TEASER_MAX - len(net)
    head = head if len(head) <= room else head[: room - 1].rstrip() + "…"
    return head + net


def inputs_hash(docs: Sequence[Dict], balances: Dict, positions: Sequence[Dict]) -> str:
    material = {
        "docs": sorted((d.get("id"), (d.get("sentiment") or {}).get("sentiment")) for d in docs),
        "balances": balances,
        "positions": sorted(json.dumps(p, sort_keys=True, default=str) for p in positions),
    }
    return hashlib.sha256(json.dumps(material, sort_keys=True, default=str).encode()).hexdigest()


def build_report(week: ReportWeek, docs: Sequence[Dict], prev_docs: Sequence[Dict],
                 balances: Dict[str, Dict], positions: Sequence[Dict], data_gaps: List[str]) -> Dict:
    """Assemble the report. Documents at or after the cutoff are dropped (no look-ahead)."""
    cutoff = week.cutoff.isoformat()
    docs = [d for d in docs if d.get("published_at") and datetime.fromisoformat(d["published_at"]) < week.cutoff]
    sentiment = sentiment_section(docs, prev_docs)
    events = filter_for_public(cluster_events(docs))[:MAX_EVENTS]
    summary = executive_summary(balances, events, sentiment)
    gaps = list(data_gaps) + [g for b in balances.values() for g in b.get("data_gaps", [])]
    gaps.append("No dated event calendar source yet (OSP releases, strike deadlines, maintenance).")
    payload = {
        "report_id": week.report_id,
        "window": {"start": week.start.isoformat(), "cutoff": cutoff, "publish_at": week.publish_at.isoformat()},
        "executive_summary": summary,
        "teaser": teaser(summary, sentiment["overall"]),
        "sentiment": sentiment,
        "supply_balance": {"balances": balances, "port_positions": list(positions)},
        "key_events": events,
        "grade_watch": grade_watch(docs, prev_docs),
        "regulatory": [e for e in events if REGULATORS & set(e.get("instruments", {}).get("entity", []))],
        "implications": implications(balances, sentiment),
        "implications_label": "Model view from Integra data, not investment advice.",
        "what_to_watch": [],
        "data_gaps": sorted(set(gaps)),
        "sources": sorted({e["url"] for e in events if e.get("url")}),
        "documents_analysed": len(docs),
    }
    payload["inputs_hash"] = inputs_hash(docs, balances, positions)
    return payload
