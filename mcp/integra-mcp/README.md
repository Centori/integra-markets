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
claude mcp add integra --env INTEGRA_API_KEY=intg_your_key_here -- npx -y @integra/mcp
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
        "INTEGRA_API_KEY": "intg_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. The `integra` server should appear in the connectors list.

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

## Support

Email [contact@integramarkets.app](mailto:contact@integramarkets.app) for enterprise pricing, SLAs, or custom tool development.
