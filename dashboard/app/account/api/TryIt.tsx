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
  /** `{c}` is replaced with the selected commodity. */
  template: string;
  note: string;
};

/**
 * The commodity is a SEPARATE control, not baked into each sample.
 *
 * Every preset used to hard-code `oil` (four of six did), so the console
 * demonstrated a one-commodity product. The archive holds 49 queryable
 * entities. Showing one of them, repeatedly, is the same failure as the depth
 * cap: the product concealing its own breadth from the person evaluating it.
 *
 * The list is loaded from /v1/commodities using the key the user just pasted,
 * so it is always the live set rather than a copy that drifts.
 */
const SAMPLES: Sample[] = [
  {
    label: "Current sentiment",
    template: "/v1/sentiment?commodity={c}&window=7d",
    note: "Signed score, sample size, and the headlines behind it.",
  },
  {
    label: "Market brief",
    template: "/v1/brief?commodity={c}",
    note: "Sentiment, narratives and 7d vs 30d in one call.",
  },
  {
    label: "Daily series — 30 days",
    template: "/v1/sentiment/{c}/daily?days=30",
    note: "One row per day, with momentum. The chartable series.",
  },
  {
    label: "History — individual articles",
    template: "/v1/sentiment/{c}/history?limit=25",
    note: "Paginate with the returned next_cursor.",
  },
  {
    label: "Emerging narratives",
    template: "/v1/narratives?commodity={c}&lookback=7d",
    note: "Clustered themes across recent coverage.",
  },
  {
    label: "CSV export (first rows)",
    template: "/v1/export/sentiment?commodity={c}&format=csv",
    note: "Counts against your monthly export budget.",
  },
  {
    label: "Available commodities — and archive coverage",
    template: "/v1/commodities",
    note: "Every entity you can query, plus how far the archive reaches.",
  },
];

/**
 * Shown until the live list loads, and if it cannot be loaded.
 *
 * These are the real stored entity values. Common tickers now resolve on read
 * too — `brent` and `wti` to `oil`, `ttf` and `jkm` to `gas` — using the same
 * map the scoring engine applies at write time. The canonical names are still
 * what the selector offers, because they are what /v1/commodities returns and
 * what the response echoes back.
 */
const FALLBACK_COMMODITIES = [
  "oil", "crude_oil", "gas", "natural_gas", "gold", "copper", "silver",
  "wheat", "corn", "coal", "lithium", "uranium", "freight_shipping",
  "fertilizer", "iron_ore_steel", "platinum_palladium",
];

export function TryIt() {
  const [apiKey, setApiKey] = useState("");
  const [template, setTemplate] = useState(SAMPLES[0].template);
  const [commodity, setCommodity] = useState("oil");
  const [commodities, setCommodities] = useState<string[]>(FALLBACK_COMMODITIES);
  const [listState, setListState] = useState<"fallback" | "loading" | "live" | "failed">(
    "fallback"
  );
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<number | null>(null);
  const [meta, setMeta] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const active = SAMPLES.find((s) => s.template === template);
  const path = template.replace("{c}", encodeURIComponent(commodity));
  const needsCommodity = template.includes("{c}");

  /**
   * Load the caller's real commodity list.
   *
   * Runs off the key field rather than on mount, because /v1/commodities needs
   * a key. Failure is silent-but-visible: the fallback list still works, and the
   * label says which list is on screen — a console that quietly showed a stale
   * set would be worse than one that admits it.
   */
  async function loadCommodities(key: string) {
    if (!key.startsWith("ik_live_") || key.length < 20) return;
    setListState("loading");
    try {
      const res = await fetch(`${API_BASE}/v1/commodities`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { commodities?: string[] };
      const live = (data.commodities ?? []).filter(Boolean);
      if (!live.length) throw new Error("empty list");
      setCommodities(live);
      setListState("live");
      if (!live.includes(commodity)) setCommodity(live[0]);
    } catch {
      setListState("failed");
    }
  }

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
      // Bounded so a stalled request shows an error instead of spinning
      // forever. This one runs in the browser, so it cannot time out a Vercel
      // function — it is purely so the console stays honest about what it knows.
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
        signal: AbortSignal.timeout(15_000),
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
            onBlur={(e) => loadCommodities(e.target.value.trim())}
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
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full rounded-lg border border-divider bg-bg-primary px-3 py-2 text-sm"
          >
            {SAMPLES.map((s) => (
              <option key={s.template} value={s.template}>
                {s.label}
              </option>
            ))}
          </select>
          {active ? (
            <p className="text-text-secondary mt-1 text-xs">{active.note}</p>
          ) : null}
        </div>

        {needsCommodity ? (
          <div>
            <label htmlFor="tryit-commodity" className="mb-1 block text-sm font-medium">
              Commodity
            </label>
            <select
              id="tryit-commodity"
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              className="w-full rounded-lg border border-divider bg-bg-primary px-3 py-2 font-mono text-sm"
            >
              {commodities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="text-text-secondary mt-1 text-xs">
              {listState === "live" ? (
                <>
                  <span className="text-accent-positive">{commodities.length}</span>{" "}
                  entities, loaded from your key.
                </>
              ) : listState === "loading" ? (
                "Loading your commodity list…"
              ) : listState === "failed" ? (
                <>
                  Couldn&apos;t load the live list — showing common entities.
                  Run <span className="font-mono">/v1/commodities</span> to see all
                  of them.
                </>
              ) : (
                <>
                  Common entities. Paste a key above to load the full list —
                  there are far more than these.
                </>
              )}
            </p>
          </div>
        ) : null}

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
