"use client";

import { useState } from "react";
import { MCP_TOOLS } from "@/lib/mcpTools";

/**
 * Connector setup.
 *
 * This page has been wrong twice, in opposite directions:
 *
 *   1. It told users to run `npx -y @integra/mcp`. That package is not
 *      published, so the command failed for everyone who copied it.
 *   2. It was corrected to a local build — `git clone`, `npm install`, and an
 *      absolute path to dist/index.js. That worked, but required cloning the
 *      whole product repo to obtain one connector, and only ever worked in
 *      Claude Desktop and Claude Code.
 *
 * Both were consequences of the stdio transport: it runs as a process on the
 * user's machine, so the user has to obtain and launch a binary. Claude on the
 * WEB and on MOBILE cannot spawn a process, so neither instruction reached
 * those surfaces at all.
 *
 * The remote server removes the whole category. A custom connector is a URL,
 * added once at the account level and live everywhere.
 */

/** Custom domain. Preferred, and what a customer should keep. */
const MCP_URL = "https://mcp.integramarkets.app/mcp";

/**
 * Railway-issued hostname for the same service.
 *
 * Shown as a fallback because a custom domain's certificate takes time to issue
 * after the DNS record lands, and a reader arriving in that window would
 * otherwise conclude the product is broken. Both addresses reach the identical
 * deployment.
 */
const MCP_URL_FALLBACK = "https://integra-mcp-production.up.railway.app/mcp";

function CopyBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked — no-op; user can select manually
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <button
          onClick={copy}
          className="text-xs text-accent-primary hover:underline"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-bg-primary p-4 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Copies the connector URL, then opens Claude's connector settings.
 *
 * Claude has NO deep link that pre-fills the "Add custom connector" dialog —
 * Anthropic's own documentation describes manual navigation and manual URL
 * entry as the only routes, and there is no documented query parameter or URL
 * scheme for it. So this is not a one-click install and is not presented as
 * one: it removes the two steps that can actually be removed (finding the page,
 * and getting the URL onto the clipboard) and leaves the paste.
 *
 * Falls back to opening the page anyway if the clipboard is blocked, because
 * arriving at the right screen without the URL is still better than arriving
 * nowhere.
 */
function AddToClaudeButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const go = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    } catch {
      // clipboard blocked — the URL is shown above, so it can be copied by hand
    }
    window.open("https://claude.ai/settings/connectors", "_blank", "noopener");
  };

  return (
    <div>
      <button
        onClick={go}
        className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-medium text-bg-primary transition hover:opacity-90"
      >
        Add to Claude
        <span aria-hidden="true">&rarr;</span>
      </button>
      <p className="mt-2 text-xs text-text-secondary">
        {copied
          ? "URL copied. In the tab that just opened, choose Add custom connector and paste it."
          : "Copies the URL and opens Claude's connector settings. Claude has no link that fills the dialog in for you, so the paste is manual."}
      </p>
    </div>
  );
}

type Props = {
  hasHistoryTier?: boolean;
};

export function ConnectClaude({ hasHistoryTier = false }: Props) {
  return (
    <div className="rounded-xl border border-divider bg-bg-secondary p-6">
      <div>
        <h2 className="text-lg font-semibold">Connect to Claude</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Integra runs as a custom connector. Nothing to install — add the URL
          once and it works in Claude on the web, desktop and mobile.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        <AddToClaudeButton url={MCP_URL} />

        <CopyBlock label="Connector URL" code={MCP_URL} />

        <ol className="space-y-2 text-sm text-text-secondary">
          <li>
            <span className="font-medium text-text-primary">1.</span> In Claude,
            open <span className="text-text-primary">Customize → Connectors</span>{" "}
            (Team and Enterprise owners:{" "}
            <span className="text-text-primary">
              Organization settings → Connectors
            </span>
            ).
          </li>
          <li>
            <span className="font-medium text-text-primary">2.</span> Choose{" "}
            <span className="text-text-primary">Add custom connector</span> and
            paste the URL above.
          </li>
          <li>
            <span className="font-medium text-text-primary">3.</span> Set{" "}
            <span className="text-text-primary">Authentication</span> to{" "}
            <span className="text-text-primary">None</span> — see the note below
            — and add your key as a request header.
          </li>
          <li>
            <span className="font-medium text-text-primary">4.</span> Turn it on
            in a conversation from the{" "}
            <span className="text-text-primary">+</span> menu, under Connectors.
          </li>
        </ol>

        <div className="rounded-lg border border-divider bg-bg-primary p-4">
          <h3 className="text-sm font-semibold">What to select</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex flex-wrap gap-x-3">
              <dt className="w-40 shrink-0 text-text-secondary">Authentication</dt>
              <dd className="text-text-primary">
                <span className="font-medium">None</span>
                <span className="ml-2 text-xs text-text-secondary">
                  Claude may suggest &ldquo;Always required&rdquo; — that means
                  OAuth, which this server does not use. None is the option for
                  API-key servers.
                </span>
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-3">
              <dt className="w-40 shrink-0 text-text-secondary">Header name</dt>
              <dd>
                <code className="text-accent-primary">Authorization</code>
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-3">
              <dt className="w-40 shrink-0 text-text-secondary">Header value</dt>
              <dd>
                <code className="text-accent-primary">Bearer ik_live_…</code>
                <span className="ml-2 text-xs text-text-secondary">
                  The word <span className="font-medium">Bearer</span> and a
                  space are required.
                </span>
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-3">
              <dt className="w-40 shrink-0 text-text-secondary">Transport</dt>
              <dd className="text-text-primary">
                Streamable HTTP
                <span className="ml-2 text-xs text-text-secondary">
                  detected from the URL; leave it. Not SSE.
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <details className="text-xs text-text-secondary">
          <summary className="cursor-pointer hover:text-text-primary">
            Connector not reachable?
          </summary>
          <div className="mt-3 space-y-2">
            <p>
              The address above uses a custom domain whose certificate is issued
              automatically. If it was set up very recently, this alternate
              address reaches the identical service:
            </p>
            <CopyBlock label="Alternate URL" code={MCP_URL_FALLBACK} />
          </div>
        </details>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold">Available tools</h3>
        <ul className="mt-3 space-y-2 text-sm text-text-secondary">
          {MCP_TOOLS.map((tool) => (
            <li key={tool.name}>
              <code className="text-accent-primary">{tool.name}</code> —{" "}
              {tool.blurb}
              {tool.historyTier && !hasHistoryTier && (
                <span className="ml-1 rounded bg-bg-primary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-secondary">
                  API + History tier
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 border-t border-divider pt-4 text-xs text-text-secondary">
        Once connected, try asking Claude:{" "}
        <span className="italic text-text-primary">
          &ldquo;Give me a market brief for Brent.&rdquo;
        </span>{" "}
        or{" "}
        <span className="italic text-text-primary">
          &ldquo;Which prediction markets does the AI most disagree with?&rdquo;
        </span>
      </div>
    </div>
  );
}
