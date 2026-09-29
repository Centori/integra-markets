/**
 * Transport-independent MCP server construction.
 *
 * MCP separates *what tools exist* from *how the client reaches them*, and
 * this file is the "what". Both entrypoints build the same tools:
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
import { PROMPTS, PROMPT_BY_NAME } from "./prompts.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
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
import {
  getSentimentHistory,
  getSentimentHistorySchema,
  listCommodities,
  listCommoditiesSchema,
} from "./tools/history.js";

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
    name: "list_commodities",
    description:
      "List the commodities that have scored articles in the database. Call this first when unsure what a name maps to, or to check a key works — it is the cheapest authenticated call.",
    schema: listCommoditiesSchema,
    handler: (c) => listCommodities(c),
  },
  {
    name: "get_sentiment_history",
    description:
      "Daily sentiment series for a commodity over the last N days: average score, article counts, and day-on-day momentum. Use this for 'how has X moved', trends and turning points — get_sentiment returns a single aggregate and cannot answer those.",
    schema: getSentimentHistorySchema,
    handler: (c, a) => getSentimentHistory(c, a),
  },
];

/**
 * Withdrawn from the advertised list until the archive backfill completes.
 *
 * `/v1/historical/analogs` returns 501 today — the backfill tables it reads are
 * not populated. Advertising a tool that always fails is worse than not
 * advertising it: an assistant will pick it precisely when the user asks the
 * question the product is meant to answer, and the failure lands mid-conversation
 * as a protocol error rather than as an honest "not yet".
 *
 * Kept defined rather than deleted so it cannot rot, and so restoring it is a
 * one-line move back into TOOLS once the endpoint returns data.
 */
export const WITHDRAWN_TOOLS: ToolDef[] = [
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
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      // Everything below `version` is what a client has to render the
      // connector with. Without it the only identity we hand over is the
      // string "integra-mcp", so the connector shows up as a generic entry
      // among a user's others — which is how it has looked until now.
      //
      // The icon is served from the dashboard rather than from here: this
      // process answers JSON-RPC and has no business serving images, and the
      // dashboard already holds the asset behind a certificate we control.
      title: "Integra Markets",
      websiteUrl: "https://dashboard.integramarkets.app/mcp",
      description:
        "Commodity sentiment, prediction-market divergence, and narrative " +
        "intelligence, queried directly from your conversation.",
      icons: [
        {
          src: "https://dashboard.integramarkets.app/integra-icon.png",
          mimeType: "image/png",
          sizes: ["1024x1024"],
        },
      ],
    },
    { capabilities: { tools: {}, prompts: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(z.object(t.schema)),
    })),
  }));

  // Prompts: the discovery surface.
  //
  // Tools answer questions someone already knows to ask. A new user arrived with
  // seven tool names, no worked examples, and no way to know that `brent`
  // matches nothing while `oil` matches 60,000 documents — so the first
  // conversation was usually a guess that returned an empty result, which reads
  // exactly like a product with no data in it. Clients surface prompts as
  // pickable starting points, which is what "Hi Integra" needs to be.
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: PROMPTS.map((p) => ({
      name: p.name,
      title: p.title,
      description: p.description,
      arguments: p.arguments ?? [],
    })),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (req) => {
    const prompt = PROMPT_BY_NAME.get(req.params.name);
    if (!prompt) {
      throw new Error(
        `Unknown prompt: ${req.params.name}. Available: ` +
          PROMPTS.map((p) => p.name).join(", ")
      );
    }
    return {
      description: prompt.description,
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: prompt.render(
              (req.params.arguments ?? {}) as Record<string, string>
            ),
          },
        },
      ],
    };
  });

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
