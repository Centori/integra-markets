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

// --- mcp -----------------------------------------------------------------
check("mcp", "health", async () => {
  const { status, text } = await req(`${MCP}/health`);
  return status === 200 && JSON.parse(text).ok ? true : `HTTP ${status} ${text.slice(0, 80)}`;
});

// WWW-Authenticate: Bearer is the MCP spec's OAuth signal. Sending it made
// Claude hunt for a sign-in service that does not exist, and every tool call
// failed with "No approval received".
check("mcp", "does not advertise OAuth on 401", async () => {
  const { status, headers } = await req(`${MCP}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  });
  if (status !== 401) return `expected 401, got ${status}`;
  const wa = headers.get("www-authenticate");
  return wa ? `still sends WWW-Authenticate: ${wa}` : true;
});

// Informational: the custom domain's certificate has never issued. Not a
// failure, because nothing depends on it — but silence here would let it stay
// broken indefinitely.
check("mcp", "custom domain certificate (informational)", async () => {
  try {
    await req(`${MCP_CUSTOM}/health`);
    return true;
  } catch (err) {
    return { warn: `${MCP_CUSTOM} not serving TLS — Railway cert still not issued` };
  }
});

// --- dashboard -----------------------------------------------------------
check("dashboard", "login renders", async () => {
  const { status } = await req(`${DASHBOARD}/login`);
  return status === 200 ? true : `HTTP ${status}`;
});

// Greps the DEPLOYED bundle, not the source. A merge is not a deploy.
check("dashboard", "connector page ships the working MCP URL", async () => {
  const { text: html } = await req(`${DASHBOARD}/mcp`);
  const chunks = [...html.matchAll(/\/_next\/static\/chunks\/[\w./-]+\.js/g)].map((m) => m[0]);
  if (!chunks.length) return "no JS chunks found on /mcp";
  for (const c of [...new Set(chunks)]) {
    const { text } = await req(`${DASHBOARD}${c}`);
    if (text.includes("integra-mcp-production.up.railway.app/mcp")) return true;
  }
  return "advertised MCP URL not found in any deployed chunk — dashboard is stale";
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

console.log(
  failed
    ? `\n${failed} check(s) failed. Do not report these surfaces as working.`
    : "\nAll checks passed against the live deployments."
);
process.exit(failed ? 1 : 0);
