/**
 * Transport-independent MCP server construction.
 *
 * MCP separates *what tools exist* from *how the client reaches them*, and
 * this file is the "what". Both entrypoints build the same six tools:
 *
 *   index.ts  — stdio.  Claude Desktop / Claude Code spawn it locally.
 *   http.ts   — Streamable HTTP. Remote clients (ChatGPT connectors, hosted
 *               agents) which cannot spawn a process on the user's machine.
 *
 * The one thing that genuinely differs is where the API key comes from, and
 * it is not a detail:
 *
 *   stdio — one user, one machine, one key from INTEGRA_API_KEY. The key sits
 *           in a local config file only its owner can read.
 *   http  — many users hitting one server. A key baked into the process would
 *           mean every caller shares one identity, one entitlement and one
 *           rate-limit bucket. The key MUST come from each request.
 *
 * So the server takes a client *factory* rather than a client.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "./util-zod-schema.js";
import { IntegraClient } from "./client.js";
import { getSentiment, getSentimentSchema } from "./tools/sentiment.js";
import {
  compareHumanVsAi,
  compareHumanVsAiSchema,
  screenHighConviction,
  screenHighConvictionSchema,
} from "./tools/divergence.js";
import { findEmergingNarratives, findEmergingNarrativesSchema } from "./tools/narratives.js";
import {
  marketBrief,
  marketBriefSchema,
  findHistoricalAnalogs,
  findHistoricalAnalogsSchema,
} from "./tools/brief.js";

export const SERVER_NAME = "integra-mcp";
export const SERVER_VERSION = "0.2.0";

type ToolDef = {
  name: string;
  description: string;
  schema: Record<string, z.ZodTypeAny>;
  handler: (client: IntegraClient, args: never) => Promise<unknown>;
};

export const TOOLS: ToolDef[] = [
  {
    name: "get_sentiment",
    description:
      "Aggregate news sentiment for a commodity over a time window. Returns score, label (bullish/bearish/neutral), and top-driving headlines.",
    schema: getSentimentSchema,
    handler: (c, a) => getSentiment(c, a),
  },
  {
    name: "compare_human_vs_ai",
    description:
      "Compare AI sentiment against prediction-market implied probabilities (Kalshi + Polymarket). Surfaces markets where the model disagrees with the crowd.",
    schema: compareHumanVsAiSchema,
    handler: (c, a) => compareHumanVsAi(c, a),
  },
  {
    name: "screen_high_conviction_markets",
    description:
      "Screen for prediction markets where AI has the strongest disagreement with market pricing. Useful for finding trade candidates.",
    schema: screenHighConvictionSchema,
    handler: (c, a) => screenHighConviction(c, a),
  },
  {
    name: "find_emerging_narratives",
    description:
      "Detect emerging themes / narratives in commodity news over a lookback window. Returns theme, article count, average sentiment, and trend direction.",
    schema: findEmergingNarrativesSchema,
    handler: (c, a) => findEmergingNarratives(c, a),
  },
  {
    name: "market_brief",
    description:
      "One-call briefing for a commodity: current sentiment, top narratives, key prediction-market divergences, and price context. Use this when the user wants a holistic snapshot.",
    schema: marketBriefSchema,
    handler: (c, a) => marketBrief(c, a),
  },
  {
    name: "find_historical_analogs",
    description:
      "[API+History tier] Find historical periods similar to a described current event. Returns dates, similarity scores, and how the commodity moved over the next 30/90 days.",
    schema: findHistoricalAnalogsSchema,
    handler: (c, a) => findHistoricalAnalogs(c, a),
  },
];

/**
 * Build a configured MCP server.
 *
 * `getClient` is called per tool invocation so an HTTP host can bind the
 * caller's own key, while stdio just returns the same instance every time.
 */
export function createServer(getClient: () => IntegraClient): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(z.object(t.schema)),
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = TOOLS.find((t) => t.name === req.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Unknown tool: ${req.params.name}` }],
      };
    }
    try {
      const parsed = z.object(tool.schema).parse(req.params.arguments ?? {});
      return (await tool.handler(getClient(), parsed as never)) as never;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [{ type: "text" as const, text: msg }],
      };
    }
  });

  return server;
}
