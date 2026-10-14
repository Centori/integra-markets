#!/usr/bin/env node
/**
 * Checks fastlane/metadata/<locale>/ before `fastlane deliver` uploads it.
 *
 * This repo has shipped unchecked text three times — a "Docs" link that 404'd
 * for weeks, a webhook advertised that did not exist, and a rate-limit page
 * describing behaviour the code never had. Store metadata is the same shape of
 * risk with a slower feedback loop: a keyword field that silently exceeds 100
 * characters is truncated by Apple mid-word, and nothing tells you.
 *
 * Counting is in Unicode code points via [...str], not str.length and not
 * bytes. `wc -m` on a shell with no LANG set counts BYTES, which reported the
 * es-MX subtitle as 31/30 and the ja subtitle as 48/30 — both actually fine.
 * String.length would be wrong the other way: it counts UTF-16 units, so an
 * emoji or a rare CJK ideograph outside the BMP would count twice.
 *
 * The keyword rules encode what Apple's indexer does, which is not documented
 * but is well established:
 *
 *   * name and subtitle are ALREADY indexed, so a word repeated from either
 *     into the keyword field buys nothing and spends characters;
 *   * the separator is a bare comma — a space after it is indexed as part of
 *     the next term;
 *   * terms are stemmed, so `future` already covers `futures`.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const META = join(ROOT, "fastlane", "metadata");

// Apple's per-localization limits.
const LIMITS = { name: 30, subtitle: 30, keywords: 100, description: 4000, promotional_text: 170 };

// Required for every localization in App Store Connect. A locale missing any of
// these cannot be created at all — `deliver` fails, or worse, creates a
// half-populated localization.
const REQUIRED = ["name", "subtitle", "keywords", "description"];

// Words that end in `s` while being singular, so the plural check does not cry
// wolf. `basis` and `gas` are the real ones; the tickers are acronyms.
const NOT_PLURAL = new Set([
  "gas", "basis", "ice", "lme", "asx", "cot", "opec", "opep", "lng", "jkm",
  "ttf", "wti", "news", "analysis",
  // singular in their own language, which the English -s rule does not know
  "erdgas", "mais", "preis", "cours", "minerio", "metais", "materias",
  "flussiggas", "devises", "us",
]);

const COVERAGE = JSON.parse(readFileSync(join(ROOT, "fastlane", "coverage.json"), "utf8"));
const WITH_DATA = new Set(COVERAGE.commodities);
const CLAIMS = new Map(Object.entries(COVERAGE.terms));
const GENERIC = new Set(COVERAGE.generic.map((t) => t.toLowerCase()));

const errors = [];
const warnings = [];
const rows = [];

/** Code points, which is what Apple counts. */
const len = (s) => [...s].length;

/** Lowercase, strip diacritics, so `Matières` and `matiere` compare equal. */
const fold = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Crude symmetric stem so `Rohstoffe`/`rohstoff` and `Materias`/`materia`
 *  collide. Applied to BOTH sides, so over-stemming is harmless here. */
const stem = (w) => fold(w).replace(/s$/, "").replace(/e$/, "");

const hasCJK = (s) => /[　-鿿豈-﫿]/u.test(s);

/** Words Apple indexes from a display field. */
function words(field) {
  return fold(field)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1);
}

