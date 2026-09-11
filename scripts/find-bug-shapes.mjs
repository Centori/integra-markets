#!/usr/bin/env node
/**
 * Hunt for the failure shapes this codebase has produced more than once.
 *
 * Every entry below is a pattern that has shipped a real bug here, at least
 * twice. The point is to find the NEXT instance before a user does, because
 * each of these fails silently — the app keeps answering, just wrongly.
 *
 * These are HEURISTICS and will report things that are fine. A hit is a
 * question to answer, not a defect. It is still cheaper than the alternative,
 * which has been finding them one support message at a time.
 *
 *   node scripts/find-bug-shapes.mjs
 */

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

function tracked(globs) {
  try {
    const out = execSync(`git ls-files ${globs}`, { encoding: "utf8" });
    return out.split("\n").filter(Boolean).filter((f) => !f.includes("node_modules"));
  } catch {
    return [];
  }
}

const SHAPES = [
  {
    name: "PostgREST .single() where 'no row' is normal",
    why:
      "single() raises PGRST116 when nothing matches. The web alerts page used it " +
      "for a preferences row most users did not have; the error was swallowed and " +
      "the page rendered an empty feed. Use maybeSingle() unless absence is a bug.",
    files: ["'*.ts'", "'*.tsx'", "'*.js'"],
    test: (line) => /\.single\(\)/.test(line),
  },
  {
    name: "substring match on a market term",
    why:
      "Matching without word boundaries has produced four separate wrong readings: " +
      "'bullish' inside 'bullion', 'ai' inside 'Ag-ai-n', 'gold' inside 'Goldman', " +
      "'rally' inside 'generally'. Anchor with \\b and allow plurals.",
    files: ["'backend/**/*.py'"],
    test: (line) =>
      /\b(?:if|elif|return)\b.*\b["'](?:oil|gold|gas|ai|rally|bullish|bearish)["']\s+in\s+\w/.test(
        line
      ),
  },
  {
    name: "silent fallback to a permissive default",
    why:
      "fetchTier caught every failure and returned 'free_trial', so a 503 from the " +
      "backend rendered as a correctly locked account rather than an error. If a " +
      "catch picks a default, it must log why.",
    files: ["'dashboard/**/*.ts'", "'dashboard/**/*.tsx'", "'web/**/*.ts'", "'web/**/*.tsx'"],
    test: (line, prev) =>
      /^\s*}\s*catch\s*(\([^)]*\))?\s*{\s*$/.test(prev ?? "") &&
      /^\s*return\s+(?!.*(?:console|log|report|throw))/.test(line),
  },
  {
    name: "dict rebuilt field-by-field (drops anything unnamed)",
    why:
      "news_fetcher._score rebuilt each article dict from scratch and silently " +
      "dropped image_url, which the archive writer needed. Rebuilding loses every " +
      "key you forget; prefer {**row, ...changes}.",
    files: ["'backend/**/*.py'"],
    test: (line) => /^\s*(?:return|\w+\s*=)\s*\{\s*$/.test(line),
    contextual: true,
  },
];

let total = 0;

for (const shape of SHAPES) {
  const hits = [];
  for (const file of tracked(shape.files.join(" "))) {
    let lines;
    try {
      lines = readFileSync(file, "utf8").split("\n");
    } catch {
      continue;
    }
    lines.forEach((line, i) => {
      if (shape.test(line, lines[i - 1])) {
        hits.push(`${file}:${i + 1}  ${line.trim().slice(0, 96)}`);
      }
    });
  }
  if (!hits.length) continue;
  // The dict shape matches far too broadly to list; report only a count so it
  // stays a prompt to look rather than a wall of noise.
  console.log(`\n## ${shape.name}  (${hits.length})`);
  console.log(`   ${shape.why}\n`);
  const shown = shape.contextual ? [] : hits.slice(0, 15);
  shown.forEach((h) => console.log(`   ${h}`));
  if (shape.contextual) console.log(`   (too broad to list — review by hand when touching these files)`);
  else if (hits.length > shown.length) console.log(`   … ${hits.length - shown.length} more`);
  total += hits.length;
}

console.log(
  total
    ? `\n${total} candidate(s). Each is a question, not a verdict.`
    : "\nNo candidates for the known failure shapes."
);
