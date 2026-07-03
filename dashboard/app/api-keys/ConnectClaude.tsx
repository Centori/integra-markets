"use client";

import { useState } from "react";

const CLAUDE_CODE_CMD = `claude mcp add integra \\
  --env INTEGRA_API_KEY=<your_api_key> \\
  -- npx -y @integra/mcp`;

const CLAUDE_DESKTOP_JSON = `{
  "mcpServers": {
    "integra": {
      "command": "npx",
      "args": ["-y", "@integra/mcp"],
      "env": {
        "INTEGRA_API_KEY": "<your_api_key>"
      }
    }
  }
}`;

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
          type="button"
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
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold">Connect to Claude</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Use Integra from Claude Desktop or Claude Code with no code.
            Replace <code className="text-accent-primary">&lt;your_api_key&gt;</code> with a key created above.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <CopyBlock label="Claude Code (terminal)" code={CLAUDE_CODE_CMD} />
        <div>
          <p className="mb-2 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Claude Desktop:</span>{" "}
            add to{" "}
            <code className="text-accent-primary">
              ~/Library/Application Support/Claude/claude_desktop_config.json
            </code>{" "}
            (macOS) or{" "}
            <code className="text-accent-primary">
              %APPDATA%\Claude\claude_desktop_config.json
            </code>{" "}
            (Windows), then restart Claude.
          </p>
          <CopyBlock label="Claude Desktop config" code={CLAUDE_DESKTOP_JSON} />
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold">Available tools</h3>
        <ul className="mt-3 space-y-2 text-sm text-text-secondary">
          <li>
            <code className="text-accent-primary">get_sentiment</code> — aggregate sentiment for a commodity over a window
          </li>
          <li>
            <code className="text-accent-primary">market_brief</code> — sentiment + narratives + divergence + price in one call
          </li>
          <li>
            <code className="text-accent-primary">find_emerging_narratives</code> — themes in recent news
          </li>
          <li>
            <code className="text-accent-primary">compare_human_vs_ai</code> — AI vs prediction-market divergence
          </li>
          <li>
            <code className="text-accent-primary">screen_high_conviction_markets</code> — top trade candidates by divergence
          </li>
          <li>
            <code className="text-accent-primary">find_historical_analogs</code>
            {hasHistoryTier ? (
              " — similar past setups + realized moves"
            ) : (
              <>
                {" "}— similar past setups + realized moves{" "}
                <span className="ml-1 rounded bg-bg-primary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-secondary">
                  API + History tier
                </span>
              </>
            )}
          </li>
        </ul>
      </div>

      <div className="mt-6 border-t border-divider pt-4 text-xs text-text-secondary">
        Once installed, try asking Claude:{" "}
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
