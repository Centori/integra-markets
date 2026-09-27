// Public MCP documentation. Indexed / no auth required so that prospective
// customers can review the tool surface before subscribing. The install
// snippets use placeholder API keys — real keys are provisioned from /api-keys
// after the user is on the API Basic or API + History tier.

import Link from "next/link";
import { ConnectClaude } from "../api-keys/ConnectClaude";

export const metadata = {
  title: "Integra MCP — Claude Desktop & Claude Code connector",
  description:
    "Access commodity sentiment, prediction-market divergence, and narrative intelligence directly from Claude Desktop and Claude Code via the Integra MCP server.",
};

export default function McpDocsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-semibold">Integra MCP</h1>
        <p className="mt-2 text-lg text-text-primary">
          Your commodity desk, inside the chat you already use.
        </p>
        <p className="mt-2 text-text-secondary">
          Ask in plain English and get a sourced answer: sentiment across energy,
          metals and agriculture, the narratives forming underneath it, and where
          the model disagrees with the prediction markets. Seven tools, one API
          key, nothing to install — it is a URL, not a download.
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          Every figure it returns names the signal behind it and quotes the words
          that triggered it, so you can check the answer before you use it.
        </p>
      </div>

      <section className="rounded-lg border border-divider bg-bg-secondary p-6">
        <h2 className="text-lg font-semibold">How it works</h2>
        <ol className="mt-4 space-y-3 text-sm text-text-secondary">
          <li>
            <span className="text-text-primary">1.</span> Subscribe to the API
            tier and create an API key from your{" "}
            <Link href="/api-keys" className="text-accent-primary underline">
              dashboard
            </Link>
            .
          </li>
          <li>
            <span className="text-text-primary">2.</span> Add Integra as a
            custom connector using the button below — it is a URL, not an
            install.
          </li>
          <li>
            <span className="text-text-primary">3.</span> Ask Claude questions
            in plain English — it will call Integra&apos;s tools on your behalf
            and return structured answers.
          </li>
        </ol>
      </section>

      <ConnectClaude />

      <section className="rounded-lg border border-divider bg-bg-secondary p-6">
        <h2 className="text-lg font-semibold">Example prompts</h2>
        <ul className="mt-4 space-y-3 text-sm text-text-secondary">
          <li>
            <span className="text-text-primary">Sentiment snapshot:</span>{" "}
            <span className="italic">
              &ldquo;What&apos;s the current sentiment on natural gas, and how
              many articles is that based on?&rdquo;
            </span>
          </li>
          <li>
            <span className="text-text-primary">Morning brief:</span>{" "}
            <span className="italic">
              &ldquo;Give me a full market brief for wheat.&rdquo;
            </span>
          </li>
          <li>
            <span className="text-text-primary">Divergence hunting:</span>{" "}
            <span className="italic">
              &ldquo;Which prediction markets does the model most strongly
              disagree with right now?&rdquo;
            </span>
          </li>
          <li>
            <span className="text-text-primary">What changed, and why:</span>{" "}
            <span className="italic">
              &ldquo;Copper sentiment turned this week — what drove it? Quote the
              headlines.&rdquo;
            </span>
          </li>
          <li>
            <span className="text-text-primary">Narrative watch:</span>{" "}
            <span className="italic">
              &ldquo;What themes are forming in agriculture coverage that
              weren&apos;t there a month ago?&rdquo;
            </span>
          </li>
          <li>
            <span className="text-text-primary">Trend, with the series:</span>{" "}
            <span className="italic">
              &ldquo;Chart daily corn sentiment for the last 30 days and flag the
              days with the thinnest coverage.&rdquo;
            </span>
          </li>
        </ul>
      </section>

      <section className="rounded-lg border border-divider bg-bg-secondary p-6">
        <h2 className="text-lg font-semibold">Ask by name, not by ticker</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Commodities are matched on the canonical name the sentiment engine
          normalises to — <span className="text-text-primary">oil</span>,{" "}
          <span className="text-text-primary">gas</span>,{" "}
          <span className="text-text-primary">gold</span>,{" "}
          <span className="text-text-primary">copper</span>,{" "}
          <span className="text-text-primary">corn</span>,{" "}
          <span className="text-text-primary">wheat</span>. Market tickers do
          not resolve: ask for <span className="text-text-primary">oil</span>,
          not <span className="italic">Brent</span> or{" "}
          <span className="italic">WTI</span>. Ask Claude to{" "}
          <span className="italic">&ldquo;list the commodities Integra has data
          for&rdquo;</span>{" "}
          to see the current set — it is also the cheapest way to confirm a new
          key works.
        </p>
      </section>

      <section className="rounded-lg border border-divider bg-bg-secondary p-6">
        <h2 className="text-lg font-semibold">Troubleshooting</h2>
        <div className="mt-4 space-y-4 text-sm text-text-secondary">
          <div>
            <div className="text-text-primary">
              &ldquo;Integra API key rejected&rdquo;
            </div>
            <p className="mt-1">
              The key sent in the connector&apos;s{" "}
              <code className="text-accent-primary">Authorization</code> header
              is invalid or revoked. Create a new one at{" "}
              <Link href="/api-keys" className="text-accent-primary underline">
                /api-keys
              </Link>{" "}
              and update the header — the value must read{" "}
              <code className="text-accent-primary">Bearer ik_live_…</code>,
              including the word Bearer.
            </p>
          </div>
          <div>
            <div className="text-text-primary">
              &ldquo;Your subscription tier does not include this endpoint&rdquo;
            </div>
            <p className="mt-1">
              Historical tools require the API + History tier. Upgrade at{" "}
              <Link href="/api-tier" className="text-accent-primary underline">
                /api-tier
              </Link>
              .
            </p>
          </div>
          <div>
            <div className="text-text-primary">
              Connector added, but every tool call fails
            </div>
            <p className="mt-1">
              The connector accepts any key at setup — the handshake and tool
              list succeed before a key is ever checked, so a wrong key only
              surfaces when a tool actually runs. If the tools are listed but
              each call errors, the header value is the thing to check.
            </p>
          </div>
        </div>
      </section>

      <p className="text-xs text-text-secondary">
        Questions or feature requests? Email{" "}
        <a
          href="mailto:contact@integramarkets.app"
          className="text-accent-primary underline"
        >
          contact@integramarkets.app
        </a>
        .
      </p>
    </div>
  );
}
