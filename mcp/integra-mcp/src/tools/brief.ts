import { z } from "zod";
import type { IntegraClient } from "../client.js";

export const marketBriefSchema = {
  commodity: z.string().describe("Commodity ticker (e.g., 'brent', 'wti', 'ng', 'copper', 'wheat', 'gold')."),
};

// High-value composite tool: bundles sentiment + top narratives + biggest divergence
// into a single request. Reduces roundtrips and gives Claude a richer briefing to
// reason with.
export async function marketBrief(client: IntegraClient, args: { commodity: string }) {
  const brief = await client.get<{
    commodity: string;
    generated_at: string;
    sentiment: {
      score_7d: number;
      score_30d: number;
      label: string;
      delta_vs_prior_week: number;
    };
    top_narratives: Array<{ theme: string; sentiment: number; article_count: number }>;
    key_divergences: Array<{
      question: string;
      market_implied_prob: number;
      ai_implied_prob: number;
      divergence: number;
    }>;
    price_context?: {
      last_close: number;
      change_7d_pct: number;
      change_30d_pct: number;
    };
  }>("/v1/brief", { commodity: args.commodity });

  const lines: string[] = [
    `# ${brief.commodity.toUpperCase()} — market brief`,
    `_Generated ${brief.generated_at}_`,
    "",
    "## Sentiment",
    `- 7-day: **${brief.sentiment.score_7d.toFixed(2)}** (${brief.sentiment.label})`,
    `- 30-day: ${brief.sentiment.score_30d.toFixed(2)}`,
    `- Δ vs prior week: ${brief.sentiment.delta_vs_prior_week > 0 ? "+" : ""}${brief.sentiment.delta_vs_prior_week.toFixed(2)}`,
    "",
  ];

  if (brief.price_context) {
    lines.push(
      "## Price context",
      `- Last close: $${brief.price_context.last_close.toFixed(2)}`,
      `- 7d: ${brief.price_context.change_7d_pct > 0 ? "+" : ""}${brief.price_context.change_7d_pct.toFixed(2)}%`,
      `- 30d: ${brief.price_context.change_30d_pct > 0 ? "+" : ""}${brief.price_context.change_30d_pct.toFixed(2)}%`,
      ""
    );
  }

  if (brief.top_narratives.length > 0) {
    lines.push("## Top narratives");
    for (const n of brief.top_narratives.slice(0, 5)) {
      lines.push(`- **${n.theme}** — sentiment ${n.sentiment.toFixed(2)}, ${n.article_count} articles`);
    }
    lines.push("");
  }

  if (brief.key_divergences.length > 0) {
    lines.push("## AI vs market (prediction-market divergences)");
    for (const d of brief.key_divergences.slice(0, 3)) {
      lines.push(
        `- **${d.question}**`,
        `  Market: ${(d.market_implied_prob * 100).toFixed(1)}% | AI: ${(d.ai_implied_prob * 100).toFixed(1)}% | Δ ${(d.divergence * 100).toFixed(1)}pp`
      );
    }
  }

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

// Placeholder for the Session 3 tool — requires historical archive.
export const findHistoricalAnalogsSchema = {
  commodity: z.string().describe("Commodity ticker."),
  event: z.string().describe("Describe the current event / setup you want to find analogs for (e.g., 'OPEC+ surprise cut', 'winter demand shock')."),
  n: z.number().int().min(1).max(10).default(5).describe("Number of analogs to return."),
};

export async function findHistoricalAnalogs(
  client: IntegraClient,
  args: { commodity: string; event: string; n: number }
) {
  const data = await client.get<{
    analogs: Array<{
      date: string;
      similarity: number;
      description: string;
      outcome_30d_pct: number;
      outcome_90d_pct: number;
    }>;
  }>("/v1/historical/analogs", { commodity: args.commodity, event: args.event, n: args.n });

  if (!data.analogs || data.analogs.length === 0) {
    return {
      content: [{ type: "text" as const, text: "No historical analogs found matching that description." }],
    };
  }

  const lines: string[] = [`**${data.analogs.length} historical analogs for ${args.commodity.toUpperCase()}: "${args.event}"**`, ""];
  for (const a of data.analogs) {
    lines.push(
      `**${a.date}** — similarity ${(a.similarity * 100).toFixed(0)}%`,
      `  ${a.description}`,
      `  Outcome: +30d ${a.outcome_30d_pct > 0 ? "+" : ""}${a.outcome_30d_pct.toFixed(1)}% | +90d ${a.outcome_90d_pct > 0 ? "+" : ""}${a.outcome_90d_pct.toFixed(1)}%`,
      ""
    );
  }

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}
