#!/usr/bin/env node
/**
 * The OAuth flow, exercised against a real server on a real port.
 *
 * This is an authentication surface on a production host, and the failure that
 * matters is not "does the happy path work" — it is whether any of the refusals
 * can be talked out of refusing. So the negative cases are the point here: a
 * redirect address the client never registered, a PKCE verifier that does not
 * match, an expired-kind blob replayed as a different kind, a code redeemed
 * against a different redirect URI.
 *
 * Run:  node scripts/test-oauth.mjs     (after npm run build)
 */
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const REDIRECT = "https://claude.ai/api/mcp/auth_callback";
const API_KEY = "ik_live_testkeytestkeytestkey";

let failures = 0;
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failures++;
}

async function main() {
  const server = spawn(process.execPath, [join(ROOT, "dist", "http.js")], {
    env: {
      ...process.env,
      PORT: String(PORT),
      MCP_OAUTH_SECRET: "test-secret-at-least-sixteen-chars",
      // Points key validation at a host that refuses connections, which
      // exercises the "API unreachable is not evidence the key is bad" path
      // without needing the real API in a unit test.
      INTEGRA_API_URL: "http://127.0.0.1:9",
      MCP_PUBLIC_ORIGIN: BASE,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", () => {});
  server.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));

  try {
    await waitForHealth();

    // --- discovery --------------------------------------------------------
    const prm = await (await fetch(`${BASE}/.well-known/oauth-protected-resource`)).json();
    check(
      "protected-resource metadata names this server",
      prm.resource === `${BASE}/mcp` && prm.authorization_servers?.[0] === BASE,
      JSON.stringify(prm)
    );

    const asm = await (await fetch(`${BASE}/.well-known/oauth-authorization-server`)).json();
    check(
      "authorization-server metadata is complete",
      asm.issuer === BASE &&
        asm.authorization_endpoint === `${BASE}/authorize` &&
        asm.token_endpoint === `${BASE}/token` &&
        asm.registration_endpoint === `${BASE}/register` &&
        asm.code_challenge_methods_supported?.includes("S256"),
      JSON.stringify(asm)
    );

    check(
      "PKCE 'plain' is not offered",
      !asm.code_challenge_methods_supported?.includes("plain"),
      JSON.stringify(asm.code_challenge_methods_supported)
    );

    // --- unauthenticated MCP points at discovery --------------------------
    const unauth = await fetch(`${BASE}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    check(
      "401 advertises the resource metadata",
      unauth.status === 401 &&
        (unauth.headers.get("www-authenticate") ?? "").includes("resource_metadata="),
      `${unauth.status} ${unauth.headers.get("www-authenticate")}`
    );

    // --- registration ------------------------------------------------------
    const reg = await fetch(`${BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirect_uris: [REDIRECT], client_name: "Claude" }),
    });
    const client = await reg.json();
    check("registration returns a client_id", reg.status === 201 && !!client.client_id);

    const noUris = await fetch(`${BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirect_uris: [] }),
    });
    check("registration without a redirect_uri is refused", noUris.status === 400);

    // --- the form ----------------------------------------------------------
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const authorizeUrl = (uri, cid = client.client_id) =>
      `${BASE}/authorize?response_type=code&client_id=${encodeURIComponent(cid)}` +
      `&redirect_uri=${encodeURIComponent(uri)}&code_challenge=${challenge}` +
      `&code_challenge_method=S256&state=xyz`;

    const page = await fetch(authorizeUrl(REDIRECT));
    const html = await page.text();
    check(
      "the sign-in page asks for an API key",
      page.status === 200 && html.includes('name="api_key"') && html.includes("Integra"),
      String(page.status)
    );

    const evil = await fetch(authorizeUrl("https://attacker.example.com/callback"));
    check(
      "an unregistered redirect address is refused",
      evil.status === 400,
      `expected 400, got ${evil.status}`
    );

    // --- authorize -> code -------------------------------------------------
    const form = new URLSearchParams({
      client_id: client.client_id,
      redirect_uri: REDIRECT,
      state: "xyz",
      code_challenge: challenge,
      api_key: API_KEY,
    });
    const posted = await fetch(`${BASE}/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      redirect: "manual",
    });
    const location = posted.headers.get("location") ?? "";
    const code = new URL(location || "http://x/").searchParams.get("code");
    check(
      "a valid key redirects back with a code and the state",
      posted.status === 302 &&
        location.startsWith(REDIRECT) &&
        !!code &&
        new URL(location).searchParams.get("state") === "xyz",
      `${posted.status} ${location.slice(0, 80)}`
    );

    check("the code does not contain the key in clear text", !!code && !code.includes(API_KEY));

    // --- token -------------------------------------------------------------
    const wrongVerifier = await postToken({
      grant_type: "authorization_code",
      code,
      code_verifier: randomBytes(32).toString("base64url"),
      redirect_uri: REDIRECT,
    });
    check("a mismatched PKCE verifier is refused", wrongVerifier.status === 400);

    const wrongRedirect = await postToken({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: "https://claude.ai/somewhere-else",
    });
    check("a code redeemed against another redirect_uri is refused", wrongRedirect.status === 400);

    const tokenRes = await postToken({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: REDIRECT,
    });
    const tokens = await tokenRes.json();
    check(
      "the code exchanges for a bearer token",
      tokenRes.status === 200 && !!tokens.access_token && tokens.token_type === "Bearer",
      JSON.stringify(tokens).slice(0, 120)
    );
    check(
      "the access token does not contain the key in clear text",
      !!tokens.access_token && !tokens.access_token.includes(API_KEY)
    );

    // --- the token actually authenticates MCP ------------------------------
    const call = await fetch(`${BASE}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    const listed = await call.text();
    check(
      "the token gets past the MCP door",
      call.status === 200 && listed.includes("get_sentiment"),
      `${call.status} ${listed.slice(0, 100)}`
    );

    // --- cross-kind replay --------------------------------------------------
    const replay = await postToken({
      grant_type: "authorization_code",
      code: tokens.access_token,
      code_verifier: verifier,
      redirect_uri: REDIRECT,
    });
    check("an access token replayed as a code is refused", replay.status === 400);

    const refreshed = await postToken({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    });
    check("the refresh token issues a new access token", refreshed.status === 200);

    // --- a raw key still works ---------------------------------------------
    const rawKey = await fetch(`${BASE}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    check(
      "a raw ik_live_ key still authenticates, for stdio and header clients",
      rawKey.status === 200,
      String(rawKey.status)
    );

    const garbage = await fetch(`${BASE}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: "Bearer not-a-token-at-all",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    check("a bearer that is neither a key nor a token is refused", garbage.status === 401);
  } finally {
    server.kill();
  }

  for (const { name, ok, detail } of results) {
    console.log(`${ok ? "✔" : "✖"} ${name}${ok || !detail ? "" : `\n    ${detail}`}`);
  }
  if (failures) {
    console.error(`\n${failures} of ${results.length} OAuth checks failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${results.length} OAuth checks passed.`);
}

function postToken(fields) {
  return fetch(`${BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
}

async function waitForHealth() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
}

await main();
