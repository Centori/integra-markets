import { z } from "zod";
import type { IntegraClient } from "../client.js";

// WAF (West Africa) desk tools. Backed by /v1/waf/* in backend/api/waf.py.
// Every response the backend returns carries sources and data_gaps; these
// renderers print both so the model never states a number without its basis.

type Balance = {
  product: string;
  as_of: string;
  status: string;
  score: number | null;
  confidence: number;
  drivers: string[];
  congestion: { flag: boolean; waiting: number | null; trailing_avg: number | null };
  data_gaps: string[];
  sources: Array<{ title?: string; url?: string }>;
};

type SegmentBlock = { net: number | null; articles: number; change: number | null };

type Report = {
  report_id: string;
  window: { start: string; cutoff: string };
  published_at: string | null;
  executive_summary: Array<{ text: string; sources: string[] }>;
  sentiment: { overall: SegmentBlock; segments: Record<string, SegmentBlock> };
  supply_balance: { balances: Record<string, Balance> };
  key_events: Array<{ title: string; url?: string; source: string; syndicated_by?: string[]; sentiment?: string; restricted?: boolean }>;
  grade_watch: Array<{ grade: string; net: number | null; articles: number; change: number | null }>;
  regulatory: Array<{ title: string; url?: string; source: string }>;
  implications: Array<{ text: string }>;
  implications_label: string;
  data_gaps: string[];
};

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "n/a" : `${n > 0 ? "+" : ""}${n}`);

function balanceLines(b: Balance): string[] {
  const lines = [`- **${b.product}: ${b.status}** (score ${fmt(b.score)}, confidence ${b.confidence}) — as of ${b.as_of}`];
  for (const d of b.drivers) lines.push(`  - ${d}`);
  if (b.congestion?.flag) {
    lines.push(`  - ⚠ Congestion: ${b.congestion.waiting} ships waiting vs ${b.congestion.trailing_avg} 30-day avg`);
  }
  return lines;
}

function gapLines(gaps: string[]): string[] {
  return gaps.length ? ["", "**Data gaps**", ...gaps.map((g) => `- ${g}`)] : [];
}

export const wafReportSchema = {
  report_id: z
    .string()
    .optional()
    .describe("Report id like 'WAF-2026-W42' (ISO week of the Friday). Omit for the latest published report."),
};

