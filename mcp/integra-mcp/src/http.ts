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

const httpServer = createHttpServer(async (req, res) => {
  // Unauthenticated liveness probe for Railway.
  if (req.method === "GET" && req.url === "/health") {
    return sendJson(res, 200, { ok: true, server: SERVER_NAME, version: SERVER_VERSION });
  }

  const path = (req.url ?? "").split("?")[0];
  if (path !== MCP_PATH) {
    return rpcError(res, 404, -32601, `Not found. MCP endpoint is ${MCP_PATH}`);
  }

  const apiKey = extractApiKey(req);
  if (!apiKey) {
    // 401 + WWW-Authenticate so a connector can prompt for credentials rather
    // than failing opaquely.
    res.setHeader("WWW-Authenticate", 'Bearer realm="integra-mcp"');
    return rpcError(
      res,
      401,
      -32001,
      "Missing Authorization header. Send 'Authorization: Bearer <your Integra API key>'. " +
        "Get a key at https://dashboard.integramarkets.app/api-keys"
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
  const client = new IntegraClient(apiKey);
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
