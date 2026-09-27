"""Quota alerts: the threshold logic, and the SSRF the webhook field would be.

Delivery is a customer-supplied URL because this backend has no ESP — the only
outbound path is Expo push, which reaches the mobile app rather than the person
whose CI job is about to start getting 429s. That choice moves a server-side
fetch of an arbitrary URL onto the request path, so the validator is a security
boundary and not a niceness check.
"""

from __future__ import annotations

import datetime as dt
import types

import pytest

from services import usage_alerts


class TestThresholdValidation:
    def test_defaults_are_accepted(self):
        assert usage_alerts.normalise_thresholds([80, 100]) == [80, 100]

    def test_output_is_sorted_and_deduplicated(self):
        """Sorted because the crossing check takes max(); deduplicated so the
        same level cannot be configured twice and counted twice."""
        assert usage_alerts.normalise_thresholds([100, 80, 80]) == [80, 100]

    @pytest.mark.parametrize("bad", [[0], [42], [101], [-10], [999]])
    def test_a_threshold_outside_the_offered_set_is_refused(self, bad):
        """Refused here so the customer gets a sentence, rather than the DB's
        check constraint surfacing as a 500."""
        with pytest.raises(ValueError, match="not an available threshold"):
            usage_alerts.normalise_thresholds(bad)

    def test_an_empty_list_is_refused(self):
        with pytest.raises(ValueError, match="at least one"):
            usage_alerts.normalise_thresholds([])

    def test_too_many_thresholds_are_refused(self):
        with pytest.raises(ValueError, match="at most"):
            usage_alerts.normalise_thresholds([50, 75, 80, 90, 100])

    def test_a_non_list_is_refused(self):
        with pytest.raises(ValueError, match="must be a list"):
            usage_alerts.normalise_thresholds("80")

    def test_the_offered_set_matches_the_database_constraint(self):
        """ALLOWED_THRESHOLDS and the check constraint in
        20260927_api_usage_analytics.sql have to agree, or a value this accepts
        is rejected by Postgres as a 500."""
        import pathlib
        import re

        sql = pathlib.Path(__file__).parents[2].joinpath(
            "supabase/migrations/20260927_api_usage_analytics.sql"
        ).read_text()
        in_sql = re.search(r"thresholds <@ array\[([0-9,]+)\]", sql)
        assert in_sql, "could not find the thresholds check constraint"
        assert sorted(int(v) for v in in_sql.group(1).split(",")) == \
            sorted(usage_alerts.ALLOWED_THRESHOLDS)


class TestWebhookValidation:
    def test_an_https_url_is_accepted(self):
        url = "https://hooks.example.com/services/T000/B000/xyz"
        assert usage_alerts.validate_webhook_url(url) == url

    def test_blank_clears_the_field(self):
        assert usage_alerts.validate_webhook_url("") is None
        assert usage_alerts.validate_webhook_url(None) is None
        assert usage_alerts.validate_webhook_url("   ") is None

    def test_http_is_refused(self):
        """The payload names the account and its usage."""
        with pytest.raises(ValueError, match="https"):
            usage_alerts.validate_webhook_url("http://hooks.example.com/x")

    @pytest.mark.parametrize("url", [
        "https://localhost/hook",
        "https://127.0.0.1/hook",
        "https://10.0.0.5/hook",
        "https://192.168.1.1/hook",
        "https://169.254.169.254/latest/meta-data/",
        "https://metadata.google.internal/computeMetadata/v1/",
    ])
    def test_private_and_metadata_targets_are_refused(self, url):
        """This URL is fetched BY THE SERVER, so an unvalidated field is an SSRF
        primitive and 169.254.169.254 is why it matters."""
        with pytest.raises(ValueError, match="publicly reachable"):
            usage_alerts.validate_webhook_url(url)

    def test_a_scheme_with_no_host_is_refused(self):
        with pytest.raises(ValueError):
            usage_alerts.validate_webhook_url("https://")


class TestCrossingLogic:
    def test_nothing_fires_below_the_lowest_threshold(self):
        assert usage_alerts._crossed(42.0, [80, 100], None) is None

    def test_the_highest_passed_threshold_fires_not_the_lowest(self):
        """A customer who jumps from 40% to 95% in one busy hour should be told
        they are at 90 — not walked up through 50, 75 and 80 in three separate
        notifications."""
        assert usage_alerts._crossed(95.0, [50, 75, 80, 90], None) == 90

    def test_the_same_threshold_does_not_fire_twice(self):
        assert usage_alerts._crossed(85.0, [80, 100], already=80) is None

    def test_a_higher_threshold_still_fires_after_a_lower_one(self):
        assert usage_alerts._crossed(100.0, [80, 100], already=80) == 100

    def test_exactly_on_the_threshold_counts_as_crossed(self):
        assert usage_alerts._crossed(80.0, [80], None) == 80


class FakeTable:
    def __init__(self, parent):
        self._p = parent

    def select(self, *_a, **_k):
        return self

    def eq(self, *_a, **_k):
        return self

    def limit(self, *_a, **_k):
        return self

    def upsert(self, payload, *_a, **_k):
        self._p.upserts.append(payload)
        return self

    def update(self, payload, *_a, **_k):
        self._p.updates.append(payload)
        return self

    def execute(self):
        return types.SimpleNamespace(data=list(self._p.rows))


class FakeSupabase:
    def __init__(self, rows=()):
        self.rows = list(rows)
        self.upserts: list = []
        self.updates: list = []

    def table(self, _name):
        return FakeTable(self)


