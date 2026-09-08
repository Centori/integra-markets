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

/** Name Claude pre-fills into the connector dialog. */
const CONNECTOR_NAME = "Integra Markets";

/**
 * Deep link that opens Claude's Add-custom-connector dialog with the name and
 * URL already filled in.
 *
 * Built rather than hard-coded so the URL can never be half-encoded: the
 * connector URL has to survive as a query parameter, and a raw "https://…"
 * with unescaped slashes and colon is the kind of thing that works in testing
 * and breaks on the one address that contains a character someone forgot.
 *
 * The trailing fragment is what selects the connectors pane, and matches the
 * "Customize → Connectors" path in the written steps.
 */
function claudeConnectorLink(name: string, url: string): string {
  const params = new URLSearchParams({
    modal: "add-custom-connector",
    connectorName: name,
    connectorUrl: url,
  });
  // URLSearchParams encodes a space as "+", which is correct
  // form-encoding but renders as a literal plus in any parser that does not
  // decode it — the dialog would read "Integra+Markets". %20 is unambiguous
  // in both readings.
  const query = params.toString().replace(/\+/g, "%20");
  return `https://claude.ai/new?${query}#settings/customize-connectors`;
}

/**
 * Setup dialog, modelled on how other MCP products present this.
 *
 * A card of instructions on a settings page gets skimmed. The steps only matter
 * at the moment someone is actually connecting, so they live behind one button
 * and appear in order, with the URL copyable at the point it is needed.
 */
function ConnectDialog({
  url,
  fallbackUrl,
  onClose,
}: {
  url: string;
  fallbackUrl: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // clipboard blocked — the URL is visible and selectable
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Connect Integra to Claude"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-divider bg-bg-secondary p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-divider text-text-secondary hover:text-text-primary"
        >
          &times;
        </button>

        <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
          Claude
        </p>

        <ol className="mt-6 space-y-6">
          <Step n={1} text="Copy the server URL below.">
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-bg-primary px-4 py-3">
              <code className="truncate text-xs text-text-primary">{url}</code>
              <button
                onClick={copy}
                className="shrink-0 text-xs text-accent-primary hover:underline"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </Step>

          <Step
            n={2}
            text={
              <>
                Open Claude&rsquo;s custom connector dialog. The name and URL
                should be prefilled — if not, enter{" "}
                <span className="text-text-primary">
                  &ldquo;{CONNECTOR_NAME}&rdquo;
                </span>{" "}
                and paste the URL.
              </>
            }
          >
            <a
              href={claudeConnectorLink(CONNECTOR_NAME, url)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-text-primary px-4 py-2.5 text-sm font-medium text-bg-primary transition hover:opacity-90"
            >
              Open in Claude
              <span aria-hidden="true">&#8599;</span>
            </a>
          </Step>

          <Step
            n={3}
            text={
              <>
                Set <span className="text-text-primary">Authentication</span> to{" "}
                <span className="text-text-primary">None</span>, then add a
                request header:{" "}
                <code className="text-accent-primary">Authorization</code> with
                the value{" "}
                <code className="text-accent-primary">Bearer ik_live_…</code>{" "}
                using a key from this page.
              </>
            }
          >
            <p className="mt-2 text-xs text-text-secondary">
              Claude may suggest &ldquo;Always required&rdquo;. That means OAuth,
              which this server does not use — <span className="text-text-primary">None</span>{" "}
              is the option for API-key servers. Leave Transport on{" "}
              <span className="text-text-primary">Streamable HTTP</span>.
            </p>
          </Step>

          <Step n={4} text="Tap Add to save the connector, then enable it in a conversation from the + menu." />
        </ol>

        <details className="mt-8 text-xs text-text-secondary">
          <summary className="cursor-pointer hover:text-text-primary">
            Connector not reachable?
          </summary>
          <p className="mt-3">
            The address above uses a custom domain whose certificate is issued
            automatically. If it was set up very recently, this alternate address
            reaches the identical service:
          </p>
          <code className="mt-2 block break-all rounded-lg bg-bg-primary p-3 text-[11px] text-text-primary">
            {fallbackUrl}
          </code>
        </details>
      </div>
    </div>
  );
}

function Step({
  n,
  text,
  children,
}: {
  n: number;
  text: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-divider text-xs text-text-secondary">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-primary">{text}</p>
        {children}
      </div>
    </li>
  );
}

type Props = {
  hasHistoryTier?: boolean;
};

export function ConnectClaude({ hasHistoryTier = false }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-divider bg-bg-secondary p-6">
      <div>
        <h2 className="text-lg font-semibold">Connect to Claude</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Integra runs as a custom connector. Nothing to install — add the URL
          once and it works in Claude on the web, desktop and mobile.
        </p>
      </div>

      <button
        onClick={() => setOpen(true)}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-medium text-bg-primary transition hover:opacity-90"
      >
        Start on Claude
        <span aria-hidden="true">&rarr;</span>
      </button>

      {open && (
        <ConnectDialog
          url={MCP_URL}
          fallbackUrl={MCP_URL_FALLBACK}
          onClose={() => setOpen(false)}
        />
      )}

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