const locales = readdirSync(META, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

if (locales.length === 0) errors.push("fastlane/metadata contains no locale directories");

for (const locale of locales) {
  const dir = join(META, locale);
  const read = (field) => {
    const path = join(dir, `${field}.txt`);
    if (!existsSync(path)) return null;
    // Trailing newline is conventional in these files and not part of the value.
    return readFileSync(path, "utf8").replace(/\n+$/, "");
  };

  for (const field of REQUIRED) {
    if (read(field) === null) {
      errors.push(`${locale}: ${field}.txt is missing — App Store Connect requires it for every localization`);
    }
  }

  for (const [field, limit] of Object.entries(LIMITS)) {
    const value = read(field);
    if (value === null) continue;

    const n = len(value);
    rows.push({ locale, field, n, limit, value });

    if (n > limit) {
      errors.push(`${locale}/${field}: ${n} characters, limit ${limit} — Apple truncates, mid-word`);
    }
    if (value.trim() !== value) {
      errors.push(`${locale}/${field}: leading or trailing whitespace is indexed as part of the value`);
    }
    if (value.length === 0) {
      errors.push(`${locale}/${field}: empty`);
    }
  }

  // --- the keyword field, where the rules actually bite -------------------
  const keywords = read("keywords");
  if (keywords === null) continue;

  if (/,\s/.test(keywords)) {
    errors.push(`${locale}/keywords: space after a comma — the space is indexed as part of the next term`);
  }
  if (/,,|^,|,$/.test(keywords)) {
    errors.push(`${locale}/keywords: empty term (doubled or edge comma)`);
  }

  const terms = keywords.split(",").map((t) => t.trim()).filter(Boolean);

  const seen = new Map();
  for (const term of terms) {
    const key = stem(term);
    if (seen.has(key)) {
      errors.push(`${locale}/keywords: "${term}" duplicates "${seen.get(key)}" after stemming`);
    } else {
      seen.set(key, term);
    }
  }

  for (const term of terms) {
    for (const w of term.split(/\s+/)) {
      if (!hasCJK(w) && /s$/.test(fold(w)) && !NOT_PLURAL.has(fold(w))) {
        warnings.push(`${locale}/keywords: "${term}" looks plural — Apple stems, so the singular covers it`);
      }
    }
  }

  // Every term must declare what it resolves to. The drafts advertised
  // soybean, iron ore, thermal coal, alumina, nickel, canola, rapeseed,
  // acucar, cafe and minerio — none of which the engine can match, so the
  // search traffic they bought would land on an empty result.
  for (const term of terms) {
    const key = CLAIMS.has(term) ? term : term.toLowerCase();
    if (CLAIMS.has(key)) {
      const canonical = CLAIMS.get(key);
      if (!WITH_DATA.has(canonical)) {
        errors.push(
          `${locale}/keywords: "${term}" claims ${canonical}, which has no data — ` +
          `a user who searches it and then types it gets nothing`,
        );
      }
    } else if (!GENERIC.has(term.toLowerCase())) {
      errors.push(
        `${locale}/keywords: "${term}" is undeclared — add it to fastlane/coverage.json ` +
        `under "terms" with the commodity it resolves to, or under "generic"`,
      );
    }
  }

  // Name and subtitle are already indexed. Anything repeated from them is a
  // wasted character, and the keyword field is the scarcest one you have.
  for (const source of ["name", "subtitle"]) {
    const value = read(source);
    if (!value) continue;

    if (hasCJK(value)) {
      // No word boundaries to tokenise on; check 2-grams and longer by
      // containment, which is how the overlap shows up in practice.
      for (const term of terms) {
        if (hasCJK(term) && len(term) >= 2 && value.includes(term)) {
          const level = source === "name" ? errors : warnings;
          level.push(`${locale}/keywords: "${term}" already appears in ${source} ("${value}") — already indexed`);
        }
      }
      continue;
    }

    const indexed = new Set(words(value).map(stem));
    for (const term of terms) {
      const repeated = term.split(/\s+/).filter((w) => w.length > 1 && indexed.has(stem(w)));
      if (repeated.length > 0) {
        const level = source === "name" ? errors : warnings;
        level.push(
          `${locale}/keywords: "${term}" repeats ${repeated.map((w) => `"${w}"`).join(", ")} from ${source} — already indexed`,
        );
      }
    }
  }
}

// --- report ---------------------------------------------------------------

const pad = (s, n) => String(s).padEnd(n);
console.log(`\nfastlane/metadata — ${locales.length} locale(s): ${locales.join(", ")}\n`);
console.log(`  ${pad("locale", 8)} ${pad("field", 17)} ${pad("used", 10)} value`);
console.log(`  ${"-".repeat(78)}`);
for (const r of rows) {
  const flag = r.n > r.limit ? "OVER" : "";
  const shown = r.field === "description" ? `${r.value.slice(0, 40)}…` : r.value;
  console.log(`  ${pad(r.locale, 8)} ${pad(r.field, 17)} ${pad(`${r.n}/${r.limit}`, 10)} ${shown} ${flag}`);
}

const headroom = rows.filter((r) => r.field === "keywords" && r.n < r.limit - 12);
if (headroom.length) {
  console.log(`\n  unused keyword capacity (the field is never shown, so there is no reason to leave it short):`);
  for (const r of headroom) console.log(`    ${pad(r.locale, 8)} ${r.limit - r.n} characters free`);
}

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ~ ${w}`);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log(`  x ${e}`);
  console.log("");
  process.exit(1);
}
console.log(`\nAll checks passed${warnings.length ? ` (${warnings.length} warning(s) above)` : ""}.\n`);
