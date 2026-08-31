#!/usr/bin/env node
/**
 * stdio entrypoint — Claude Desktop and Claude Code.
 *
 * The client spawns this as a subprocess and talks over stdin/stdout, which
 * is why the API key comes from the environment: one user, one machine, one
 * key living in a local config file only its owner can read.
 *
 * Behaviour here is unchanged from 0.1.0. Existing claude_desktop_config.json
 * entries keep working exactly as before; the HTTP transport is a separate
 * binary (see http.ts) so shipping it cannot disturb Claude users.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { IntegraClient } from "./client.js";
import { createServer } from "./server.js";

const apiKey = process.env.INTEGRA_API_KEY;
if (!apiKey) {
  console.error("[integra-mcp] INTEGRA_API_KEY environment variable is required.");
  console.error("Get a key from https://dashboard.integramarkets.app/api-keys");
  process.exit(1);
}

const client = new IntegraClient(apiKey);
const server = createServer(() => client);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[integra-mcp] server started on stdio");
