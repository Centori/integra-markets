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
            <span className="font-medium text-text-primary">3.</span> When asked
            to authenticate, use a key from this page — the one beginning{" "}
            <code className="text-accent-primary">ik_live_</code>.
          </li>
          <li>
            <span className="font-medium text-text-primary">4.</span> Turn it on
            in a conversation from the{" "}
            <span className="text-text-primary">+</span> menu, under Connectors.
          </li>
        </ol>

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
