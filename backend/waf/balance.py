"""Nigerian downstream supply-balance model (PMS / AGO).

Composite Supply Score, -100 (shortage) .. +100 (glut), from up to three components,
each normalised to [-1, 1]:

  cover   — NMDPRA stock sufficiency (days) vs a neutral level. Stock-based.
  inflow  — inbound cargo activity in the window vs the trailing 30 days. With
            tonnage-level tanker lists it is litres vs consumption; with only NPA
            counts it is the share of reports listing the product as waiting or
            discharging, vs its trailing share.
  price   — ex-depot vs import parity. Not available from free sources yet.

A missing component is a data gap, not a zero: the score is re-weighted over the
components present and confidence falls with each one missing. Every status ships
with its drivers, so no label is ever unexplained.

v1 uses fixed normalisations from reference.json; the spec calls for z-scores
tuned by backtest once the backfill exists.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Dict, List, Optional, Sequence

from waf.vessels import PortPosition, TankerPosition, reference

PRODUCTS = ("PMS", "AGO")


def _clip(value: float) -> float:
    return max(-1.0, min(1.0, value))


def label_for(score: float) -> str:
    for threshold, label in reference()["balance"]["labels"]:
        if score > threshold:
            return label
    return "SHORTAGE RISK"


@dataclass
class Component:
    value: float
    driver: str
    source: Dict[str, str]


def latest_factsheet(product: str, as_of: date) -> Optional[Dict]:
    sheets = [
        s for s in reference()["nmdpra_factsheets"]
        if s["product"] == product and s.get("sufficiency_days") is not None
        and s["month"] <= as_of.strftime("%Y-%m")
    ]
    return max(sheets, key=lambda s: s["month"]) if sheets else None


def cover_component(product: str, as_of: date, gaps: List[str]) -> Optional[Component]:
    cfg = reference()["balance"]
    sheet = latest_factsheet(product, as_of)
    if sheet is None:
        gaps.append(f"No NMDPRA sufficiency figure for {product}.")
        return None
    month_end = datetime.strptime(sheet["month"] + "-28", "%Y-%m-%d").date()
    age = (as_of - month_end).days
    if age > cfg["factsheet_stale_after_days"]:
        gaps.append(f"NMDPRA {product} sufficiency is from {sheet['month']} ({age} days old) — excluded as stale.")
        return None
    days = sheet["sufficiency_days"]
    value = _clip((days - cfg["sufficiency_neutral_days"]) / cfg["sufficiency_scale_days"])
    driver = (f"NMDPRA {product} stock sufficiency {days:.1f} days ({sheet['month']}) "
              f"vs {cfg['sufficiency_target_days']}-day target")
    return Component(value, driver, {"title": sheet["source"], "url": sheet["source_url"]})


def _inbound(position: PortPosition, product: str) -> bool:
    return product in position.products.get("waiting", []) or product in position.products.get("discharging", [])


def _share(positions: Sequence[PortPosition], product: str) -> float:
    return sum(_inbound(p, product) for p in positions) / len(positions)


def inflow_component(product: str, window: Sequence[PortPosition], trailing: Sequence[PortPosition],
                     tankers: Sequence[TankerPosition], window_days: int, gaps: List[str]) -> Optional[Component]:
    litres = [t.quantity_litres for t in tankers
              if t.product == product and t.quantity_litres and t.status in ("anchorage", "berthed", "discharging")]
    if litres:
        demand = reference()["consumption_benchmark_litres_per_day"][product] * window_days
        ratio = sum(litres) / demand
        driver = (f"{len(litres)} {product} cargoes inbound/discharging ≈ {sum(litres) / 1e6:.0f}M litres "
                  f"= {ratio:.2f}× est. {window_days}-day consumption")
        return Component(_clip(ratio - 1.0), driver, {"title": "Tanker positions", "url": ""})
    if not window:
        gaps.append(f"No NPA shipping-position reports in the window for {product} inflow.")
        return None
    if not trailing:
        gaps.append("No trailing 30-day NPA history to compare inflow against.")
        return None
    now_share, base_share = _share(window, product), _share(trailing, product)
    driver = (f"{product} listed as waiting/discharging in {now_share:.0%} of NPA reports this window "
              f"vs {base_share:.0%} trailing 30 days (counts only, no tonnage)")
    latest = window[-1]
    return Component(_clip((now_share - base_share) * 2), driver,
                     {"title": "NPA Daily Shipping Position", "url": latest.source_url or ""})


def congestion(window: Sequence[PortPosition], trailing: Sequence[PortPosition]) -> Dict:
    cfg = reference()["balance"]
    if not window:
        return {"flag": False, "waiting": None, "trailing_avg": None}
    waiting = window[-1].waiting
    avg = sum(p.waiting for p in trailing) / len(trailing) if trailing else None
    flag = waiting >= cfg["congestion_min_waiting"] and (avg is None or waiting >= cfg["congestion_waiting_multiple"] * avg)
    return {"flag": flag, "waiting": waiting, "trailing_avg": round(avg, 1) if avg is not None else None,
            "scope": "all cargo at Lagos ports (NPA counts are not product-specific)"}


def compute_balance(product: str, as_of: date, window: Sequence[PortPosition],
                    trailing: Sequence[PortPosition], tankers: Sequence[TankerPosition] = (),
                    window_days: int = 7) -> Dict:
    if product not in PRODUCTS:
        raise ValueError(f"product must be one of {PRODUCTS}")
    gaps: List[str] = ["No ex-depot vs import-parity price feed yet (price component excluded)."]
    weights = reference()["balance"]["weights"]
    components = {
        "cover": cover_component(product, as_of, gaps),
        "inflow": inflow_component(product, window, trailing, tankers, window_days, gaps),
    }
    present = {k: c for k, c in components.items() if c is not None}
    if not present:
        return {"product": product, "as_of": as_of.isoformat(), "status": "INSUFFICIENT DATA", "score": None,
                "confidence": 0.0, "drivers": [], "components": {}, "congestion": congestion(window, trailing),
                "data_gaps": gaps, "sources": []}
    total_weight = sum(weights[k] for k in present)
    score = round(100 * sum(weights[k] * c.value for k, c in present.items()) / total_weight)
    return {
        "product": product,
        "as_of": as_of.isoformat(),
        "status": label_for(score),
        "score": score,
        "confidence": round(len(present) / len(weights), 2),
        "drivers": [c.driver for c in present.values()],
        "components": {k: round(c.value, 3) for k, c in present.items()},
        "congestion": congestion(window, trailing),
        "data_gaps": gaps,
        "sources": [c.source for c in present.values()],
        "model": "waf-balance-v1 (fixed normalisation; backtest tuning pending)",
    }
