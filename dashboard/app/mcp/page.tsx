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
        <p className="mt-2 text-text-secondary">
          A Model Context Protocol connector that lets you query Integra&apos;s
          commodity intelligence directly from Claude Desktop or Claude Code —
          no code required.
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
            <span className="text-text-primary">2.</span> Install the{" "}
            <code className="text-accent-primary">@integra/mcp</code> connector
            in Claude Desktop or Claude Code using the snippet below.
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
              &ldquo;What&apos;s the current sentiment on natural gas?&rdquo;
            </span>
          </li>
          <li>
            <span className="text-text-primary">Composite brief:</span>{" "}
            <span className="italic">
              &ldquo;Give me a full market brief for wheat.&rdquo;
            </span>
          </li>
          <li>
            <span className="text-text-primary">Divergence hunting:</span>{" "}
            <span className="italic">
              &ldquo;Which prediction markets does the AI most strongly disagree
              with right now?&rdquo;
            </span>
          </li>
          <li>
            <span className="text-text-primary">Historical analogs:</span>{" "}
            <span className="italic">
              &ldquo;Find historical periods where Brent set up like this OPEC
              surprise cut. What happened after?&rdquo;
            </span>
          </li>
        </ul>
      </section>

      <section className="rounded-lg border border-divider bg-bg-secondary p-6">
        <h2 className="text-lg font-semibold">Troubleshooting</h2>
        <div className="mt-4 space-y-4 text-sm text-text-secondary">
          <div>
            <div className="text-text-primary">
              &ldquo;Integra API key rejected&rdquo;
            </div>
            <p className="mt-1">
              The key in your MCP config is invalid or revoked. Create a new
              one at{" "}
              <Link href="/api-keys" className="text-accent-primary underline">
                /api-keys
              </Link>{" "}
              and restart Claude Desktop.
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
              MCP server not appearing in Claude
            </div>
            <p className="mt-1">
              Ensure you have Node 18+ installed (
              <code className="text-accent-primary">node --version</code>) and
              restart Claude Desktop after editing the config file.
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
