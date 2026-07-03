#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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

const apiKey = process.env.INTEGRA_API_KEY;
if (!apiKey) {
  console.error("[integra-mcp] INTEGRA_API_KEY environment variable is required.");
  console.error("Get a key from https://dashboard.integramarkets.app/api-keys");
  process.exit(1);
}

const client = new IntegraClient(apiKey);

const tools = [
  {
    name: "get_sentiment",
    description: "Aggregate news sentiment for a commodity over a time window. Returns score, label (bullish/bearish/neutral), and top-driving headlines.",
    schema: getSentimentSchema,
    handler: (a: z.infer<z.ZodObject<typeof getSentimentSchema>>) => getSentiment(client, a),
  },
  {
    name: "compare_human_vs_ai",
    description: "Compare AI sentiment against prediction-market implied probabilities (Kalshi + Polymarket). Surfaces markets where the model disagrees with the crowd.",
    schema: compareHumanVsAiSchema,
    handler: (a: z.infer<z.ZodObject<typeof compareHumanVsAiSchema>>) => compareHumanVsAi(client, a),
  },
  {
    name: "screen_high_conviction_markets",
    description: "Screen for prediction markets where AI has the strongest disagreement with market pricing. Useful for finding trade candidates.",
    schema: screenHighConvictionSchema,
    handler: (a: z.infer<z.ZodObject<typeof screenHighConvictionSchema>>) => screenHighConviction(client, a),
  },
  {
    name: "find_emerging_narratives",
    description: "Detect emerging themes / narratives in commodity news over a lookback window. Returns theme, article count, average sentiment, and trend direction.",
    schema: findEmergingNarrativesSchema,
    handler: (a: z.infer<z.ZodObject<typeof findEmergingNarrativesSchema>>) => findEmergingNarratives(client, a),
  },
  {
    name: "market_brief",
    description: "One-call briefing for a commodity: current sentiment, top narratives, key prediction-market divergences, and price context. Use this when the user wants a holistic snapshot.",
    schema: marketBriefSchema,
    handler: (a: z.infer<z.ZodObject<typeof marketBriefSchema>>) => marketBrief(client, a),
  },
  {
    name: "find_historical_analogs",
    description: "[API+History tier] Find historical periods similar to a described current event. Returns dates, similarity scores, and how the commodity moved over the next 30/90 days.",
    schema: findHistoricalAnalogsSchema,
    handler: (a: z.infer<z.ZodObject<typeof findHistoricalAnalogsSchema>>) => findHistoricalAnalogs(client, a),
  },
];

const server = new Server(
  { name: "integra-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(z.object(t.schema)),
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = tools.find((t) => t.name === req.params.name);
  if (!tool) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: `Unknown tool: ${req.params.name}` }],
    };
  }
  try {
    const parsed = z.object(tool.schema).parse(req.params.arguments ?? {});
    return await tool.handler(parsed as never);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      content: [{ type: "text" as const, text: msg }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[integra-mcp] server started on stdio");
