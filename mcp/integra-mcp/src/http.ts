#!/usr/bin/env node
/**
 * Streamable HTTP entrypoint — remote MCP clients.
 *
 * Claude Desktop spawns the stdio binary locally. Clients that cannot spawn a
 * process on the user's machine — ChatGPT connectors, hosted agents, anything
 * calling over the network — need the server to already be running somewhere
 * and reachable over HTTP. That is this file.
 *
 * Two things differ from stdio, and both matter.
 *
 * 1. THE KEY COMES FROM THE REQUEST, NOT THE PROCESS.
 *    Reading INTEGRA_API_KEY here would give every caller the same identity,
 *    the same entitlement and the same rate-limit bucket — one user's traffic
 *    would exhaust another's allowance, and the usage table could not tell
 *    them apart. Each request carries its own `Authorization: Bearer ik_live_…`
 *    and gets a client bound to that key alone.
 *
 * 2. STATELESS.
 *    A fresh Server + transport per request, with no session id. Our tools
 *    hold no cross-call state, so sessions would buy nothing and cost
 *    stickiness — which in turn would block horizontal scaling on Railway.
 *
 * Deliberately built on node:http rather than Express: the package currently
 * has two runtime dependencies and this does not need to add a third.
 */
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { IntegraClient } from "./client.js";
import { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";
import { authorizePage, authorizeErrorPage } from "./authorizePage.js";
import {
  OAUTH_PATHS,
  authorizationServerMetadata,
  oauthEnabled,
  protectedResourceMetadata,
  publicOrigin,
  redeemCode,
  redeemRefresh,
  registerClient,
  registeredRedirectUris,
  resolveApiKey,
  issueCode,
} from "./oauth.js";

const PORT = Number(process.env.PORT ?? 8080);
const MCP_PATH = process.env.MCP_PATH ?? "/mcp";

/** Cap request bodies — an MCP call is small, and unbounded reads are a DoS. */
const MAX_BODY_BYTES = Number(process.env.MCP_MAX_BODY_BYTES ?? 1_000_000);

function extractApiKey(req: IncomingMessage): string | null {
  const header = req.headers["authorization"];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value || !value.startsWith("Bearer ")) return null;
  const key = value.slice("Bearer ".length).trim();
  return key.length > 0 ? key : null;
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) return resolve(undefined);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

/** JSON-RPC shaped error, so MCP clients surface it rather than choking. */
function rpcError(res: ServerResponse, status: number, code: number, message: string): void {
  sendJson(res, status, { jsonrpc: "2.0", error: { code, message }, id: null });
}

const INTEGRA_API_URL = (process.env.INTEGRA_API_URL ?? "https://api.integramarkets.app").replace(/\/$/, "");

function originOf(req: IncomingMessage): string {
  const proto = req.headers["x-forwarded-proto"];
  return publicOrigin(req.headers.host, Array.isArray(proto) ? proto[0] : proto);
}

function isOAuthPath(path: string): boolean {
  return (
    path === OAUTH_PATHS.protectedResource ||
    path === OAUTH_PATHS.authorizationServer ||
    path === OAUTH_PATHS.register ||
    path === OAUTH_PATHS.authorize ||
    path === OAUTH_PATHS.token ||
    // Some clients append the resource path to the well-known lookup, per
    // RFC 9728. Answering both spellings is cheaper than debugging which one a
    // given client chose.
    path.startsWith(`${OAUTH_PATHS.protectedResource}/`) ||
    path.startsWith(`${OAUTH_PATHS.authorizationServer}/`)
  );
}

function sendHtml(res: ServerResponse, status: number, html: string): void {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
    // The form carries an API key. Keep it out of shared caches and out of the
    // referrer sent to the redirect target.
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  });
  res.end(html);
}

function readForm(req: IncomingMessage): Promise<URLSearchParams> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(new URLSearchParams(Buffer.concat(chunks).toString("utf8"))));
    req.on("error", reject);
  });
}

/**
 * Is this key real? Asked of the API, because this server has no user table.
 *
 * 401 is the only answer that means "no". A 403 is a valid key whose plan does
 * not cover that endpoint, and refusing it here would tell a paying customer
 * their key is invalid — the failure should surface later, on the call that
 * actually needs the entitlement, where the message can say which.
 */