export async function wafReport(client: IntegraClient, args: { report_id?: string }) {
  const r = await client.get<Report>(args.report_id ? `/v1/waf/report/${args.report_id}` : "/v1/waf/report");
  const o = r.sentiment.overall;
  const lines: string[] = [
    `# WAF Weekly Report — ${r.report_id}`,
    `_Window ${r.window.start} → ${r.window.cutoff} (WAT). Published ${r.published_at ?? "not yet"}._`,
    "",
    "## Executive summary",
    ...r.executive_summary.map((b) => `- ${b.text} [${b.sources.filter(Boolean).join(", ")}]`),
    "",
    "## Sentiment (net = bullish% − bearish%)",
    `- Overall: **${fmt(o.net)}** (${fmt(o.change)} w/w, ${o.articles} articles)`,
    ...Object.entries(r.sentiment.segments)
      .filter(([, s]) => s.articles > 0)
      .map(([name, s]) => `- ${name}: ${fmt(s.net)} (${fmt(s.change)} w/w, n=${s.articles})`),
    "",
    "## Supply balance",
    ...Object.values(r.supply_balance.balances).flatMap(balanceLines),
    "",
    "## Key events",
    ...r.key_events.map((e) =>
      `- ${e.title} — ${e.source}${e.syndicated_by && e.syndicated_by.length > 1 ? ` (+${e.syndicated_by.length - 1} outlets)` : ""}${e.sentiment ? ` · ${e.sentiment}` : ""}${e.url ? ` ${e.url}` : ""}`
    ),
  ];
  if (r.grade_watch.length) {
    lines.push("", "## Crude grade watch", ...r.grade_watch.map((g) => `- ${g.grade}: net ${fmt(g.net)} (${fmt(g.change)} w/w, n=${g.articles})`));
  }
  if (r.regulatory.length) {
    lines.push("", "## Regulatory & policy", ...r.regulatory.map((e) => `- ${e.title} — ${e.source}${e.url ? ` ${e.url}` : ""}`));
  }
  if (r.implications.length) {
    lines.push("", `## Implications (${r.implications_label})`, ...r.implications.map((i) => `- ${i.text}`));
  }
  lines.push(...gapLines(r.data_gaps));
  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

export const wafReportHistorySchema = {
  segment: z
    .string()
    .default("overall")
    .describe("'overall' or one of: crude, pms, ago, lpg, refining, fx_macro, mining."),
  weeks: z.number().int().min(1).max(104).default(12).describe("How many weekly reports back."),
};

export async function wafReportHistory(client: IntegraClient, args: { segment?: string; weeks?: number }) {
  const r = await client.get<{ segment: string; series: Array<{ report_id: string; net: number | null; articles: number }> }>(
    "/v1/waf/report/sentiment-series",
    { segment: args.segment ?? "overall", weeks: args.weeks ?? 12 }
  );
  const lines = [`# WAF weekly sentiment — ${r.segment}`, "", "| Week | Net | Articles |", "|---|---|---|"];
  for (const p of r.series) lines.push(`| ${p.report_id} | ${fmt(p.net)} | ${p.articles} |`);
  if (!r.series.length) lines.push("", "_No published weekly reports in this range._");
  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

export const wafHeadlinesSchema = {
  tag_type: z
    .enum(["country", "grade", "product", "entity", "segment", "topic"])
    .optional()
    .describe("Filter dimension. Omit for all WAF headlines."),
  tag: z
    .string()
    .optional()
    .describe("e.g. country NG/GH/AO; grade bonny_light/qua_iboe/forcados; product PMS/AGO/LPG/CRUDE; entity dangote_refinery/nnpc/nuprc/nmdpra; topic force_majeure/osp_change/port_position."),
  window: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  limit: z.number().int().min(1).max(200).default(30),
};

export async function wafHeadlines(
  client: IntegraClient,
  args: { tag_type?: string; tag?: string; window?: string; limit?: number }
) {
  const r = await client.get<{
    count: number;
    truncated: boolean;
    items: Array<{ title: string; source: string; url: string; published_at: string; sentiment?: { sentiment: string } | null; tags?: Record<string, string[]>; restricted?: boolean }>;
  }>("/v1/waf/headlines", { tag_type: args.tag_type, tag: args.tag, window: args.window ?? "7d", limit: args.limit ?? 30 });
  const lines = [`# WAF headlines${args.tag ? ` — ${args.tag_type}:${args.tag}` : ""} (${args.window ?? "7d"}, ${r.count}${r.truncated ? ", truncated" : ""})`, ""];
  for (const i of r.items) {
    const label = i.restricted ? "headline only (licensed source)" : i.sentiment?.sentiment ?? "unscored";
    lines.push(`- ${i.published_at?.slice(0, 10)} · **${i.title}** — ${i.source} · ${label} ${i.url}`);
  }
  if (!r.items.length) lines.push("_No matching WAF headlines in this window._");
  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

export const wafVesselBalanceSchema = {
  product: z.enum(["PMS", "AGO"]).default("PMS").describe("Nigerian product balance to compute."),
};

export async function wafVesselBalance(client: IntegraClient, args: { product?: string }) {
  const product = args.product ?? "PMS";
  const [b, v] = await Promise.all([
    client.get<Balance>("/v1/waf/balance", { product }),
    client.get<{ npa_port_positions: Array<{ report_date: string; expected: number; waiting: number; discharging: number; products: Record<string, string[]> }>; notes: string }>(
      "/v1/waf/vessels",
      { days: 7 }
    ),
  ]);
  const lines = [`# ${product} supply balance (Nigeria)`, "", ...balanceLines(b), "", "## NPA shipping position (Lagos ports, last 7 days)"];
  for (const p of v.npa_port_positions) {
    lines.push(`- ${p.report_date}: expected ${p.expected} · waiting ${p.waiting} · discharging ${p.discharging} · ${product} waiting: ${p.products.waiting?.includes(product) ? "yes" : "no"}`);
  }
  if (!v.npa_port_positions.length) lines.push("_No NPA reports parsed in the last 7 days._");
  lines.push("", `_${v.notes}_`, ...gapLines(b.data_gaps));
  if (b.sources.length) lines.push("", "**Sources**", ...b.sources.map((s) => `- ${s.title ?? ""} ${s.url ?? ""}`));
  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}
