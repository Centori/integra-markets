"use client";

// Quota alert configuration.
//
// Delivery is a webhook, and the UI says so plainly rather than implying email:
// this backend has no ESP configured, and the only outbound notification path
// is Expo push to the mobile app — the wrong audience for someone whose CI job
// is about to start receiving 429s. Promising an email we cannot send would be
// worse than the "Soon" label this replaces.

import { useState } from "react";
import { saveAlertsAction } from "@/app/api-keys/actions";
import type { AlertConfig } from "@/lib/api";

export default function AlertsForm({ initial }: { initial: AlertConfig }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [thresholds, setThresholds] = useState<number[]>(initial.thresholds);
  const [webhook, setWebhook] = useState(initial.webhook_url ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = initial.available_thresholds ?? [50, 75, 80, 90, 100];
  const max = initial.max_thresholds ?? 4;

  function toggleThreshold(value: number) {
    setSaved(false);
    setThresholds((current) =>
      current.includes(value)
        ? current.filter((t) => t !== value)
        : [...current, value].sort((a, b) => a - b)
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveAlertsAction({
        enabled,
        thresholds,
        webhook_url: webhook.trim() || null,
      });
      setSaved(true);
    } catch (err) {
      // The backend writes these messages for a person — "webhook URL must be
      // publicly reachable", "80 is not an available threshold" — so they are
      // shown as written rather than replaced with "save failed".
      const raw = err instanceof Error ? err.message : "Couldn't save.";
      setError(raw.replace(/^\d{3}\s*/, "").replace(/^\{"detail":"?|"?\}$/g, ""));
    } finally {
      setBusy(false);
    }
  }

  const tooMany = thresholds.length > max;
  const none = thresholds.length === 0;

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Notify me</h2>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-divider bg-bg-secondary p-4">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked);
              setSaved(false);
            }}
            className="mt-0.5 h-4 w-4 accent-[#4ECCA3]"
          />
          <span className="text-sm">
            <span className="text-text-primary">Send quota alerts</span>
            <span className="mt-1 block text-text-secondary">
              Off means no notification at all — you would find out by being
              refused with a 429.
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Thresholds</h2>
        <p className="text-sm text-text-secondary">
          Percentages of your monthly request allowance. Each fires at most once
          per calendar month, and the highest one you cross is the one that
          fires — a jump from 40% to 95% sends one alert, not four.
        </p>
        <div className="flex flex-wrap gap-2">
          {available.map((value) => {
            const on = thresholds.includes(value);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={() => toggleThreshold(value)}
                className={
                  on
                    ? "rounded-md border border-accent-positive bg-accent-positive/10 px-3 py-1.5 text-sm font-semibold tabular-nums text-accent-positive"
                    : "rounded-md border border-divider bg-bg-secondary px-3 py-1.5 text-sm tabular-nums text-text-secondary hover:text-text-primary"
                }
              >
                {value}%
              </button>
            );
          })}
        </div>
        {none ? (
          <p className="text-sm text-accent-warning">Choose at least one threshold.</p>
        ) : null}
        {tooMany ? (
          <p className="text-sm text-accent-warning">At most {max} thresholds.</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Where to send it</h2>
        <p className="text-sm text-text-secondary">
          An HTTPS endpoint that receives a JSON POST. A webhook rather than an
          email on purpose — it lands in the system that would page you. Leave it
          empty to keep the thresholds for this page only.
        </p>
        <input
          type="url"
          inputMode="url"
          value={webhook}
          onChange={(e) => {
            setWebhook(e.target.value);
            setSaved(false);
          }}
          placeholder="https://hooks.example.com/services/…"
          className="w-full rounded-md border border-divider bg-bg-secondary px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-accent-positive focus:outline-none"
        />

        <details className="rounded-lg border border-divider bg-bg-secondary">
          <summary className="cursor-pointer px-4 py-3 text-sm text-text-secondary">
            What gets posted
          </summary>
          <pre className="overflow-x-auto border-t border-divider px-4 py-3 text-xs text-text-secondary">
{`{
  "type": "usage_threshold",
  "threshold_percent": 80,
  "tier": "api_basic",
  "requests_used": 40000,
  "requests_limit": 50000,
  "percent_used": 80.0,
  "period": "2026-09-01",
  "message": "Integra API usage is at 80% of the 50,000-request…",
  "dashboard_url": "https://dashboard.integramarkets.app/account/usage"
}`}
          </pre>
        </details>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={busy || none || tooMany}
          className="rounded-md bg-accent-positive px-4 py-2 text-sm font-semibold text-bg-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save alerts"}
        </button>
        {saved ? (
          <span role="status" className="text-sm text-accent-positive">
            Saved. Threshold history was reset, so a level you already crossed
            this month can fire again.
          </span>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-accent-negative bg-bg-secondary p-4 text-sm text-text-secondary"
        >
          {error}
        </div>
      ) : null}
    </form>
  );
}
