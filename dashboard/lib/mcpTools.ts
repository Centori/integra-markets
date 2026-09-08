/**
 * The tools the MCP connector advertises.
 *
 * This list is duplicated from `mcp/integra-mcp/src/server.ts` because the
 * dashboard is built by Vercel with `dashboard/` as its root directory, so it
 * cannot import from outside that folder. The duplication is deliberate and
 * *checked*: `mcp/integra-mcp/scripts/check-tool-parity.mjs` reads this file and
 * fails if it disagrees with the server's `TOOLS` export.
 *
 * That check exists because the two lists have already drifted once. On
 * 2026-09-08 `find_historical_analogs` was withdrawn from the server — it calls
 * `/v1/historical/analogs`, which returns 501 until the archive backfill lands —
 * and this page kept advertising it. A customer would have read about a tool
 * their connector does not offer.
 */

export type McpTool = {
  name: string;
  /** Shown on the dashboard. Kept shorter than the server's own description. */
  blurb: string;
  /** Gated behind the archive tier; shown with a badge when the user lacks it. */
  historyTier?: boolean;
};

export const MCP_TOOLS: McpTool[] = [
  {
    name: "get_sentiment",
    blurb: "aggregate sentiment for a commodity over a window",
  },
  {
    name: "compare_human_vs_ai",
    blurb: "AI vs prediction-market divergence",
  },
  {
    name: "screen_high_conviction_markets",
    blurb: "top trade candidates by divergence",
  },
  {
    name: "find_emerging_narratives",
    blurb: "themes in recent news",
  },
  {
    name: "market_brief",
    blurb: "sentiment + narratives + divergence + price in one call",
  },
];

/**
 * Defined but NOT advertised, because the endpoint behind it returns 501.
 *
 * Kept here rather than deleted so the parity check can assert it stays out of
 * `MCP_TOOLS` for as long as it stays out of the server's `TOOLS` — and so
 * restoring it is a one-line move once the backfill completes.
 */
export const MCP_TOOLS_WITHDRAWN: McpTool[] = [
  {
    name: "find_historical_analogs",
    blurb: "similar past setups + realized moves",
    historyTier: true,
  },
];
