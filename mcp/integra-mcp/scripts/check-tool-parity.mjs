#!/usr/bin/env node
/**
 * The dashboard's tool list must match what the server advertises.
 *
 * These two lists live in different packages and are built separately —
 * Vercel builds the dashboard with `dashboard/` as its root directory, so it
 * cannot import from `mcp/integra-mcp/`. The duplication is unavoidable. Going
 * unchecked is not.
 *
 * They have already drifted once. On 2026-09-08 `find_historical_analogs` was
 * withdrawn from the server, because `/v1/historical/analogs` returns 501 until
 * the archive backfill lands. The dashboard kept advertising it, so the page
 * promised a tool the connector would not offer — the customer-facing half of
 * the same silent-divergence pattern that runs through this codebase.
 *
 * Usage:  node scripts/check-tool-parity.mjs
 * Exits non-zero on any mismatch, and says which side is ahead.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_TS = join(HERE, "..", "src", "server.ts");
const DASHBOARD_TS = join(HERE, "..", "..", "..", "dashboard", "lib", "mcpTools.ts");

/**
 * Read tool names out of a TS source file by scanning `name: "..."` entries
 * inside a named array literal.
 *
 * Parsing the source rather than importing it keeps this dependency-free and
 * able to read across package boundaries — importing the dashboard's module
 * would need a TypeScript loader, and importing the server's would need it
 * built first, which defeats the point of a fast pre-merge check.
 */
function namesIn(source, arrayName) {
  const start = source.indexOf(`${arrayName}`);
  if (start === -1) return null;
  // Find the "[" that OPENS THE ARRAY, not the one in the type annotation:
  // `TOOLS: ToolDef[] = [` contains two, and taking the first matched the
  // empty pair in `ToolDef[]`, so this reported "0 tools in sync" and passed.
  // A check that is vacuously green is worse than no check at all.
  const assign = source.indexOf("=", start);
  if (assign === -1) return null;
  const open = source.indexOf("[", assign);
  if (open === -1) return null;

  let depth = 0;
  let end = -1;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "[") depth++;
    else if (source[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;

  const body = source.slice(open, end);
  return [...body.matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]);
}

function load(path, label) {
  try {
    return readFileSync(path, "utf8");
  } catch (err) {
    console.error(`Could not read ${label} at ${path}: ${err.message}`);
    process.exit(2);
  }
}

const serverSrc = load(SERVER_TS, "the MCP server");
const dashSrc = load(DASHBOARD_TS, "the dashboard tool list");

const checks = [
  {
    label: "advertised",
    server: namesIn(serverSrc, "TOOLS: ToolDef[]"),
    dashboard: namesIn(dashSrc, "MCP_TOOLS: McpTool[]"),
  },
  {
    label: "withdrawn",
    server: namesIn(serverSrc, "WITHDRAWN_TOOLS: ToolDef[]"),
    dashboard: namesIn(dashSrc, "MCP_TOOLS_WITHDRAWN: McpTool[]"),
  },
];

let failed = false;

for (const { label, server, dashboard } of checks) {
  if (server !== null && dashboard !== null && server.length === 0 && dashboard.length === 0) {
    console.error(
      `✖ ${label}: both lists parsed as EMPTY. That is a parser failure, not ` +
        `agreement — the advertised list is never legitimately empty.`
    );
    failed = true;
    continue;
  }

  if (server === null || dashboard === null) {
    console.error(
      `✖ ${label}: could not locate the list in one of the files. ` +
        `The array was probably renamed — update this script rather than deleting it.`
    );
    failed = true;
    continue;
  }

  const s = new Set(server);
  const d = new Set(dashboard);
  const serverOnly = server.filter((n) => !d.has(n));
  const dashOnly = dashboard.filter((n) => !s.has(n));

  if (serverOnly.length === 0 && dashOnly.length === 0) {
    console.log(`✔ ${label}: ${server.length} tool(s) in sync`);
    continue;
  }

  failed = true;
  console.error(`✖ ${label} lists disagree:`);
  if (serverOnly.length) {
    console.error(
      `    server has, dashboard does not: ${serverOnly.join(", ")}\n` +
        `    -> customers will not be told about a tool they have`
    );
  }
  if (dashOnly.length) {
    console.error(
      `    dashboard has, server does not: ${dashOnly.join(", ")}\n` +
        `    -> the page promises a tool the connector will not offer`
    );
  }
}

if (failed) {
  console.error(
    "\nFix by editing whichever list is wrong:\n" +
      "  mcp/integra-mcp/src/server.ts   (TOOLS / WITHDRAWN_TOOLS)\n" +
      "  dashboard/lib/mcpTools.ts       (MCP_TOOLS / MCP_TOOLS_WITHDRAWN)"
  );
  process.exit(1);
}

console.log("Tool lists are in sync.");
