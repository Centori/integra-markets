import { z } from "zod";
import type { IntegraClient } from "../client.js";

export const findEmergingNarrativesSchema = {
  commodity: z.string().describe("Commodity ticker (e.g., 'brent', 'wti', 'ng', 'copper', 'wheat')."),
  lookback: z.enum(["24h", "7d", "30d"]).default("7d").describe("Lookback window."),
};

export async function findEmergingNarratives(
  client: IntegraClient,
  args: { commodity: string; lookback: "24h" | "7d" | "30d" }
) {
  const data = await client.get<{
    commodity: string;
    lookback: string;
    narratives: Array<{
      theme: string;
      article_count: number;
      avg_sentiment: number;
      trend: "rising" | "falling" | "stable";
      first_seen: string;
      sample_headlines: string[];
    }>;
  }>("/v1/narratives", { commodity: args.commodity, lookback: args.lookback });

  if (data.narratives.length === 0) {
    return {
      content: [{ type: "text" as const, text: `No emerging narratives detected for ${args.commodity} over ${args.lookback}.` }],
    };
  }

  const lines: string[] = [`**Emerging narratives for ${data.commodity.toUpperCase()} — ${data.lookback}**`, ""];
  for (const n of data.narratives.slice(0, 8)) {
    const arrow = n.trend === "rising" ? "↑" : n.trend === "falling" ? "↓" : "→";
    lines.push(
      `**${n.theme}** ${arrow} (${n.article_count} articles, sentiment ${n.avg_sentiment.toFixed(2)})`,
      `  First seen: ${n.first_seen}`,
      ...n.sample_headlines.slice(0, 2).map((h) => `  - "${h}"`),
      ""
    );
  }

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}
