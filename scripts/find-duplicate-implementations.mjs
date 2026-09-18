#!/usr/bin/env node
/**
 * Find features implemented more than once.
 *
 * Enforces the code repair rule in CLAUDE.md: a fix replaces the existing
 * implementation, it does not sit beside it. Every duplicate below is a place
 * where two things can drift, and drift here has been expensive:
 *
 *   - `stripe` was declared in requirements-light.txt, which nothing installs,
 *     so it looked present and was absent. Checkout answered 503 for weeks.
 *   - services/entitlement.py says it "replaces two separate, drifting notions
 *     of entitlement" — and tier_enforcement.get_effective_tier is still there,
 *     still consulted by a different set of endpoints.
 *   - The dashboard and web apps each implement Google sign-in separately, so
 *     #80 fixed one of them and the other was never touched.
 *
 * Candidates, not verdicts. Some duplication is deliberate and checked (the MCP
 * tool list is duplicated across a package boundary on purpose, and a parity
 * script enforces it). The point is that each one should be a decision someone
 * made, not something nobody noticed.
 *
 *   node scripts/find-duplicate-implementations.mjs
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, dirname, extname } from "node:path";

// maxBuffer raised: this repo tracks tens of thousands of files (a committed
// app/node_modules among them), and the default 1 MB overflows with ENOBUFS.
const files = execSync("git ls-files", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\n")
  .filter(Boolean)
  .filter(
    (f) =>
      !f.includes("node_modules") &&
      !f.startsWith("dist/") &&
      !f.startsWith("snack-export/") &&
      !f.startsWith("coverage/") &&
      !f.includes("/__pycache__/")
  );

const findings = [];
const report = (title, why, items) => {
  if (items.length) findings.push({ title, why, items });
};

// --- 1. Variant filenames: the classic "add another version" tell ----------
// App.web.js beside App.js, x.new.tsx beside x.tsx, supabaseService.js beside
// supabaseService.ts. Each pair is two files claiming the same role.
const VARIANT = /\.(web|native|new|old|copy|v2|backup|simple|production|test)\./i;
const byStem = new Map();
for (const f of files) {
  const ext = extname(f);
  if (![".js", ".jsx", ".ts", ".tsx", ".py"].includes(ext)) continue;
  // Strip every variant marker and the extension to get the feature's "stem".
  const stem = dirname(f) + "/" + basename(f, ext).replace(VARIANT, ".").replace(/\.(web|native|new|old|copy|v2|backup|simple|production|test)$/i, "");
  if (!byStem.has(stem)) byStem.set(stem, []);
  byStem.get(stem).push(f);
}
report(
  "Same file, multiple variants",
  "Two files claiming one role. Which one is live is decided by a bundler config or an import somewhere, not by reading the directory.",
  [...byStem.entries()].filter(([, v]) => v.length > 1).map(([, v]) => v.join("  |  "))
);

// --- 2. Same basename in different directories ----------------------------
// Three files called supabase.ts is three Supabase clients until proven
// otherwise. Scoped to the source trees that ship.
const SRC = ["app/", "backend/", "dashboard/", "web/src/", "lib/", "components/", "mcp/"];
const byBase = new Map();
for (const f of files) {
  if (!SRC.some((p) => f.startsWith(p))) continue;
  const ext = extname(f);
  if (![".js", ".jsx", ".ts", ".tsx", ".py"].includes(ext)) continue;
  const b = basename(f, ext);
  if (b === "index" || b === "__init__" || b === "page" || b === "route" || b === "layout") continue;
  if (!byBase.has(b)) byBase.set(b, []);
  byBase.get(b).push(f);
}
report(
  "Same basename in different trees",
  "Often legitimate across app boundaries — but each pair should be a decision. A shared concern implemented twice drifts.",
  [...byBase.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([b, v]) => `${b}:  ${v.join("  |  ")}`)
);

// --- 3. Dependency manifests --------------------------------------------
// Two requirements files, one installed, is how `stripe` and `PyJWT` hid.
report(
  "Multiple dependency manifests",
  "Only one is installed by the deployed image. A package in the other looks declared and is absent — this exact bug shipped twice.",
  [files.filter((f) => /requirements.*\.txt$/.test(f)).join("  |  ")].filter((x) => x.includes("|"))
);

// --- 4. Dockerfiles -------------------------------------------------------
report(
  "Multiple Dockerfiles",
  "Railway picks one by service root directory. The others are unbuilt and unmaintained, and reading the wrong one misleads about what is deployed.",
  [files.filter((f) => /(^|\/)Dockerfile/.test(f)).join("  |  ")].filter((x) => x.includes("|"))
);

// --- 5. Python functions defined in more than one module ------------------
// Names only; a shared helper re-exported is fine, two bodies are not.
const pyDefs = new Map();
for (const f of files.filter((f) => f.startsWith("backend/") && f.endsWith(".py") && !f.includes("/tests/"))) {
  let src;
  try { src = readFileSync(f, "utf8"); } catch { continue; }
  for (const m of src.matchAll(/^def ([a-z_][a-z0-9_]{4,})\(/gm)) {
    const n = m[1];
    if (n.startsWith("_") || n.startsWith("test_")) continue;
    if (!pyDefs.has(n)) pyDefs.set(n, new Set());
    pyDefs.get(n).add(f);
  }
}
report(
  "Python function defined in multiple modules",
  "Two bodies under one name. Which runs depends on the import, and the two stop agreeing quietly.",
  [...pyDefs.entries()]
    .filter(([, v]) => v.size > 1)
    .map(([n, v]) => `${n}()  ->  ${[...v].join("  |  ")}`)
);

// --- output ---------------------------------------------------------------
if (!findings.length) {
  console.log("No duplicate-implementation candidates found.");
  process.exit(0);
}

let total = 0;
for (const { title, why, items } of findings) {
  console.log(`\n## ${title}  (${items.length})`);
  console.log(`   ${why}\n`);
  for (const i of items.slice(0, 20)) console.log(`   ${i}`);
  if (items.length > 20) console.log(`   … ${items.length - 20} more`);
  total += items.length;
}
console.log(
  `\n${total} candidate(s). Each should be a decision someone made, not something nobody noticed.`
);
