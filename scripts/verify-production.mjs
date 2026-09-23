#!/usr/bin/env node
/**
 * Probe every deployed surface and report what is ACTUALLY serving.
 *
 * WHY THIS EXISTS. Between an edit and a user seeing it there are seven hops:
 *
 *     written -> committed -> merged -> CI -> deployed -> cached -> their data
 *
 * Local checks (tsc, pytest, "PR merged") cover the first three. Every
 * "you said it was fixed and it isn't" in this project's history has lived in
 * the last four. Concretely, in one week:
 *
 *   - PRs #62/#64 were reported as fixes while still open.
 *   - #83 merged cleanly and never deployed: the Railway build had been
 *     failing for three days, so the server kept running the old image.
 *   - `stripe` and `PyJWT` were absent from the installed requirements file.
 *     /health returned 200 throughout while every authenticated request
 *     answered 503.
 *
 * None of those are visible from a passing test suite. All of them are visible
 * from one HTTP request. So: run this before saying anything is live.
 *
 *   node scripts/verify-production.mjs          # all surfaces
 *   node scripts/verify-production.mjs backend  # one surface
 *
 * Exits non-zero if any check fails, so CI or a pre-report hook can gate on it.
 */

const TIMEOUT_MS = 20_000;

const BACKEND = "https://api.integramarkets.app";
const MCP = "https://integra-mcp-production.up.railway.app";
const MCP_CUSTOM = "https://mcp.integramarkets.app";
const DASHBOARD = "https://dashboard.integramarkets.app";
const WWW = "https://www.integramarkets.app";
const ASC_APP_ID = "6749469306";

/** A bad token on purpose. 401 proves auth ran; 503 proves it could not. */
const BAD_TOKEN = "Bearer not-a-real-token";

async function req(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "User-Agent": "integra-verify/1", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text };
}

const checks = [];
const check = (surface, name, fn) => checks.push({ surface, name, fn });

// --- backend -------------------------------------------------------------
// The dependency fields come from /health and exist because a missing lazy
// import is otherwise indistinguishable from a healthy service.
check("backend", "health reports all dependencies present", async () => {
  const { status, text } = await req(`${BACKEND}/health`);
  if (status !== 200) return `HTTP ${status}`;
  const body = JSON.parse(text);
  const deps = body.dependencies;
  if (!deps) {
    return "no `dependencies` field — the running image predates the dependency health check";
  }
  const missing = Object.entries(deps).filter(([, ok]) => !ok).map(([k]) => k);
  return missing.length ? `missing: ${missing.join(", ")}` : true;
});

// 401 and 503 both mean "you did not get in", which is why this was invisible.
// Only 401 means the auth code ran.
check("backend", "authenticated routes reject, not error", async () => {
  const failures = [];
  for (const path of ["/api/subscriptions/entitlement", "/api/keys"]) {
    const { status, text } = await req(`${BACKEND}${path}`, {
      headers: { Authorization: BAD_TOKEN },
    });
    if (status === 503) failures.push(`${path} -> 503 ${text.slice(0, 80)}`);
    else if (status !== 401) failures.push(`${path} -> ${status} (expected 401)`);
  }
  return failures.length ? failures.join("; ") : true;
});

check("backend", "v1 requires a key", async () => {
  const { status } = await req(`${BACKEND}/v1/sentiment?commodity=oil&window=24h`);
  return status === 401 ? true : `expected 401, got ${status}`;
});

// Everything above proves the door is locked. Nothing proves a real key opens
// it, and those are different failures: a key that mints cleanly and then 403s
// on every call looked exactly like a working API for two weeks. Opt-in,
// because the checks must stay runnable by anyone without a key.
if (process.env.INTEGRA_API_KEY) {
  check("backend", "a real key has live scopes", async () => {
    const key = { Authorization: `Bearer ${process.env.INTEGRA_API_KEY}` };

    const list = await req(`${BACKEND}/v1/commodities`, { headers: key });
    if (list.status === 403) {
      return (
        `403 on /v1/commodities — the key is valid but carries no entitlement. ` +
        `If this is a comped account, check INTEGRA_COMP_EMAILS resolves: ${list.text.slice(0, 120)}`
      );
    }
    if (list.status !== 200) return `/v1/commodities -> ${list.status} ${list.text.slice(0, 100)}`;

    const names = JSON.parse(list.text).commodities ?? [];
    if (names.length === 0) return "/v1/commodities returned an empty list — nothing is indexed";

    // The history scope is separately gated, and it is what the MCP's
    // get_sentiment_history needs. A key can pass the line above and fail here.
    const daily = await req(
      `${BACKEND}/v1/sentiment/${encodeURIComponent(names[0])}/daily?days=7`,
      { headers: key }
    );
    if (daily.status !== 200) {
      return `history scope: /v1/sentiment/${names[0]}/daily -> ${daily.status} ${daily.text.slice(0, 100)}`;
    }
    return true;
  });
}

