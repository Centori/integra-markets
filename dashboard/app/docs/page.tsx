// API documentation, served on our own domain.
//
// The nav's "Docs" link pointed at https://integra.mintlify.app, which returns
// 404 — that link sits in the global layout, so every dashboard page including
// the public /api-tier pricing page offered a dead "Docs" link to someone
// deciding whether to pay $99 or $249/mo.
//
// The repo's docs/ folder is not a usable substitute. Checked against the live
// API on 2026-08-17, its examples fail on every request:
//
//   docs/QUICKSTART.md says          the live API actually
//   ------------------------------   ----------------------------------------
//   X-Api-Key: <TENANT_API_KEY>      requires Authorization: Bearer <key>
//   POST /v1/ingest/articles         404 — no ingest endpoint exists
//   POST /v1/graphql                 404 — no GraphQL endpoint exists
//   https://api.yourdomain.com       placeholder never replaced
//
// Publishing those would be worse than a 404: a customer would follow them and
// fail on the first call. So this page is written from the endpoints that
// actually answer, verified against /openapi.json and by calling each one
// (they return 401 without a key, which is the proof they exist).
//
// Deliberately dependency-free: the dashboard has only next/react/supabase,
// and adding an MDX pipeline days before launch is risk with no payoff here.
// A richer docs site (the Mintlify config in docs/docs.json is already valid)
// is the Launch-2 item; this makes the link honest today.

export const metadata = {
  title: "API Docs — Integra Markets",
  description:
    "REST reference for the Integra Markets sentiment and divergence API.",
};

const BASE = "https://api.integramarkets.app";

type Endpoint = {
  method: string;
  path: string;
  summary: string;
  tier?: string;
};

// Every path below was enumerated from the live /openapi.json and confirmed to
// answer 401 (not 404) without credentials.
const GROUPS: { group: string; blurb: string; endpoints: Endpoint[] }[] = [
  {
    group: "Sentiment",
    blurb:
      "Commodity sentiment scored from the news pipeline. Scores are signed −1…+1 where 0 is neutral.",
    endpoints: [
      { method: "GET", path: "/v1/sentiment", summary: "Recent scored articles across all commodities." },
      { method: "GET", path: "/v1/sentiment/{commodity}/now", summary: "Latest reading plus a 24h rolling mean." },
      { method: "GET", path: "/v1/sentiment/{commodity}/history", summary: "Raw observations over a time range." },
      { method: "GET", path: "/v1/sentiment/{commodity}/daily", summary: "Daily aggregates for charting or backtests." },
      { method: "GET", path: "/v1/export/sentiment", summary: "Bulk export as CSV or XLSX.", tier: "History" },
    ],
  },
  {
    group: "Divergence",
    blurb:
      "Integra's signature signal: news sentiment against prediction-market implied probability, flagged when the gap clears 20 points within 24h. Both sides are compared on the same signed −1…+1 scale.",
    endpoints: [
      { method: "GET", path: "/v1/markets/divergence", summary: "Current divergence readings across all topics." },
      { method: "GET", path: "/v1/markets/divergence/{topic}", summary: "One topic, with the matched Polymarket/Kalshi markets." },
      { method: "GET", path: "/v1/markets/overlay", summary: "Sentiment and market probability as a paired series." },
    ],
  },
  {
    group: "Reference data",
    blurb: "The vocabularies the rest of the API is keyed on.",
    endpoints: [
      { method: "GET", path: "/v1/commodities", summary: "Commodities with at least one scored document." },
      { method: "GET", path: "/v1/topics", summary: "Topic taxonomy used by divergence and tagging." },
    ],
  },
  {
    group: "Analysis",
    blurb: "Higher-level products built on the archive.",
    endpoints: [
      { method: "GET", path: "/v1/brief", summary: "Narrative market brief for the current session." },
      { method: "GET", path: "/v1/narratives", summary: "Recurring narratives detected across the corpus." },
      { method: "GET", path: "/v1/historical/analogs", summary: "Historical periods resembling current conditions.", tier: "Archive" },
      { method: "POST", path: "/v1/agent/ask", summary: "Ask a question against the archive." },
      { method: "GET", path: "/v1/agent/templates", summary: "Prepared prompts for the agent endpoint." },
    ],
  },
  {
    group: "Key management",
    blurb: "Create and revoke keys programmatically. Authenticates with your dashboard session, not an API key.",
    endpoints: [
      { method: "GET", path: "/api/keys", summary: "List your keys (never returns the secret again)." },
      { method: "POST", path: "/api/keys", summary: "Create a key. The secret is shown once." },
      { method: "DELETE", path: "/api/keys/{key_id}", summary: "Revoke a key immediately." },
    ],
  },
];

