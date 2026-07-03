import { z } from "zod";
import type { IntegraClient } from "../client.js";

export const getSentimentSchema = {
  commodity: z.string().describe("Commodity ticker or name (e.g., 'brent', 'wti', 'ng', 'copper', 'gold', 'wheat')."),
  window: z.enum(["24h", "7d", "30d", "90d"]).default("7d").describe("Time window for sentiment aggregation."),
};

export async function getSentiment(client: IntegraClient, args: { commodity: string; window: "24h" | "7d" | "30d" | "90d" }) {
  const data = await client.get<{
    commodity: string;
    window: string;
    score: number;
    label: "bullish" | "bearish" | "neutral";
    articles_analyzed: number;
    updated_at: string;
    top_drivers: Array<{ headline: string; source: string; sentiment: number; url: string }>;
  }>("/v1/sentiment", { commodity: args.commodity, window: args.window });

  return {
    content: [
      {
        type: "text" as const,
        text: [
          `**${data.commodity.toUpperCase()} sentiment — ${data.window}**`,
          `Score: ${data.score.toFixed(2)} (${data.label})`,
          `Based on ${data.articles_analyzed} articles, updated ${data.updated_at}.`,
          "",
          "**Top drivers:**",
          ...data.top_drivers.slice(0, 5).map(
            (d) => `- [${d.sentiment > 0 ? "+" : ""}${d.sentiment.toFixed(2)}] ${d.headline} — ${d.source}`
          ),
        ].join("\n"),
      },
    ],
  };
}
