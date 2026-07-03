import { z } from "zod";
import type { IntegraClient } from "../client.js";

export const compareHumanVsAiSchema = {
  market_id: z.string().optional().describe("Specific Kalshi or Polymarket market ID. Omit to get the top divergences across all tracked markets."),
  min_divergence: z.number().min(0).max(1).default(0.15).describe("Minimum absolute divergence (0-1) between AI sentiment and market-implied odds."),
};

export async function compareHumanVsAi(
  client: IntegraClient,
  args: { market_id?: string; min_divergence: number }
) {
  const data = await client.get<{
    markets: Array<{
      market_id: string;
      question: string;
      commodity: string;
      market_implied_prob: number;
      ai_implied_prob: number;
      divergence: number;
      direction: "ai_more_bullish" | "ai_more_bearish";
      confidence: number;
    }>;
  }>("/v1/markets/divergence", {
    market_id: args.market_id,
    min_divergence: args.min_divergence,
  });

  if (data.markets.length === 0) {
    return {
      content: [{ type: "text" as const, text: "No divergences above threshold found." }],
    };
  }

  const lines = [
    `**${data.markets.length} market${data.markets.length === 1 ? "" : "s"} where AI disagrees with market pricing** (min divergence: ${args.min_divergence})`,
    "",
  ];

  for (const m of data.markets.slice(0, 20)) {
    lines.push(
      `**${m.question}** _(${m.commodity})_`,
      `  Market: ${(m.market_implied_prob * 100).toFixed(1)}% | AI: ${(m.ai_implied_prob * 100).toFixed(1)}% | Δ ${(m.divergence * 100).toFixed(1)}pp (${m.direction === "ai_more_bullish" ? "AI ↑" : "AI ↓"})`,
      `  Confidence: ${(m.confidence * 100).toFixed(0)}%`,
      ""
    );
  }

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

export const screenHighConvictionSchema = {
  threshold: z.number().min(0).max(1).default(0.25).describe("Minimum divergence for 'high conviction' (0-1). Default 0.25 = 25 percentage points."),
  min_confidence: z.number().min(0).max(1).default(0.6).describe("Minimum AI confidence score (0-1)."),
};

export async function screenHighConviction(
  client: IntegraClient,
  args: { threshold: number; min_confidence: number }
) {
  return compareHumanVsAi(client, { min_divergence: args.threshold });
}