const METHOD_COLOR: Record<string, string> = {
  GET: "text-accent-positive",
  POST: "text-accent-warning",
  DELETE: "text-accent-negative",
};

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border border-bg-tertiary bg-bg-secondary p-4 text-xs leading-relaxed text-text-primary">
      <code>{children}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 py-8">
      <header>
        <h1 className="text-3xl font-semibold">API Documentation</h1>
        <p className="mt-2 text-text-secondary">
          REST access to Integra&apos;s sentiment archive and divergence signals.
          Base URL <code className="text-text-primary">{BASE}</code>. Responses
          are JSON, except{" "}
          <code className="text-text-primary">/v1/export/sentiment</code>, which
          streams CSV or XLSX.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold">Authentication</h2>
        <p className="mt-2 text-text-secondary">
          Every <code className="text-text-primary">/v1/*</code> request needs a
          bearer token. Create a key under{" "}
          <a href="/account/api" className="text-accent-positive underline">
            Account → API keys
          </a>
          ; the secret is displayed once and cannot be retrieved later.
        </p>
        <Code>{`curl "${BASE}/v1/sentiment?limit=10" \\
  -H "Authorization: Bearer $INTEGRA_API_KEY"`}</Code>
        <p className="mt-3 text-sm text-text-muted">
          A missing or invalid key returns <code>401</code> with{" "}
          <code>{`{"detail":"missing or malformed API key"}`}</code>. Requests
          beyond your tier&apos;s scope return <code>403</code>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Quickstart</h2>
        <p className="mt-2 text-text-secondary">
          Read the current sentiment for one commodity, then the divergence
          signal for a topic:
        </p>
        <Code>{`# 1. what is available
curl "${BASE}/v1/commodities" \\
  -H "Authorization: Bearer $INTEGRA_API_KEY"

# 2. latest reading for crude oil, with a 24h mean
curl "${BASE}/v1/sentiment/oil/now" \\
  -H "Authorization: Bearer $INTEGRA_API_KEY"

# 3. where news and the prediction market disagree
curl "${BASE}/v1/markets/divergence" \\
  -H "Authorization: Bearer $INTEGRA_API_KEY"`}</Code>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Endpoints</h2>
        <div className="mt-4 space-y-8">
          {GROUPS.map((g) => (
            <div key={g.group}>
              <h3 className="text-base font-semibold text-text-primary">{g.group}</h3>
              <p className="mt-1 text-sm text-text-secondary">{g.blurb}</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {g.endpoints.map((e) => (
                      <tr key={e.path + e.method} className="border-t border-bg-tertiary align-top">
                        <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs">
                          <span className={METHOD_COLOR[e.method] ?? "text-text-secondary"}>
                            {e.method}
                          </span>
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap font-mono text-xs text-text-primary">
                          {e.path}
                        </td>
                        <td className="py-2 text-text-secondary">
                          {e.summary}
                          {e.tier ? (
                            <span className="ml-2 rounded border border-bg-tertiary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                              {e.tier}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Reading a sentiment score</h2>
        <p className="mt-2 text-text-secondary">
          Scores are signed <code className="text-text-primary">−1…+1</code>{" "}
          where <code className="text-text-primary">0</code> is neutral —
          negative is bearish, positive is bullish. The{" "}
          <code className="text-text-primary">sentiment</code> field labels the
          same reading as <code>bullish</code>, <code>bearish</code> or{" "}
          <code>neutral</code>. Divergence compares both sides on that scale, so
          a delta lands in <code>−2…+2</code>: positive means the news is more
          bullish than the market, negative means the market is ahead of the news.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Rate limits</h2>
        <p className="mt-2 text-text-secondary">
          Limits and history depth are set by your plan — see{" "}
          <a href="/api-tier" className="text-accent-positive underline">
            API pricing
          </a>
          . Exceeding a limit returns <code>429</code>; retry with exponential
          backoff and jitter. Requests for history beyond your plan&apos;s window
          are truncated to it rather than rejected, and the applied window is
          reported back in the response.
        </p>
      </section>

      <footer className="border-t border-bg-tertiary pt-6 text-sm text-text-muted">
        Something missing or wrong here? Tell us at{" "}
        <a href="mailto:support@integramarkets.app" className="text-accent-positive underline">
          support@integramarkets.app
        </a>
        .
      </footer>
    </div>
  );
}