class TestDelivery:
    def _row(self, **over):
        row = {
            "user_id": "u1",
            "enabled": True,
            "thresholds": [80, 100],
            "webhook_url": "https://hooks.example.com/x",
            "last_notified_period": None,
            "last_notified_threshold": None,
        }
        row.update(over)
        return row

    def test_a_notification_is_delivered_once_past_a_threshold(self, monkeypatch):
        sent = []
        monkeypatch.setattr(usage_alerts, "_deliver", lambda url, p: sent.append((url, p)) or True)
        fake = FakeSupabase([self._row()])

        usage_alerts._run(fake, "u1", "api_basic", used=850, limit=1000,
                          period=dt.date(2026, 9, 1))

        assert len(sent) == 1
        url, payload = sent[0]
        assert url == "https://hooks.example.com/x"
        assert payload["threshold_percent"] == 80
        assert payload["requests_used"] == 850
        assert payload["requests_limit"] == 1000

    def test_the_payload_says_what_to_do_about_it(self, monkeypatch):
        """A quota warning with no plan name, no numbers and no reset date is
        just an alarm."""
        sent = {}
        fake = FakeSupabase([self._row()])
        monkeypatch.setattr(usage_alerts, "_deliver", lambda url, p: sent.update(p) or True)
        usage_alerts._run(fake, "u1", "api_basic", used=900, limit=1000,
                          period=dt.date(2026, 9, 1))
        assert "api_basic" in sent["message"]
        assert "1,000" in sent["message"]
        assert "resets" in sent["message"]
        assert sent["dashboard_url"].startswith("https://")

    def test_the_marker_is_written_so_it_cannot_repeat_this_month(self, monkeypatch):
        monkeypatch.setattr(usage_alerts, "_deliver", lambda *_a: True)
        fake = FakeSupabase([self._row()])
        usage_alerts._run(fake, "u1", "api_basic", used=850, limit=1000,
                          period=dt.date(2026, 9, 1))
        assert fake.updates == [{
            "last_notified_period": "2026-09-01",
            "last_notified_threshold": 80,
        }]

    def test_an_already_notified_threshold_does_not_resend(self, monkeypatch):
        sent = []
        monkeypatch.setattr(usage_alerts, "_deliver", lambda *a: sent.append(a) or True)
        fake = FakeSupabase([self._row(
            last_notified_period="2026-09-01", last_notified_threshold=80,
        )])
        usage_alerts._run(fake, "u1", "api_basic", used=850, limit=1000,
                          period=dt.date(2026, 9, 1))
        assert sent == []

    def test_a_new_month_clears_the_marker(self, monkeypatch):
        sent = []
        monkeypatch.setattr(usage_alerts, "_deliver", lambda *a: sent.append(a) or True)
        fake = FakeSupabase([self._row(
            last_notified_period="2026-08-01", last_notified_threshold=100,
        )])
        usage_alerts._run(fake, "u1", "api_basic", used=850, limit=1000,
                          period=dt.date(2026, 9, 1))
        assert len(sent) == 1

    def test_disabled_alerts_send_nothing(self, monkeypatch):
        sent = []
        monkeypatch.setattr(usage_alerts, "_deliver", lambda *a: sent.append(a) or True)
        fake = FakeSupabase([self._row(enabled=False)])
        usage_alerts._run(fake, "u1", "api_basic", used=999, limit=1000,
                          period=dt.date(2026, 9, 1))
        assert sent == []

    def test_no_webhook_configured_sends_nothing_and_marks_nothing(self, monkeypatch):
        """Thresholds with no delivery target still drive the dashboard banner,
        so there is nothing to send and nothing to suppress."""
        monkeypatch.setattr(usage_alerts, "_deliver", lambda *_a: True)
        fake = FakeSupabase([self._row(webhook_url=None)])
        usage_alerts._run(fake, "u1", "api_basic", used=999, limit=1000,
                          period=dt.date(2026, 9, 1))
        assert fake.updates == []

    def test_delivery_is_marked_before_it_is_attempted(self, monkeypatch):
        """Deliberate. A webhook that is down would otherwise be retried on every
        request for the rest of the month — thousands of 3s timeouts bolted onto
        the customer's own API latency."""
        monkeypatch.setattr(usage_alerts, "_deliver", lambda *_a: False)
        fake = FakeSupabase([self._row()])
        usage_alerts._run(fake, "u1", "api_basic", used=850, limit=1000,
                          period=dt.date(2026, 9, 1))
        assert fake.updates, "a failed delivery must still be marked"


class TestEvaluateAsyncIsCheap:
    def test_a_key_nowhere_near_its_limit_does_no_work(self, monkeypatch):
        """The hot path. Well under the lowest threshold must not cost a thread,
        a query or a lock."""
        called = []
        monkeypatch.setattr(usage_alerts, "_run", lambda *a, **k: called.append(a))
        usage_alerts.evaluate_async(FakeSupabase(), "u1", "api_basic", used=10, limit=50_000)
        assert called == []

    def test_an_uncountable_period_does_nothing(self, monkeypatch):
        """used is None when metering is degraded; percent is then unknowable."""
        called = []
        monkeypatch.setattr(usage_alerts, "_run", lambda *a, **k: called.append(a))
        usage_alerts.evaluate_async(FakeSupabase(), "u1", "api_basic", used=None, limit=50_000)
        assert called == []

    def test_it_never_raises_into_the_request(self, monkeypatch):
        """This runs inside somebody's API call. An alerting bug must not become
        their 500."""
        def _boom(*_a, **_k):
            raise RuntimeError("alerting is broken")

        monkeypatch.setattr(usage_alerts, "_run", _boom)
        usage_alerts.evaluate_async(FakeSupabase(), "u1", "api_basic", used=900, limit=1000)
