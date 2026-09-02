"use client";

// A live API console.
//
// The docs page lists endpoints but there was no way to CALL one without
// leaving for a terminal. That gap is how /v1/sentiment shipped returning
// `articles_analyzed: 0` for every commodity for months: a 200 with an empty
// body looks identical to a working endpoint unless somebody reads the body.
//
// The key is pasted rather than selected: keys are hashed at rest and shown
// exactly once at creation, so the dashboard genuinely cannot retrieve one.
// It is held in component state only — never persisted, never sent anywhere
// except directly to api.integramarkets.app from the browser.

import { useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_INTEGRA_API_URL ?? "https://api.integramarkets.app";

type Sample = {
  label: string;
  path: string;
  note: string;
};

// `oil` / `gas` / `gold` are the real stored entity values. Tickers like
// `brent`, `wti` and `ng` normalise to these at write time and match nothing
// on read, so they return an empty 200 — which is why the samples below use
// the canonical names.
const SAMPLES: Sample[] = [
  {
    label: "Current sentiment — oil",
    path: "/v1/sentiment?commodity=oil&window=7d",
    note: "Signed score, label, and the headlines driving it.",
  },
  {
    label: "Market brief — oil",
    path: "/v1/brief?commodity=oil",
    note: "Sentiment, narratives and 7d vs 30d in one call.",
  },
  {
    label: "Daily series — oil, 30 days",
    path: "/v1/sentiment/oil/daily?days=30",
    note: "One row per day. The chartable series.",
  },
  {
    label: "Available commodities",
    path: "/v1/commodities",
    note: "Every entity value you can query.",
  },
  {
    label: "Emerging narratives — gas",
    path: "/v1/narratives?commodity=gas&lookback=7d",
    note: "Clustered themes across recent coverage.",
  },
  {
    label: "CSV export — oil (first rows)",
    path: "/v1/export/sentiment?commodity=oil&format=csv",
    note: "Counts against your monthly export budget.",
  },
];

export function TryIt() {
  const [apiKey, setApiKey] = useState("");
  const [path, setPath] = useState(SAMPLES[0].path);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<number | null>(null);
  const [meta, setMeta] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const active = SAMPLES.find((s) => s.path === path);

  async function run() {
    if (!apiKey.trim()) {
      setStatus(null);
      setBody("Paste an API key first — create one above if you don't have it.");
      return;
    }
    setBusy(true);
    setBody("");
    setMeta("");
    const started = Date.now();
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      const text = await res.text();
      setStatus(res.status);

      // Surface the metering headers — they are the answer to "how much of my
      // allowance is left", and they are invisible in a terminal unless asked for.
      const limit = res.headers.get("x-ratelimit-limit");
      const remaining = res.headers.get("x-ratelimit-remaining");
      const bits = [`${Date.now() - started}ms`];
      if (limit && remaining) bits.push(`${remaining} of ${limit} requests left this month`);
      setMeta(bits.join(" · "));

      try {
        setBody(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        // CSV, or an error page — show the first chunk verbatim.
        setBody(text.slice(0, 4000));
      }
    } catch (err) {
      setStatus(null);
      setBody(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const ok = status !== null && status >= 200 && status < 300;

  return (
    <div className="rounded-xl border border-divider bg-bg-secondary p-6">
      <h3 className="text-base font-semibold">Try an endpoint</h3>
      <p className="text-text-secondary mt-1 text-sm">
        Runs a real request from your browser. Your key is kept in this page only
        and is never stored.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="tryit-key" className="mb-1 block text-sm font-medium">
            API key
          </label>
          <input
            id="tryit-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="ik_live_…"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-divider bg-bg-primary px-3 py-2 font-mono text-sm"
          />
        </div>

        <div>
          <label htmlFor="tryit-path" className="mb-1 block text-sm font-medium">
            Request
          </label>
          <select
            id="tryit-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="w-full rounded-lg border border-divider bg-bg-primary px-3 py-2 text-sm"
          >
            {SAMPLES.map((s) => (
              <option key={s.path} value={s.path}>
                {s.label}
              </option>
            ))}
          </select>
          {active ? (
            <p className="text-text-secondary mt-1 text-xs">{active.note}</p>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <code className="text-text-secondary whitespace-nowrap text-xs">
            GET {API_BASE}
            {path}
          </code>
        </div>

        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-bg-primary disabled:opacity-60"
        >
          {busy ? "Running…" : "Send request"}
        </button>

        {status !== null || body ? (
          <div>
            <div className="mb-2 flex items-center gap-3 text-xs">
              {status !== null ? (
                <span
                  className={
                    ok ? "font-semibold text-accent-positive" : "font-semibold text-accent-negative"
                  }
                >
                  HTTP {status}
                </span>
              ) : null}
              {meta ? <span className="text-text-secondary">{meta}</span> : null}
            </div>
            <pre className="bg-bg-primary max-h-96 overflow-auto rounded-lg p-4 text-xs leading-relaxed">
              <code>{body}</code>
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
