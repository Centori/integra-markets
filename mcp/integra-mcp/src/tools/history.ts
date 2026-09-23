/**
 * Reading the stored series, rather than the current snapshot.
 *
 * Every other tool answers "what is true now". The database holds a scored
 * document per article going back months, and until now nothing in the
 * connector could reach it: asking Claude "how has copper sentiment moved
 * since August" had no tool to call, so it either declined or inferred a
 * trend from a single `get_sentiment` reading — which is the same number
 * quoted twice, presented as a direction.
 *
 * `/v1/sentiment/{commodity}/daily` does the bucketing server-side and
 * returns momentum with it, so the model reports a computed change rather
 * than subtracting two numbers it was never given.
 */
import { z } from "zod";
import type { IntegraClient } from "../client.js";

export const listCommoditiesSchema = {};

type CommoditiesResponse = { commodities?: string[] };

export async function listCommodities(client: IntegraClient) {
  const data = await client.get<CommoditiesResponse>("/v1/commodities");
  const names = (data.commodities ?? []).filter(Boolean);

  return {
    content: [
      {
        type: "text" as const,
        text: names.length
          ? [`**${names.length} commodities available**`, "", ...names.map((n) => `- ${n}`)].join("\n")
          : "No commodities are currently indexed.",
      },
    ],
  };
}

export const getSentimentHistorySchema = {
  commodity: z
    .string()
    .describe("Commodity ticker or name (e.g., 'brent', 'wti', 'ng', 'copper', 'gold', 'wheat')."),
  days: z
    .number()
    .int()
    .min(1)
    .max(365)
    .default(30)
    .describe(
      "How many days back to read. Keys on the History tier are capped at 90; deeper ranges need the Archive tier."
    ),
};

type DailyPoint = {
  date: string;
  avg_score: number | null;
  article_count: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  momentum: number | null;
};

type DailyResponse = {
  commodity: string;
  from: string;
  to: string;
  days: number;
  series: DailyPoint[];
};

/**
 * A table, not prose.
 *
 * The series can run to a year of rows. Rendering each day as a sentence
 * spends the model's context on repeated words; a fixed-width table of the
 * same rows is roughly a third of the tokens and is what the model needs to
 * spot a turn in the trend.
 */
function renderSeries(series: DailyPoint[]): string[] {
  const lines = ["| date | score | momentum | articles | bull/bear/neutral |", "|---|---|---|---|---|"];
  for (const point of series) {
    const score = point.avg_score === null ? "—" : point.avg_score.toFixed(3);
    const momentum =
      point.momentum === null
        ? "—"
        : `${point.momentum > 0 ? "+" : ""}${point.momentum.toFixed(3)}`;
    lines.push(
      `| ${point.date} | ${score} | ${momentum} | ${point.article_count} | ` +
        `${point.bullish_count}/${point.bearish_count}/${point.neutral_count} |`
    );
  }
  return lines;
}

export async function getSentimentHistory(
  client: IntegraClient,
  args: { commodity: string; days: number }
) {
  const commodity = args.commodity.trim().toLowerCase();
  const data = await client.get<DailyResponse>(
    `/v1/sentiment/${encodeURIComponent(commodity)}/daily`,
    { days: args.days }
  );

  const series = data.series ?? [];
  if (series.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          // Said plainly so the model reports an empty range instead of
          // retrying the same call or inventing a trend to fill the gap.
          text:
            `No scored articles for ${commodity.toUpperCase()} between ${data.from} and ${data.to}. ` +
            `The range is empty, not unavailable — try a wider one or a different commodity.`,
        },
      ],
    };
  }

  const scored = series.filter((p) => p.avg_score !== null) as (DailyPoint & { avg_score: number })[];
  const first = scored[0];
  const last = scored[scored.length - 1];
  const change = first && last ? last.avg_score - first.avg_score : null;
  const articles = series.reduce((sum, p) => sum + p.article_count, 0);

  const header = [
    `**${commodity.toUpperCase()} daily sentiment — ${data.from} to ${data.to}** (${data.days}d)`,
    `${series.length} days with data, ${articles} articles scored.`,
  ];
  if (change !== null) {
    const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
    header.push(
      `Net change ${direction} ${Math.abs(change).toFixed(3)} ` +
        `(${first.avg_score.toFixed(3)} on ${first.date} → ${last.avg_score.toFixed(3)} on ${last.date}).`
    );
  }

  return {
    content: [
      {
        type: "text" as const,
        text: [...header, "", ...renderSeries(series)].join("\n"),
      },
    ],
  };
}
