#!/usr/bin/env node
/**
 * Release-config guard for the mobile app.
 *
 * Three separate incidents in one week, all with the same shape: a command
 * reported success while nothing reached production.
 *
 *   1. Build 89 was uploaded with CFBundleShortVersionString 1.0.1 after 1.0.1
 *      had already been approved. Apple closes a version train on approval, so
 *      it was rejected at ingestion (ITMS-90186) — after the build, after the
 *      upload, by email.
 *
 *   2. `origin/main` declares runtimeVersion 1.0.1 while every shipped build
 *      runs 1.0.4. `eas update` from main publishes for a runtime no device
 *      has. It exits 0. Zero devices receive it. There is no warning, and the
 *      channel looks freshly updated.
 *
 *   3. `origin/main` declares a different EAS projectId AND a different owner
 *      than the project that actually builds this app. An update from main
 *      lands in an unrelated project.
 *
 * None of these fail loudly on their own, and (2) is the dangerous one: it is
 * the mechanism used for emergency rollbacks. There is already one in the
 * history — "EMERGENCY ROLLBACK: OTA bundle crashing on device", 20 Jul. If
 * that had been published from main it would have silently done nothing while
 * the crash stayed live.
 *
 * Two tiers, because the useful checks must not depend on having a token:
 *
 *   Tier 1  no credentials. Internal consistency, plus the App Store version
 *           train read from the public iTunes lookup API. Catches (1).
 *   Tier 2  needs EXPO_TOKEN. Compares app.json against what EAS actually
 *           builds and serves. Catches (2) and (3).
 *
 * Tier 2 is SKIPPED, not failed, without a token — a guard that fails for a
 * missing secret trains people to ignore it. It says loudly that it skipped.
 *
 * Usage:
 *   node scripts/check-release-config.mjs            # check, exit 1 on failure
 *   node scripts/check-release-config.mjs --warn     # report, always exit 0
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WARN_ONLY = process.argv.includes("--warn");
const EXPO_API = "https://api.expo.dev/graphql";

const problems = [];
const notes = [];

const fail = (title, detail) => problems.push({ title, detail });
const note = (msg) => notes.push(msg);

function readAppJson() {
  const raw = JSON.parse(readFileSync(join(ROOT, "app.json"), "utf8"));
  return raw.expo ?? raw;
}

/** Compare dotted version strings. Returns -1, 0, or 1. */
function cmpVersion(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * Credentials, in the order that keeps this runnable in both places it matters.
 *
 * CI has EXPO_TOKEN (an access token, sent as a bearer). A developer about to
 * publish an OTA from their laptop has none — but they are already logged in,
 * and `eas login` leaves a session secret in ~/.expo/state.json. Falling back
 * to it means the check runs by default at exactly the moment it is most
 * needed, instead of skipping tier 2 and reporting a cheerful pass.
 */
function credentials() {
  if (process.env.EXPO_TOKEN) {
    return { Authorization: `Bearer ${process.env.EXPO_TOKEN}`, _source: "EXPO_TOKEN" };
  }
  try {
    const statePath = join(
      process.env.HOME ?? "",
      ".expo",
      "state.json"
    );
    const secret = JSON.parse(readFileSync(statePath, "utf8"))?.auth?.sessionSecret;
    if (secret) return { "expo-session": secret, _source: "~/.expo/state.json" };
  } catch {
    // Not logged in locally — tier 2 is skipped, which the caller reports.
  }
  return null;
}

/**
 * Could not reach the API at all. Distinct from an answer we did not like:
 * a DNS hiccup or an offline laptop must never be reported as "your projectId
 * is wrong". A guard that cries wolf gets ignored, which is how the `|| echo`
 * fallbacks in ci.yml stopped meaning anything.
 */
class TransportError extends Error {}

async function graphql(query, auth) {
  const { _source, ...authHeaders } = auth;
  let res;
  try {
    res = await fetch(EXPO_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new TransportError(err.message);
  }
  if (!res.ok && res.status >= 500) {
    throw new TransportError(`Expo API returned ${res.status}`);
  }
  let body;
  try {
    body = await res.json();
  } catch (err) {
    throw new TransportError(`Expo API returned unparseable body: ${err.message}`);
  }
  if (body.errors) {
    throw new Error(body.errors.map((e) => e.message).join("; "));
  }
  return body.data;
}

// ---------------------------------------------------------------- tier 1

function tier1(expo) {
  const iosRt = expo.ios?.runtimeVersion;
  const androidRt = expo.android?.runtimeVersion;
  const topRt = expo.runtimeVersion;

  // A single runtimeVersion may be declared at the top level instead of per
  // platform; either is valid, but a per-platform mismatch means an update
  // silently reaches one platform and not the other.
  if (iosRt && androidRt && iosRt !== androidRt) {
    fail(
      "iOS and Android runtimeVersion disagree",
      `ios=${iosRt} android=${androidRt}\n` +
        `An OTA update matches on runtimeVersion, so it would reach one platform only.`
    );
  }
  const runtime = topRt ?? iosRt ?? androidRt;
  if (!runtime) {
    fail(
      "No runtimeVersion declared",
      "Without it, `eas update` cannot target installed builds."
    );
  }

  // The updates URL embeds the project id. If they disagree, updates are
  // published to one project and fetched from another.
  const projectId = expo.extra?.eas?.projectId;
  const updatesUrl = expo.updates?.url;
  if (projectId && updatesUrl && !updatesUrl.includes(projectId)) {
    fail(
      "updates.url does not match extra.eas.projectId",
      `projectId   ${projectId}\nupdates.url ${updatesUrl}`
    );
  }

  // A placeholder store URL ships a dead link inside the app — every in-app
  // "rate us" and "share the app" lands on a 404.
  const storeUrl = JSON.stringify(expo).match(
    /https:\/\/apps\.apple\.com[^"]*/
  )?.[0];
  if (storeUrl && /id123456789|YOUR_APP_ID|APP_ID_HERE/.test(storeUrl)) {
    fail(
      "appStoreUrl is still a placeholder",
      `${storeUrl}\nIn-app store links resolve to a 404.`
    );
  }

  return { runtime, projectId, version: expo.version };
}

/**
 * The App Store version train. Apple closes a train permanently on approval,
 * so the next submission must carry a HIGHER CFBundleShortVersionString —
 * bumping only the build number is rejected at ingestion. This is exactly what
 * build 89 tried.
 *
 * Uses the public iTunes lookup API: no credentials, works in any CI.
 */
async function checkStoreTrain(expo) {
  const bundleId = expo.ios?.bundleIdentifier;
  if (!bundleId) {
    note("No ios.bundleIdentifier — skipped the App Store train check.");
    return;
  }
  let live;
  try {
    const res = await fetch(
      `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}`,
      { signal: AbortSignal.timeout(20_000) }
    );
    const body = await res.json();
    live = body.results?.[0];
  } catch (err) {
    note(`Could not reach the iTunes lookup API (${err.message}) — train check skipped.`);
    return;
  }
  if (!live) {
    note(`${bundleId} is not on the App Store yet — train check not applicable.`);
    return;
  }

  const declared = expo.version;
  const cmp = cmpVersion(declared, live.version);
  if (cmp > 0) {
    note(`App Store has ${live.version}; this branch declares ${declared}. Train is open.`);
  } else {
    fail(
      `Version ${declared} cannot be submitted — App Store already has ${live.version}`,
      `Apple closes a version train when it is approved. A build carrying\n` +
        `CFBundleShortVersionString ${declared} is rejected at ingestion with\n` +
        `ITMS-90186 / ITMS-90062, after the build and upload have already run.\n` +
        `CFBundleShortVersionString is compiled in, so this needs a version bump\n` +
        `and a NEW build — a resubmit of the same artifact cannot work.`
    );
  }
}

// ---------------------------------------------------------------- tier 2

async function tier2(expo, auth) {
  const projectId = expo.extra?.eas?.projectId;
  if (!projectId) {
    fail("No extra.eas.projectId", "Cannot verify against EAS.");
    return;
  }

  let data;
  try {
    data = await graphql(
      `query {
         app { byId(appId: "${projectId}") {
           fullName
           builds(limit: 1, offset: 0, filter: { status: FINISHED }) {
             appVersion appBuildVersion runtimeVersion channel platform
           }
         } }
       }`,
      auth
    );
  } catch (err) {
    if (err instanceof TransportError) {
      // Could not ask. Says nothing about the config, so it must not read as a
      // config failure.
      note(`Could not reach the Expo API (${err.message}) — live EAS checks skipped.`);
      return;
    }
    // The API answered and refused. THAT is a finding: app.json names a project
    // this account cannot see, which is how an update ends up published
    // somewhere nobody is looking.
    fail(
      `EAS rejected projectId ${projectId}`,
      `${err.message}\n` +
        `app.json names a project this account cannot reach. Builds and updates\n` +
        `from this branch would not go where you expect.`
    );
    return;
  }

  const app = data.app?.byId;
  const build = app?.builds?.[0];
  if (!build) {
    note(`EAS project ${app?.fullName ?? projectId} has no finished builds yet.`);
    return;
  }

  note(
    `EAS project ${app.fullName}: latest build ${build.appVersion}(${build.appBuildVersion}) ` +
      `runtime ${build.runtimeVersion} channel ${build.channel}`
  );

  const declared = expo.runtimeVersion ?? expo.ios?.runtimeVersion;
  if (declared && build.runtimeVersion && declared !== build.runtimeVersion) {
    fail(
      `runtimeVersion ${declared} does not match shipped builds (${build.runtimeVersion})`,
      `Installed apps run runtime ${build.runtimeVersion}. An update published\n` +
        `from this branch targets ${declared} and reaches NO devices — while\n` +
        `exiting 0 and showing as published. This is the failure mode that makes\n` +
        `an emergency OTA rollback silently do nothing.`
    );
  }
}

// ---------------------------------------------------------------- main

const expo = readAppJson();
console.log(`Checking release config for ${expo.name ?? expo.slug} (${expo.version})\n`);

tier1(expo);
await checkStoreTrain(expo);

const auth = credentials();
if (auth) {
  note(`Authenticated to EAS via ${auth._source}.`);
  await tier2(expo, auth);
} else {
  note(
    "No EAS credentials — skipped the live comparison (runtimeVersion and\n" +
      "  projectId against shipped builds), which is what catches a silent no-op\n" +
      "  OTA. Run `eas login`, or set EXPO_TOKEN from\n" +
      "  https://expo.dev/settings/access-tokens"
  );
}

for (const n of notes) console.log(`  note: ${n}`);
if (notes.length) console.log("");

if (problems.length === 0) {
  console.log("Release config OK.");
  process.exit(0);
}

console.log(`${problems.length} problem${problems.length > 1 ? "s" : ""} found:\n`);
for (const p of problems) {
  console.log(`  ✖ ${p.title}`);
  for (const line of p.detail.split("\n")) console.log(`      ${line}`);
  console.log("");
}

if (WARN_ONLY) {
  console.log("(--warn: reporting only)");
  process.exit(0);
}
process.exit(1);
