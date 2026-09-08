# Deploying the remote MCP server

The Streamable HTTP server in `src/http.ts` is what Claude's **custom
connectors** talk to. Claude Desktop can spawn the stdio binary locally; Claude
on **web and mobile** cannot spawn anything, so the server has to already be
running somewhere reachable. That is this deployment.

It runs as its own service **inside the existing `integra-markets-backend`
Railway project** — the same account and project as the API, the way
`railway.backfill.json` already does. Separate service, shared project.

---

## Why a separate service rather than a route on the API

- It is **Node against a Python backend**. Adding it to the FastAPI image would
  mean carrying a Node runtime in a Python container for one file.
- An MCP client can hold a long-lived streaming connection. Those should not be
  able to consume the API's own request capacity.
- It scales and fails **independently**. If the connector is saturated, the
  mobile app and the dashboard are unaffected.

The MCP server calls the public API over HTTPS like any other customer, using
the caller's own key — so there is no private coupling to protect.

---

## Identifiers

From `~/.railway/config.json`; the project id matches the `18e783a9` prefix
recorded in `.github/workflows/deploy.yml`, which is how it was confirmed to be
the right project rather than one of the other five linked Railway projects on
this machine.

| | |
|---|---|
| Project | `18e783a9-f02d-4396-b49c-98a7a99bbc72` (`integra-markets-backend`) |
| Environment | `de3d0dd8-5cd7-43af-9570-1e18fd4788b5` (`production`) |
| Existing API service | `29cd17ce-b9f5-4d6f-a4fd-4cfb89125ca0` |

---

## One-time setup

### 1. Add a second SERVICE to the existing project

Railway has two levels, and the wording matters here:

| | |
|---|---|
| **Project** | The container. `integra-markets-backend`. **Do not create one.** |
| **Service** | A deployable unit *inside* a project. The API is one today. **Create a second.** |

The button labelled **New** on the project canvas adds a **service to the
project you are already inside**. It does not create a project. You should end
up with two services side by side on one canvas — the same shape
`railway.backfill.json` already produces.

**→ [Open the project canvas](https://railway.com/project/18e783a9-f02d-4396-b49c-98a7a99bbc72?environmentId=de3d0dd8-5cd7-43af-9570-1e18fd4788b5)**

Confirm the header reads **integra-markets-backend**, then:

**New** → **GitHub Repo** → `Centori/integra-markets`

Railway offers no deep link to that modal, which is why step 1 stops at the
canvas. If you instead land on a screen asking you to *name a project*, you have
gone one level too high — back out. A service created in the wrong project is
annoying to undo, because the custom domain follows the project.

Once the service exists, its id appears in the address bar:

```
https://railway.com/project/18e783a9-.../service/<THIS>/...
                                               ^^^^^^^^
```

Substitute it into the links below. They cannot be generated in advance — the
service does not exist yet.

### 2. Point it at this config

**→ `https://railway.com/project/18e783a9-f02d-4396-b49c-98a7a99bbc72/service/<SERVICE_ID>/settings?environmentId=de3d0dd8-5cd7-43af-9570-1e18fd4788b5`**

Under **Config-as-code**, set the path to:

```
railway.mcp.json
```

That file pins the Dockerfile at `mcp/integra-mcp/Dockerfile` and the health
check at `/health`. Leave **Root Directory** empty — the Dockerfile copies from
the repo root so it can read both `mcp/integra-mcp/package.json` and
`package-lock.json` in one build context.

### 3. Environment

**→ `https://railway.com/project/18e783a9-f02d-4396-b49c-98a7a99bbc72/service/<SERVICE_ID>/variables?environmentId=de3d0dd8-5cd7-43af-9570-1e18fd4788b5`**

Nothing is required — every variable has a working default and Railway injects
`PORT`. Set these only to override:

| Variable | Default | Notes |
|---|---|---|
| `INTEGRA_API_URL` | `https://api.integramarkets.app` | Upstream API |
| `MCP_PATH` | `/mcp` | Endpoint path |
| `MCP_MAX_BODY_BYTES` | `1000000` | Request body cap |
| `PORT` | injected by Railway | `http.ts` falls back to 8080 |

**Do not set `INTEGRA_API_KEY` on this service.** The stdio entrypoint reads it;
the HTTP one deliberately does not. If it were set here every caller would share
one identity, one entitlement and one rate-limit bucket, and the usage table
could not tell them apart. Each request carries its own
`Authorization: Bearer ik_live_…`.

### 4. Domain

**→ `https://railway.com/project/18e783a9-f02d-4396-b49c-98a7a99bbc72/service/<SERVICE_ID>/settings/networking?environmentId=de3d0dd8-5cd7-43af-9570-1e18fd4788b5`**

**Custom Domain** → `mcp.integramarkets.app`, then add the CNAME Railway shows
you at your DNS provider. Railway issues the certificate once the CNAME
resolves, which usually takes a few minutes and occasionally an hour.

A subdomain rather than a path on the API, so the URL a customer pastes into
their connector settings never changes if the backend is restructured later.

---

## Verifying

```bash
# 1. Liveness — unauthenticated, this is what Railway probes.
curl https://mcp.integramarkets.app/health
# {"ok":true,"server":"integra-mcp","version":"0.2.0"}

# 2. Auth is enforced, and says how to fix itself.
curl -i -X POST https://mcp.integramarkets.app/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1}'
# 401, WWW-Authenticate: Bearer realm="integra-mcp"

# 3. Tool list with a real key.
curl -s -X POST https://mcp.integramarkets.app/mcp \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ik_live_…' \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' | jq '.result.tools[].name'
```

Step 3 should list **five** tools. `find_historical_analogs` is deliberately
absent — see below.

---

## Connecting it in Claude

Settings → **Connectors** → **Add custom connector** → URL:

```
https://mcp.integramarkets.app/mcp
```

Available on Free (one connector), Pro, Max, Team and Enterprise. The server
must be reachable from Anthropic's published IP ranges; Railway is.

Authentication today is the API key. The connector UI also accepts an OAuth
client id and secret, which is the right answer before publicising it beyond
design partners — a pasted key is a long-lived secret in a hosted setting with
no per-session revocation.

---

## `find_historical_analogs` is withdrawn

It is defined in `WITHDRAWN_TOOLS`, not `TOOLS`, so it is not advertised.

`/v1/historical/analogs` returns **501** — the backfill tables it reads are not
populated yet. Advertising a tool that always fails is worse than not
advertising it: an assistant will reach for it exactly when the user asks the
question the product exists to answer, and the failure arrives mid-conversation
as a protocol error rather than an honest "not yet".

Restoring it is moving one entry from `WITHDRAWN_TOOLS` back into `TOOLS`, once
`/v1/historical/analogs` returns data.

---

## Ordering

**Deploy this before touching `ConnectClaude.tsx`.** The dashboard page tells
customers the URL; if it ships first, every reader hits a dead endpoint — the
same failure that made the `npx @integra/mcp` instructions wrong for months.
