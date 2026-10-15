"""Report calendar in Nigeria time (WAT, UTC+1, no daylight saving).

A fixed offset rather than zoneinfo("Africa/Lagos"): Lagos has no DST, and the
slim image ships no tz database, so zoneinfo would fail at runtime there.

Report week: previous Friday 17:00 WAT -> Friday 17:00 WAT (data cutoff), so
consecutive weeks tile with no gap (a Saturday-00:00 start would drop every
Friday evening). Generated at the cutoff, published Friday 18:00 WAT. The report id is the ISO week of that
Friday: WAF-2026-W42.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone

WAT = timezone(timedelta(hours=1), "WAT")
CUTOFF = time(17, 0)
PUBLISH = time(18, 0)
FRIDAY = 4


@dataclass(frozen=True)
class ReportWeek:
    report_id: str
    start: datetime      # previous Friday 17:00 WAT
    cutoff: datetime     # Friday 17:00 WAT
    publish_at: datetime  # Friday 18:00 WAT

    @property
    def previous(self) -> "ReportWeek":
        return week_ending(self.cutoff - timedelta(days=7))


def week_ending(moment: datetime) -> ReportWeek:
    """The report week whose Friday falls on or after `moment` (WAT)."""
    local = moment.astimezone(WAT)
    friday = local.date() + timedelta(days=(FRIDAY - local.weekday()) % 7)
    cutoff = datetime.combine(friday, CUTOFF, tzinfo=WAT)
    start = cutoff - timedelta(days=7)
    iso_year, iso_week, _ = friday.isocalendar()
    return ReportWeek(
        report_id=f"WAF-{iso_year}-W{iso_week:02d}",
        start=start,
        cutoff=cutoff,
        publish_at=datetime.combine(friday, PUBLISH, tzinfo=WAT),
    )


def latest_closed_week(now: datetime) -> ReportWeek:
    """Most recent week whose cutoff has passed."""
    week = week_ending(now)
    return week if now >= week.cutoff else week.previous


def from_report_id(report_id: str) -> ReportWeek:
    """'WAF-2026-W42' -> that week. Raises ValueError on a malformed id."""
    try:
        _, year, week = report_id.split("-")
        friday = datetime.fromisocalendar(int(year), int(week.lstrip("W")), FRIDAY + 1)
    except (ValueError, AttributeError) as exc:
        raise ValueError(f"invalid report id {report_id!r}; expected WAF-YYYY-Www") from exc
    return week_ending(friday.replace(tzinfo=WAT))
