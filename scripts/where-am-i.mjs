#!/usr/bin/env node
/**
 * Name the repo, branch and mobile lineage this checkout actually is.
 *
 * WHY: several checkouts of this project exist on one machine, and two are
 * traps:
 *
 *   ~/integra-markets              a FORK (jeremiahMshelia), frozen in June
 *   ~/Desktop/integra/…-markets-2  the shipped mobile lineage, not main
 *
 * Reading the wrong one does not error. It returns plausible source describing
 * a different program, which is how two confident and entirely wrong analyses
 * got written this week. Run this before analysing anything.
 *
 *   node scripts/where-am-i.mjs
 *
 * (Written in Node rather than shell because .gitignore excludes *.sh — a
 * shell version of this file could not be committed, so it would have been a
 * reference in CLAUDE.md pointing at nothing.)
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const CANONICAL_REMOTE = "Centori/integra-markets";

const sh = (cmd, fallback = "") => {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return fallback;
  }
};

const remote = sh("git remote get-url origin", "(no origin)");
const branch = sh("git rev-parse --abbrev-ref HEAD", "(not a git repo)");
const head = sh("git log -1 --format='%h %ci %s'", "-");

console.log(`remote : ${remote}`);
console.log(`branch : ${branch}`);
console.log(`HEAD   : ${head}`);

if (!remote.includes(CANONICAL_REMOTE)) {
  console.log(
    `\nWARNING: origin is not ${CANONICAL_REMOTE}.\n` +
      `         Anything read here may describe a different program.`
  );
}

sh("git fetch -q origin main");
if (sh("git rev-parse --verify -q origin/main")) {
  const behind = sh("git rev-list --count HEAD..origin/main", "?");
  const ahead = sh("git rev-list --count origin/main..HEAD", "?");
  console.log(`\nvs origin/main : ${behind} behind, ${ahead} ahead`);
  if (behind !== "0" && behind !== "?") {
    console.log("         -> this checkout does NOT contain the latest main.");
  }
}

/**
 * The lineage split, detected by absence.
 *
 * The App Store build has never been built from main, and main is MISSING
 * mobile work rather than ahead of it — these files are imported by the shipped
 * app and do not exist on main, so main's mobile bundle cannot even resolve.
 */
const MARKERS = [
  "app/config/default_sources.js",
  "app/services/alertMatcher.js",
  "app/paywall/packageMatch.ts",
  "app/services/trialReminders.ts",
];

console.log("\nmobile lineage markers (present in the SHIPPED app, absent on main):");
const present = MARKERS.filter((f) => existsSync(f));
for (const f of MARKERS) console.log(`  ${existsSync(f) ? "present " : "ABSENT  "} ${f}`);

console.log();
if (present.length === MARKERS.length) {
  console.log("  -> shipped mobile lineage (build64-exact / a release branch).");
  console.log("     Safe to build or OTA the app from here.");
} else if (present.length === 0) {
  console.log("  -> main. Do NOT build or OTA the mobile app from here:");
  console.log("     the bundle cannot resolve, and a forced OTA would strip the paywall.");
} else {
  console.log("  -> MIXED. Some markers present, some absent — this is a partial");
  console.log("     merge of the two lineages. Establish what this branch is before building.");
}
