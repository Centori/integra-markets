# @integra/mcp

MCP server for [Integra Markets](https://integramarkets.app) — commodity sentiment, prediction-market divergence, and narrative intelligence, exposed as tools for Claude Desktop and Claude Code.

## What it does

Once installed, you can ask Claude questions like:

- "What's the current sentiment on Brent?"
- "Give me a market brief for wheat."
- "Which prediction markets does the AI most strongly disagree with?"
- "Find historical periods where natural gas set up like this." *(API+History tier only)*

Claude will call the Integra API on your behalf and return structured answers.

## Requirements

- Node.js 18+
- An [Integra API key](https://dashboard.integramarkets.app/api-keys) (API Basic tier or higher)

## Install

### Claude Code

```bash
claude mcp add integra --env INTEGRA_API_KEY=ik_live_your_key_here -- npx -y @integra/mcp
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "integra": {
      "command": "npx",
      "args": ["-y", "@integra/mcp"],
      "env": {
        "INTEGRA_API_KEY": "ik_live_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. The `integra` server should appear in the connectors list.

## Remote access (Streamable HTTP)

The install above is **stdio**: Claude Desktop and Claude Code spawn the server
as a local subprocess. That is the right shape for a single user on their own
machine, and it is what most people want.

Clients that cannot spawn a process on your machine — ChatGPT connectors,
hosted agents, anything reaching you over the network — need the server
running somewhere reachable. `integra-mcp-http` is that:

```bash
npm run build
PORT=8080 npm run start:http     # POST /mcp, plus GET /health
```

**The API key works differently here, and it matters.** In stdio mode the key
comes from `INTEGRA_API_KEY` — one user, one machine, one key in a local file.
In HTTP mode the server is shared, so **each request carries its own key**:

```
Authorization: Bearer ik_live_your_key_here
```

A key baked into the process would give every caller the same identity, the
same entitlement and the same rate-limit bucket — one user's traffic would
exhaust another's allowance, and usage records could not tell them apart.
Requests without a key get `401` and a `WWW-Authenticate` header.

The transport is **stateless** (no session id): a fresh server per request,
nothing sticky, so instances scale horizontally without a shared store.

## Tools exposed

| Tool | Tier | Purpose |
|---|---|---|
| `get_sentiment` | API Basic | Aggregate sentiment score for a commodity |
| `find_emerging_narratives` | API Basic | Detect themes in recent news |
| `compare_human_vs_ai` | API Basic | AI vs prediction-market divergence |
| `screen_high_conviction_markets` | API Basic | Highest-divergence trade candidates |
| `market_brief` | API Basic | Composite briefing (sentiment + narratives + divergence + price) |
| `find_historical_analogs` | API + History | Similar past setups + realized moves |

Manage your subscription and API keys at [dashboard.integramarkets.app](https://dashboard.integramarkets.app/api-tier).

## Development

```bash
npm install
npm run build
INTEGRA_API_KEY=... npm start
```

## Rate limits

The API meters requests per calendar month, per key. Responses carry:

```
X-RateLimit-Limit      your monthly allowance
X-RateLimit-Remaining  what is left
X-RateLimit-Reset      unix timestamp of the reset
```

On exhaustion you get `429` with `Retry-After`. The MCP client surfaces this
as a plain "monthly limit reached, resets on <date>, do not retry" message
rather than a raw error, so an agent reports it instead of retrying into the
wall.

## Support

Email [contact@integramarkets.app](mailto:contact@integramarkets.app) for enterprise pricing, SLAs, or custom tool development.
