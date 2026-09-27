"""Tell a customer they are running out of allowance, before they are refused.

Why a webhook and not email
---------------------------
This backend has no ESP. The only outbound notification path is Expo push
(api/services/notification_service.py), which reaches the mobile app — the
wrong audience entirely for someone whose CI job is about to start getting
429s. Rather than ship an alerts page that cannot deliver anything, delivery is
a URL the customer supplies. That is also what an API customer wants: it lands
in the system that would page them, not in an inbox.

Email remains the obvious addition once an ESP is configured; the threshold
logic here is delivery-agnostic, so it is one more branch in `_deliver`.

Why the state lives in the database
-----------------------------------
"Have we already warned this account at 80% this month" has to survive a
restart and be shared across replicas, or a customer gets one warning per
replica per deploy. It is two columns on api_usage_alerts rather than a cache.

Ordering
--------
Evaluated on the SUCCESS path of verify_api_key, after metering has produced a
count. Never on the refusal path: the 429 itself is the notification at that
point, and the delivery attempt would add a network call to a request we are
already rejecting.
"""

from __future__ import annotations

import datetime as dt
import ipaddress
import json
import logging
import os
import threading
from typing import Any, Dict, List, Optional
from urllib import error as urlerror
from urllib import request as urlrequest
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

DEFAULT_THRESHOLDS: List[int] = [80, 100]

# The only values the UI offers and the only ones the DB check constraint
# accepts. Kept here so the API can reject a bad value with a message instead of
# surfacing a Postgres constraint violation.
ALLOWED_THRESHOLDS = (50, 75, 80, 90, 100)
MAX_THRESHOLDS = 4

# Delivery timeout. Short: this runs on the request path of a customer's API
# call, and their webhook being slow must not become their API being slow.
WEBHOOK_TIMEOUT_S = float(os.environ.get("INTEGRA_ALERT_WEBHOOK_TIMEOUT", "3"))

# Set INTEGRA_USAGE_ALERTS_ENABLED=0 to stop all delivery without a deploy.
ENABLED = os.environ.get("INTEGRA_USAGE_ALERTS_ENABLED", "1") not in ("0", "false", "False")


def normalise_thresholds(values: Any) -> List[int]:
    """Validate a client-supplied threshold list.

    Raises ValueError with a message meant for the customer. Deduplicated and
    sorted so the "highest threshold crossed" comparison below is well defined.
    """
    if not isinstance(values, (list, tuple)):
        raise ValueError("thresholds must be a list of percentages")
    out = set()
    for value in values:
        try:
            pct = int(value)
        except (TypeError, ValueError):
            raise ValueError(f"{value!r} is not a percentage")
        if pct not in ALLOWED_THRESHOLDS:
            raise ValueError(
                f"{pct} is not an available threshold; choose from "
                f"{', '.join(str(t) for t in ALLOWED_THRESHOLDS)}"
            )
        out.add(pct)
    if not out:
        raise ValueError("choose at least one threshold")
    if len(out) > MAX_THRESHOLDS:
        raise ValueError(f"at most {MAX_THRESHOLDS} thresholds")
    return sorted(out)


def validate_webhook_url(url: Optional[str]) -> Optional[str]:
    """Accept an https URL or nothing.

    http is refused because the payload names the account and its usage, and a
    webhook target is usually pasted from a chat tool that offers https anyway.
    Loopback and link-local hosts are refused because this runs server-side:
    an arbitrary URL that the server will fetch is an SSRF primitive, and the
    metadata endpoints are the reason it matters.
    """
    if url is None or not str(url).strip():
        return None
    url = str(url).strip()
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise ValueError("webhook URL must start with https://")
    host = (parsed.hostname or "").lower()
    if not host:
        raise ValueError("webhook URL has no host")
    if host in ("localhost", "metadata.google.internal") or host.endswith(".localhost"):
        raise ValueError("webhook URL must be publicly reachable")
    # Literal private ranges. Hostnames that RESOLVE to private space are not
    # caught here — that needs resolution at delivery time, and is noted as a
    # limitation rather than pretended away.
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise ValueError("webhook URL must be publicly reachable")
    if len(url) > 2000:
        raise ValueError("webhook URL is too long")
    return url