async function apiKeyIsValid(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${INTEGRA_API_URL}/v1/commodities`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    return res.status !== 401;
  } catch {
    // The API being unreachable is not evidence the key is bad. Let it through;
    // the MCP call that follows will fail loudly and accurately.
    return true;
  }
}

function oauthError(res: ServerResponse, status: number, error: string, description: string): void {
  sendJson(res, status, { error, error_description: description });
}

async function handleOAuth(req: IncomingMessage, res: ServerResponse, path: string): Promise<void> {
  const origin = originOf(req);

  if (path === OAUTH_PATHS.protectedResource || path.startsWith(`${OAUTH_PATHS.protectedResource}/`)) {
    return sendJson(res, 200, protectedResourceMetadata(origin));
  }

  if (path === OAUTH_PATHS.authorizationServer || path.startsWith(`${OAUTH_PATHS.authorizationServer}/`)) {
    return sendJson(res, 200, authorizationServerMetadata(origin));
  }

  // --- dynamic client registration ---------------------------------------
  if (path === OAUTH_PATHS.register) {
    if (req.method !== "POST") return oauthError(res, 405, "invalid_request", "POST only");
    let body: any;
    try {
      body = await readBody(req);
    } catch {
      return oauthError(res, 400, "invalid_request", "body was not JSON");
    }
    const uris = Array.isArray(body?.redirect_uris) ? body.redirect_uris : [];
    const registered = registerClient(uris);
    if (!registered) {
      return oauthError(res, 400, "invalid_redirect_uri", "at least one redirect_uri is required");
    }
    return sendJson(res, 201, {
      client_id: registered.client_id,
      redirect_uris: uris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: typeof body?.client_name === "string" ? body.client_name : undefined,
    });
  }

  // --- the sign-in page ---------------------------------------------------
  if (path === OAUTH_PATHS.authorize) {
    if (req.method === "GET") {
      const url = new URL(req.url ?? "/", origin);
      const form = {
        clientId: url.searchParams.get("client_id") ?? "",
        redirectUri: url.searchParams.get("redirect_uri") ?? "",
        state: url.searchParams.get("state") ?? "",
        codeChallenge: url.searchParams.get("code_challenge") ?? "",
        resource: url.searchParams.get("resource") ?? "",
      };
      const invalid = validateAuthorizeParams(form, url.searchParams.get("code_challenge_method"));
      if (invalid) return sendHtml(res, 400, authorizeErrorPage(invalid));
      return sendHtml(res, 200, authorizePage(form));
    }

    if (req.method === "POST") {
      let form: URLSearchParams;
      try {
        form = await readForm(req);
      } catch {
        return sendHtml(res, 400, authorizeErrorPage("The form could not be read."));
      }
      const params = {
        clientId: form.get("client_id") ?? "",
        redirectUri: form.get("redirect_uri") ?? "",
        state: form.get("state") ?? "",
        codeChallenge: form.get("code_challenge") ?? "",
        resource: form.get("resource") ?? "",
      };
      const invalid = validateAuthorizeParams(params, "S256");
      if (invalid) return sendHtml(res, 400, authorizeErrorPage(invalid));

      const apiKey = (form.get("api_key") ?? "").trim();
      if (!apiKey) {
        return sendHtml(res, 400, authorizePage(params, "Enter an API key to continue."));
      }
      if (!(await apiKeyIsValid(apiKey))) {
        // Re-render rather than redirect: the user is standing in front of the
        // one field they can fix, and bouncing them back to Claude with an
        // error turns a typo into a restart of the whole flow.
        return sendHtml(
          res,
          401,
          authorizePage(params, "That key was rejected. Check it was copied whole, or create a new one.")
        );
      }

      const code = issueCode(apiKey, params.codeChallenge, params.redirectUri);
      if (!code) return sendHtml(res, 500, authorizeErrorPage("Could not issue an authorization code."));

      const target = new URL(params.redirectUri);
      target.searchParams.set("code", code);
      if (params.state) target.searchParams.set("state", params.state);
      res.writeHead(302, { Location: target.toString(), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
      res.end();
      return;
    }

    return oauthError(res, 405, "invalid_request", "GET or POST only");
  }

  // --- token --------------------------------------------------------------
  if (path === OAUTH_PATHS.token) {
    if (req.method !== "POST") return oauthError(res, 405, "invalid_request", "POST only");
    let form: URLSearchParams;
    try {
      form = await readForm(req);
    } catch {
      return oauthError(res, 400, "invalid_request", "body could not be read");
    }

    const grant = form.get("grant_type");
    let result;
    if (grant === "authorization_code") {
      result = redeemCode(
        form.get("code") ?? "",
        form.get("code_verifier") ?? "",
        form.get("redirect_uri") ?? ""
      );
    } else if (grant === "refresh_token") {
      result = redeemRefresh(form.get("refresh_token") ?? "");
    } else {
      return oauthError(res, 400, "unsupported_grant_type", `grant_type ${grant ?? "(missing)"}`);
    }

    if ("error" in result) {
      return oauthError(
        res,
        400,
        result.error,
        "The authorization code or refresh token was invalid, expired, or did not match this client."
      );
    }
    res.setHeader("Cache-Control", "no-store");
    return sendJson(res, 200, result);
  }

  return oauthError(res, 404, "invalid_request", "no such endpoint");
}

/** Everything that must be true before a password field is put in front of anyone. */
function validateAuthorizeParams(
  params: { clientId: string; redirectUri: string; codeChallenge: string },
  challengeMethod: string | null
): string | null {
  if (!params.clientId) return "The connector did not send a client id.";
  if (!params.redirectUri) return "The connector did not send a redirect address.";
  if (!params.codeChallenge) return "The connector did not send a PKCE challenge.";
  if (challengeMethod && challengeMethod !== "S256") {
    return `Unsupported PKCE method ${challengeMethod}. This server requires S256.`;
  }

  // The redirect target must be one the client registered. Without this check
  // anyone could craft an /authorize link pointing anywhere, and a user who
  // pasted their key into our real page would have it delivered to a stranger.
  const allowed = registeredRedirectUris(params.clientId);
  if (!allowed) return "The connector's registration has expired. Reconnect it to continue.";
  if (!allowed.includes(params.redirectUri)) {
    return "The redirect address does not match the one this connector registered.";
  }
  return null;
}

const httpServer = createHttpServer(async (req, res) => {
  // Unauthenticated liveness probe for Railway.
  if (req.method === "GET" && req.url === "/health") {
    return sendJson(res, 200, { ok: true, server: SERVER_NAME, version: SERVER_VERSION });
  }

  const path = (req.url ?? "").split("?")[0];

  // --- OAuth ---------------------------------------------------------------
  // Handled before the MCP path check so that a client following discovery
  // reaches an endpoint rather than the catch-all. When MCP_OAUTH_SECRET is
  // unset these all fall through to the message below, which tells the user to
  // configure a header instead — the behaviour this server had before.
  if (oauthEnabled() && isOAuthPath(path)) {
    return handleOAuth(req, res, path);
  }

  if (path.startsWith("/.well-known/oauth") || path === OAUTH_PATHS.register) {
    // Reached only when OAuth is switched off. The generic "Not found. MCP
    // endpoint is /mcp" was true, useless, and shown to the user verbatim: it
    // reads as a wrong server address when the address was right and the auth
    // mode was wrong.
    return rpcError(
      res,
      404,
      -32601,
      "This server is not configured for OAuth. In the connector's settings " +
        "set Authentication to 'None', then add a request header " +
        "'Authorization' with the value 'Bearer <your Integra API key>'. " +
        "Keys are created at https://dashboard.integramarkets.app/account/api"
    );
  }

  if (path !== MCP_PATH) {
    return rpcError(res, 404, -32601, `Not found. MCP endpoint is ${MCP_PATH}`);
  }

  const bearer = extractApiKey(req);
  // A bearer is either a raw ik_live_ key (stdio-style config, and anything
  // that can send its own header) or a token this server issued through the
  // OAuth flow. resolveApiKey unwraps the second and passes the first through.
  const apiKey = bearer ? resolveApiKey(bearer) : null;
  if (!apiKey) {
    // THE HEADER IS A PROMISE, AND IT IS NOW KEPT.
    //
    // 401 + `WWW-Authenticate: Bearer` is not a prompt for credentials; per the
    // MCP authorization spec it is the signal that the server speaks OAuth 2.0,
    // and a client takes it at its word:
    //
    //     GET /.well-known/oauth-protected-resource
    //     GET /.well-known/oauth-authorization-server
    //     POST /register
    //
    // This server used to send the header and serve none of those, so Claude
    // reported "Couldn't register with Integra Markets's sign-in service" to
    // users holding a perfectly good API key, and the header was removed. All
    // three endpoints exist now, so the header goes back — but only when OAuth
    // is actually configured. Advertising a flow that cannot complete is the
    // bug that was fixed; advertising one that can is what makes the connector
    // configurable at all, because Claude's dialog offers no way to set a
    // header by hand.
    if (oauthEnabled()) {
      const origin = originOf(req);
      res.setHeader(
        "WWW-Authenticate",
        `Bearer realm="integra-mcp", resource_metadata="${origin}${OAUTH_PATHS.protectedResource}"`
      );
    }
    return rpcError(
      res,
      401,
      -32001,
      oauthEnabled()
        ? "Not connected. Reconnect the Integra connector and paste an API key when asked. " +
            "Keys are created at https://dashboard.integramarkets.app/account/api"
        : "Missing Authorization header. Send 'Authorization: Bearer <your Integra API key>'. " +
            "Get a key at https://dashboard.integramarkets.app/account/api"
    );
  }

  let body: unknown;
  try {
    body = await readBody(req);
  } catch (err) {
    return rpcError(res, 400, -32700, err instanceof Error ? err.message : "bad request");
  }

  // Fresh server + transport per request. sessionIdGenerator: undefined puts
  // the transport in stateless mode — no session to resume, nothing sticky,
  // so instances scale horizontally without a shared store.
  // "http": this key came from an Authorization header the user configured
  // in Claude, not from an environment variable, so a rejection has to say
  // so. See IntegraClient.keyHelp().
  const client = new IntegraClient(apiKey, undefined, "http");
  const server = createServer(() => client);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (err) {
    console.error("[integra-mcp:http] request failed:", err);
    if (!res.headersSent) {
      rpcError(res, 500, -32603, "internal error");
    }
  }
});

httpServer.listen(PORT, () => {
  console.error(
    `[integra-mcp] Streamable HTTP server listening on :${PORT}${MCP_PATH} ` +
      `(v${SERVER_VERSION}); each request must carry its own Integra API key`
  );
});
