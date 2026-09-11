"use client";

import { useState } from "react";

/**
 * How to actually call the API, on the page where the key is created.
 *
 * There is no SDK to install. `docs/` told customers to run
 * `npm install @integra-markets/sdk`, which has never been published, and the
 * generated client that used to live in `sdk/` was removed from the repo on
 * purpose — a customer should not clone a product's source to talk to its
 * HTTP API. What is left is the thing they needed from either: the request,
 * with their key in it, in the language they are already writing.
 *
 * Every snippet is one dependency-free HTTP call, which is also the honest
 * description of this API. `curl` is first because it is the one that proves a
 * key works before any code exists to blame.
 */

const API_BASE = "https://api.integramarkets.app";
const MCP_URL = "https://integra-mcp-production.up.railway.app/mcp";

/** Deliberately not a real-looking key. Nobody should paste this and wonder. */
const KEY_PLACEHOLDER = "ik_live_YOUR_KEY";

type Snippet = { id: string; label: string; language: string; code: string };

const SNIPPETS: Snippet[] = [
  {
    id: "curl",
    label: "curl",
    language: "bash",
    code: `curl -s "${API_BASE}/v1/sentiment?commodity=oil&window=24h" \\
  -H "Authorization: Bearer ${KEY_PLACEHOLDER}"`,
  },
  {
    id: "python",
    label: "Python",
    language: "python",
    code: `import os, requests

resp = requests.get(
    "${API_BASE}/v1/sentiment",
    params={"commodity": "oil", "window": "24h"},
    headers={"Authorization": f"Bearer {os.environ['INTEGRA_API_KEY']}"},
    timeout=30,
)
resp.raise_for_status()
print(resp.json())`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    language: "typescript",
    code: `const params = new URLSearchParams({
  commodity: "oil",
  window: "24h",
});

const res = await fetch(\`${API_BASE}/v1/sentiment?\${params}\`, {
  headers: { Authorization: \`Bearer \${process.env.INTEGRA_API_KEY}\` },
});
if (!res.ok) throw new Error(\`\${res.status} \${await res.text()}\`);
console.log(await res.json());`,
  },
  {
    id: "mcp",
    label: "Claude (MCP)",
    language: "json",
    code: `{
  "url": "${MCP_URL}",
  "transport": "Streamable HTTP",
  "authentication": "None",
  "headers": {
    "Authorization": "Bearer ${KEY_PLACEHOLDER}"
  }
}`,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Clipboard denied (insecure context, permission). The code is visible
      // and selectable, so this is a missing convenience, not a failure.
    }
  };

  return (
    <button
      onClick={copy}
      className="shrink-0 text-xs text-accent-primary hover:underline"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function QuickStart() {
  const [active, setActive] = useState(SNIPPETS[0].id);
  const snippet = SNIPPETS.find((s) => s.id === active) ?? SNIPPETS[0];

  return (
    <div className="rounded-xl border border-divider bg-bg-secondary">
      <div className="flex items-center justify-between gap-4 border-b border-divider px-4">
        <div
          role="tablist"
          aria-label="Language"
          className="-mb-px flex gap-1 overflow-x-auto"
        >
          {SNIPPETS.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === active}
              onClick={() => setActive(s.id)}
              className={
                "whitespace-nowrap border-b-2 px-3 py-2.5 text-xs transition " +
                (s.id === active
                  ? "border-accent-primary text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary")
              }
            >
              {s.label}
            </button>
          ))}
        </div>
        <CopyButton text={snippet.code} />
      </div>

      {/* Wide lines scroll inside the block. Without this the page itself
          scrolls sideways on a phone, which breaks every other section too. */}
      <pre className="overflow-x-auto px-4 py-4 text-xs leading-relaxed">
        <code className="text-text-primary">{snippet.code}</code>
      </pre>

      <p className="border-t border-divider px-4 py-3 text-xs text-text-secondary">
        Replace{" "}
        <code className="text-accent-primary">{KEY_PLACEHOLDER}</code> with a key
        from the section above, and keep it server-side — a key in a browser
        bundle is a public key.
      </p>
    </div>
  );
}