def load(supabase: Any, user_id: str) -> Dict[str, Any]:
    """The account's alert config, with defaults when no row exists."""
    default = {
        "enabled": True,
        "thresholds": list(DEFAULT_THRESHOLDS),
        "webhook_url": None,
        "last_notified_period": None,
        "last_notified_threshold": None,
        "configured": False,
    }
    try:
        rows = (
            supabase.table("api_usage_alerts")
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
            .data
            or []
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("usage_alerts: load failed for %s: %s", user_id, exc)
        return {**default, "unavailable": True}
    if not rows:
        return default
    row = rows[0]
    return {
        "enabled": bool(row.get("enabled", True)),
        "thresholds": sorted(row.get("thresholds") or DEFAULT_THRESHOLDS),
        "webhook_url": row.get("webhook_url"),
        "last_notified_period": row.get("last_notified_period"),
        "last_notified_threshold": row.get("last_notified_threshold"),
        "configured": True,
    }


def save(
    supabase: Any,
    user_id: str,
    enabled: bool,
    thresholds: List[int],
    webhook_url: Optional[str],
) -> Dict[str, Any]:
    """Upsert the config. Resets the notified marker so a changed threshold can
    fire this month rather than being suppressed by a crossing of the old one."""
    supabase.table("api_usage_alerts").upsert(
        {
            "user_id": user_id,
            "enabled": enabled,
            "thresholds": thresholds,
            "webhook_url": webhook_url,
            "last_notified_period": None,
            "last_notified_threshold": None,
        },
        on_conflict="user_id",
    ).execute()
    return load(supabase, user_id)


def _crossed(percent: float, thresholds: List[int], already: Optional[int]) -> Optional[int]:
    """The highest configured threshold this usage has passed and not yet fired.

    Highest rather than lowest: a customer who jumps from 40% to 95% in one busy
    hour should be told they are at 90, not walked up through 50, 75, 80 in
    three notifications. `already` suppresses re-firing the same level.
    """
    passed = [t for t in thresholds if percent >= t]
    if not passed:
        return None
    highest = max(passed)
    if already is not None and highest <= already:
        return None
    return highest


def _deliver(url: str, payload: Dict[str, Any]) -> bool:
    body = json.dumps(payload).encode("utf-8")
    req = urlrequest.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "integra-markets-usage-alerts/1",
        },
        method="POST",
    )
    try:
        with urlrequest.urlopen(req, timeout=WEBHOOK_TIMEOUT_S) as resp:
            ok = 200 <= resp.status < 300
            if not ok:
                logger.warning("usage_alerts: webhook returned %s", resp.status)
            return ok
    except (urlerror.URLError, OSError, ValueError) as exc:
        logger.warning("usage_alerts: webhook delivery failed: %s", exc)
        return False


def _mark_notified(supabase: Any, user_id: str, period: dt.date, threshold: int) -> None:
    try:
        supabase.table("api_usage_alerts").update({
            "last_notified_period": period.isoformat(),
            "last_notified_threshold": threshold,
        }).eq("user_id", user_id).execute()
    except Exception as exc:  # noqa: BLE001
        logger.error("usage_alerts: could not mark %s notified: %s", user_id, exc)


def _run(
    supabase: Any,
    user_id: str,
    tier: Optional[str],
    used: int,
    limit: int,
    period: dt.date,
) -> None:
    config = load(supabase, user_id)
    if config.get("unavailable") or not config["enabled"]:
        return
    url = config.get("webhook_url")
    if not url:
        # Thresholds with no delivery target are still meaningful: the dashboard
        # reads the same config to decide whether to show a banner. Nothing to
        # send, so nothing to mark.
        return

    # A new month clears the marker. Compared as a string because Supabase
    # returns the date column as ISO text.
    already = config["last_notified_threshold"]
    if str(config.get("last_notified_period") or "") != period.isoformat():
        already = None

    percent = (used / limit * 100) if limit > 0 else 0.0
    threshold = _crossed(percent, config["thresholds"], already)
    if threshold is None:
        return

    payload = {
        "type": "usage_threshold",
        "threshold_percent": threshold,
        "tier": tier,
        "requests_used": used,
        "requests_limit": limit,
        "percent_used": round(percent, 1),
        "period": period.isoformat(),
        "message": (
            f"Integra API usage is at {percent:.0f}% of the {limit:,}-request "
            f"monthly allowance for the {tier} plan "
            f"({used:,} used). The allowance resets on the 1st, UTC."
        ),
        "dashboard_url": "https://dashboard.integramarkets.app/account/usage",
    }
    # Marked before delivery is confirmed, deliberately. A webhook that is down
    # would otherwise be retried on every subsequent request for the rest of the
    # month — thousands of 3-second timeouts bolted onto a customer's own API
    # latency. One attempt per threshold per month; the dashboard is the
    # fallback channel and always shows the true figure.
    _mark_notified(supabase, user_id, period, threshold)
    _deliver(url, payload)


def evaluate_async(
    supabase: Any,
    user_id: str,
    tier: Optional[str],
    used: Optional[int],
    limit: int,
    now: Optional[dt.datetime] = None,
) -> None:
    """Fire-and-forget threshold check. Never raises, never blocks the request.

    Runs on a thread because delivery is a network call on the hot path of
    somebody else's API request. A daemon thread is the right amount of
    machinery here: the work is idempotent within a month, so losing it to a
    shutdown costs one notification the dashboard still shows.
    """
    if not ENABLED or used is None or limit <= 0:
        return
    percent = used / limit * 100
    # Cheap pre-filter so the common case — a key nowhere near its limit — costs
    # nothing at all, not even a thread.
    if percent < min(ALLOWED_THRESHOLDS):
        return

    now = now or dt.datetime.now(dt.timezone.utc)
    period = now.date().replace(day=1)

    def _work() -> None:
        try:
            _run(supabase, user_id, tier, used, limit, period)
        except Exception:  # noqa: BLE001
            logger.exception("usage_alerts: evaluation failed for %s", user_id)

    threading.Thread(target=_work, name="usage-alert", daemon=True).start()
