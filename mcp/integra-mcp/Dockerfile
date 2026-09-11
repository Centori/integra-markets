# Remote MCP server — Streamable HTTP transport.
#
# Runs as its own Railway service inside the SAME project as the backend, the
# way railway.backfill.json already does. Separate service rather than a route
# on the FastAPI app for two reasons: it is Node against a Python backend, and
# an MCP client holding a long-lived connection should not be able to affect
# the API's own capacity.
#
# Multi-stage so the runtime image carries no TypeScript compiler and no dev
# dependencies — the published package is 9 kB of JavaScript, and the image
# should reflect that rather than shipping the toolchain that produced it.

# ---- build ----------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Copy manifests first so `npm ci` is cached independently of source changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
# `npm run build` is plain tsc. It used to be `npm run check:tools && tsc`, and
# scripts/ is not copied into this image — so every deploy since that change
# failed at this line with "Cannot find module /app/scripts/check-tool-parity.mjs".
# Copying the script would not have helped: it compares against
# dashboard/lib/mcpTools.ts, which is outside this build context by design.
# The parity check belongs in CI, where both files exist, and it now runs there.
RUN npm run build

# ---- runtime --------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
# --omit=dev drops typescript and @types, which exist only to produce dist/.
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# node:alpine ships an unprivileged `node` user. Running as root buys nothing
# here and costs the usual.
USER node

# Railway injects PORT; http.ts defaults to 8080 when it is absent.
EXPOSE 8080

# Not `npm start` — that resolves to dist/index.js, the STDIO entrypoint, which
# would sit waiting on a stdin that never arrives and fail the health check with
# no error in the logs.
CMD ["node", "dist/http.js"]