// --- mcp -----------------------------------------------------------------
check("mcp", "health", async () => {
  const { status, text } = await req(`${MCP}/health`);
  return status === 200 && JSON.parse(text).ok ? true : `HTTP ${status} ${text.slice(0, 80)}`;
});

// WWW-Authenticate: Bearer is the MCP spec's OAuth signal, and it used to be
// sent by a server that served no OAuth endpoints — Claude went hunting for a
// sign-in service that did not exist and reported "No approval received".
//
// The inverse is now the failure to catch. Claude.ai's connector dialog has no
// field for a static header, so OAuth is the only way anyone configures this;
// if the header is missing, or the discovery documents behind it are not
// served, nobody can connect at all. The header and the endpoints it promises
// are checked together, because either alone is the broken state.
check("mcp", "OAuth discovery is advertised and answered", async () => {
  const { status, headers } = await req(`${MCP}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  });
  if (status !== 401) return `expected 401 on an unauthenticated call, got ${status}`;

  const wa = headers.get("www-authenticate") ?? "";
  if (!wa.includes("resource_metadata=")) {
    return `401 does not point at resource metadata (WWW-Authenticate: ${wa || "absent"}) — ` +
      "MCP_OAUTH_SECRET is probably unset on the service, so no connector can be configured";
  }

  for (const path of [
    "/.well-known/oauth-protected-resource",
    "/.well-known/oauth-authorization-server",
  ]) {
    const doc = await req(`${MCP}${path}`);
    if (doc.status !== 200) return `${path} -> ${doc.status}`;
  }

  const meta = JSON.parse((await req(`${MCP}/.well-known/oauth-authorization-server`)).text);
  for (const field of ["authorization_endpoint", "token_endpoint", "registration_endpoint"]) {
    if (!meta[field]) return `authorization server metadata has no ${field}`;
  }
  // A sign-in page that does not render is a flow that dead-ends in a browser
  // tab, which no amount of correct metadata makes up for.
  const page = await req(meta.authorization_endpoint);
  if (page.status !== 400 && page.status !== 200) {
    return `authorize endpoint -> ${page.status} (expected a rendered page or a 400 for missing params)`;
  }
  return true;
});

// Was a tracked known-issue for fifteen days: Railway never issued a
// certificate, so this threw on the TLS handshake and the connector URL had to
// be the Railway hostname. TLS is now terminated by Vercel in front of the same
// Railway service (mcp-proxy/), and this is a hard check again — the branded
// address is what customers are given, so it failing is an outage, not a wart.
check("mcp", "custom domain serves MCP", async () => {
  const { status, text } = await req(`${MCP_CUSTOM}/health`);
  if (status !== 200) return `HTTP ${status}`;
  // Proving TLS terminates is not enough: a proxy that answers /health from
  // its own edge while dropping the POST body would pass that and serve
  // nothing. Exchange real MCP over it.
  const rpc = await req(`${MCP_CUSTOM}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: "Bearer verify-production-probe",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  if (rpc.status !== 200) return `tools/list over the custom domain -> ${rpc.status}`;
  if (!rpc.text.includes("get_sentiment")) {
    return "tools/list answered over the custom domain but advertised no tools";
  }
  return JSON.parse(text).ok ? true : `health said ${text.slice(0, 80)}`;
});

// --- dashboard -----------------------------------------------------------
check("dashboard", "login renders", async () => {
  const { status } = await req(`${DASHBOARD}/login`);
  return status === 200 ? true : `HTTP ${status}`;
});

// Greps the DEPLOYED bundle, not the source. A merge is not a deploy.
//
// What this proves and what it does not: the page ships BOTH the advertised URL
// and a documented fallback, and they are plain string constants in the same
// chunk, so a grep cannot tell which one the copy button hands out. It catches
// a stale deploy — a bundle that predates the branded address entirely — and
// nothing finer. Swapping the two constants would keep this green, so read the
// diff on ConnectClaude.tsx rather than trusting this line alone.
check("dashboard", "connector bundle carries the branded MCP URL", async () => {
  const { text: html } = await req(`${DASHBOARD}/mcp`);
  const chunks = [...html.matchAll(/\/_next\/static\/chunks\/[\w./-]+\.js/g)].map((m) => m[0]);
  if (!chunks.length) return "no JS chunks found on /mcp";
  for (const c of [...new Set(chunks)]) {
    const { text } = await req(`${DASHBOARD}${c}`);
    if (text.includes("mcp.integramarkets.app/mcp")) return true;
  }
  return "advertised MCP URL not found in any deployed chunk — dashboard is stale";
});

// NEXT_PUBLIC_* values are compiled into the client bundle at build time, so
// their absence is observable from outside. This check exists because the
// in-page Google flow shipped and then sat switched off — the redirect
// fallback works, so the only visible symptom was a consent screen reading
// "to continue to <project>.supabase.co", which looks like a design choice
// rather than an unset variable.
check("dashboard", "Google in-page sign-in is switched on", async () => {
  const { text: html } = await req(`${DASHBOARD}/login`);
  const chunks = [...new Set(
    [...html.matchAll(/\/_next\/static\/chunks\/[\w./-]+\.js/g)].map((m) => m[0])
  )];
  for (const c of chunks) {
    const { text } = await req(`${DASHBOARD}${c}`);
    if (/\d{10,}-[a-z0-9]{20,}\.apps\.googleusercontent\.com/.test(text)) return true;
  }
  return (
    "no Google client id in the login bundle — NEXT_PUBLIC_GOOGLE_CLIENT_ID is " +
    "unset on Vercel, so sign-in falls back to the Supabase redirect and the " +
    "consent screen shows the project host"
  );
});

// --- www -----------------------------------------------------------------
check("www", "app routes render", async () => {
  const failures = [];
  for (const path of ["/", "/dashboard", "/alerts", "/login"]) {
    const { status } = await req(`${WWW}${path}`);
    if (status !== 200) failures.push(`${path} -> ${status}`);
  }
  return failures.length ? failures.join("; ") : true;
});

// --- ios -----------------------------------------------------------------
// The storefront is the only authority on what shipped. Reasoning from EAS
// build history produced a confident, wrong answer about the live version.
check("ios", "App Store version", async () => {
  const { text } = await req(
    `https://itunes.apple.com/lookup?id=${ASC_APP_ID}&t=${Date.now()}`
  );
  const data = JSON.parse(text);
  const app = data.results?.[0];
  if (!app) return "app not found on the storefront";
  return { info: `live version ${app.version} (updated ${app.currentVersionReleaseDate?.slice(0, 10)})` };
});

// --- run -----------------------------------------------------------------
const only = process.argv[2];
const selected = only ? checks.filter((c) => c.surface === only) : checks;

if (!selected.length) {
  console.error(`No checks for surface "${only}". Known: ${[...new Set(checks.map((c) => c.surface))].join(", ")}`);
  process.exit(2);
}

let failed = 0;
let surface = "";
for (const c of selected) {
  if (c.surface !== surface) {
    surface = c.surface;
    console.log(`\n${surface}`);
  }
  let result;
  try {
    result = await c.fn();
  } catch (err) {
    result = err?.name === "TimeoutError" ? `timed out after ${TIMEOUT_MS}ms` : String(err?.message ?? err);
  }
  if (result === true) console.log(`  PASS  ${c.name}`);
  else if (result?.info) console.log(`  ----  ${c.name}: ${result.info}`);
  else if (result?.warn) console.log(`  WARN  ${c.name}: ${result.warn}`);
  else {
    failed++;
    console.log(`  FAIL  ${c.name}\n        ${result}`);
  }
}

// --- known issues: things that are broken on purpose, and must age ---------
//
// A warning that repeats forever stops being read. The MCP certificate was
// reported on every check for three days and nothing was decided, because
// "known issue" is indistinguishable from "no check" once it has scrolled past
// a few times. So each entry carries a deadline: past it, this run FAILS and
// prints the next action. Nothing new has broken — a decision is overdue.
if (!only) {
  const { readFileSync } = await import("node:fs");
  let registry;
  try {
    registry = JSON.parse(readFileSync(new URL("../known-issues.json", import.meta.url), "utf8"));
  } catch (err) {
    console.log(`\nknown issues\n  FAIL  cannot read known-issues.json: ${err.message}`);
    failed++;
    registry = { issues: [] };
  }

  if (registry.issues?.length) console.log("\nknown issues");
  const today = new Date();
  for (const issue of registry.issues ?? []) {
    const ageDays = Math.floor((today - new Date(issue.firstSeen)) / 86_400_000);
    const overdue = ageDays >= issue.escalateAfterDays;
    const line = `${issue.id} — ${issue.summary} (${ageDays}d old, owner: ${issue.owner})`;
    if (!overdue) {
      console.log(`  WARN  ${line}`);
      continue;
    }
    failed++;
    console.log(
      `  FAIL  ${line}\n` +
        `        overdue by ${ageDays - issue.escalateAfterDays}d.\n` +
        `        NEXT: ${issue.nextAction}\n` +
        `        Fix it, or change escalateAfterDays on purpose — in a diff, not by drifting.`
    );
  }
}

console.log(
  failed
    ? `\n${failed} check(s) failed. Do not report these surfaces as working.`
    : "\nAll checks passed against the live deployments."
);
process.exit(failed ? 1 : 0);
