# Handoff — 2026-09-23

> Latest. Read `CLAUDE.md` "Before claiming anything works" and the code repair
> rule before writing anything. Run `npm run where` and `npm run verify:prod`
> first, every time.

Session objective, stated by the owner: **(1)** get API key generation and
management working so it can be tested, **(2)** get the MCP connector working
with those keys, **(3)** be able to query the database.

## Landed

| PR | What |
|---|---|
| #95 | MCP: transport-aware key errors *(carried over, merged and verified live)* |
| #96 | 18 Sep handoff *(carried over, merged)* |
| #97 | **An email comp grant now reaches the API-key path** — the thing blocking (1) and (2) |
| #98 | **`get_sentiment_history` + `list_commodities`** — the thing blocking (3) |

Backend tests 756 → 762.

## The bug that was blocking all three objectives

`INTEGRA_COMP_EMAILS=centori1@gmail.com` was set on the backend and comped the
**dashboard only**.

    dashboard request  → Supabase JWT → email known → api_history → keys render, minting works
    API-key request    → api_keys.user_id only → matches nothing → subscription RPC
                       → no row (nobody paid, that is the point of a comp) → NO SCOPES

So a key minted cleanly and then **403'd on every call made with it**. That
includes every MCP tool call, which is where it actually surfaces — mid
conversation, as a tier error, on an account that has been told it has the
full tier.

Nothing anywhere said so. The documented remedy was to read the UUID off
`/api/subscriptions/entitlement` and paste it into `INTEGRA_COMP_USER_IDS` as
well: a manual step nothing verifies and nothing complains about skipping.
That is the same silent half-configuration `comp_access.py` was written to
remove, reappearing inside `comp_access.py`.

#97 resolves the email behind the `user_id` through the GoTrue admin API
instead of demanding a second hand-pasted variable. Over HTTP, not through the
supabase client, because this runs on the key path where `main.py`'s client may
be absent and the client library's admin surface has moved between versions.
Only when an email grant is configured **and** the caller arrived without an
email — a UUID grant is still decided before any network call. Resolved
answers cached 15 minutes *including misses*; failures deliberately **not**
cached, because pinning "not comped" for a quarter hour after a blip reads as
a grant that revoked itself and came back.

`INTEGRA_COMP_USER_IDS` is now optional. Setting it is still the faster path
and the only one that works if the admin API is unreachable.

## What could not be verified from here, and why it matters

Everything above is verified by unit tests and by live probes of the
**unauthenticated** behaviour: `/api/keys` answers 401 (not 503) with no token
and with a malformed one, `/v1/*` answers 401 on a bogus key, `api_keys` and
`api_key_usage` exist in Supabase, the comp variable is set on the backend
service.

**The authenticated half was not exercised.** Doing so needs a Supabase session
token for the owner's account, and minting one was blocked by the sandbox — as
it should be. So the first real end-to-end run of "create a key, call the API
with it" is the owner's, below. If it fails, it will fail visibly with a status
code, not silently.

### The five-minute test

1. `https://dashboard.integramarkets.app/account/api` — Subscription should say
   the API + History tier. Create a key; the plaintext is shown **once**.
2. Cheapest possible check that the key works:

       curl -H "Authorization: Bearer ik_live_..." \
            https://api.integramarkets.app/v1/commodities

   A list of names → the key has scopes and #97 worked. **403 → #97 did not
   take**, and the fallback is one command:

       railway variables -s backend -e production --set INTEGRA_COMP_USER_IDS=<your uuid>

   The UUID is in `/api/subscriptions/entitlement`.
3. Connector URL: `https://integra-mcp-production.up.railway.app/mcp`,
   `Authorization: Bearer <that key>`. **Not** `mcp.integramarkets.app` — see
   below. Then ask Claude *"how has copper sentiment moved over the last 30
   days"*, which is the question that had no tool until #98.

Use the names `/v1/commodities` returns. They are the `entity` values in
`entity_mentions`, and they are not always the ones on the dashboard — the
market endpoint says "natural gas" where the MCP examples say `ng`. That
mismatch is exactly why `list_commodities` exists.

## Querying the database (objective 3)

Every advertised tool answered *"what is true now"*. The database holds a
scored document per article going back months, and nothing in the connector
could reach it — "how has copper moved since August" had no tool to call, so
the model either declined or inferred a direction from a single `get_sentiment`
reading, which is one number quoted twice and presented as a trend.

* **`get_sentiment_history`** → `/v1/sentiment/{commodity}/daily`. Buckets by
  UTC day server-side and returns day-on-day momentum, so the answer is
  computed rather than eyeballed. Rendered as a table — a year of rows as prose
  spends context on repeated words. Needs the `history` scope.
* **`list_commodities`** → `/v1/commodities`. What is actually indexed, and the
  cheapest authenticated call there is.

7 advertised tools, 1 withdrawn (`find_historical_analogs`, still 501 until the
archive backfill lands). `check-tool-parity.mjs` keeps
`dashboard/lib/mcpTools.ts` honest.

Data is live: `/api/news/latest` returned a Kpler/Hormuz story timestamped
today, with a real summary rather than raw Google News HTML — #88 holding.
`/api/sentiment/market` shows oil BULLISH on a sample of 23 and natural gas on
a sample of 0, so coverage is uneven by commodity.

## Still open

**`mcp.integramarkets.app` has had no certificate for 15 days.** Re-verified
today and nothing has changed on our side: DNS resolves to a Railway edge IP
(`69.46.46.102`, `RLWY-HIKARI-01`) exactly as `api.integramarkets.app` does,
port 80 answers identically on both hosts, CAA on the apex permits
letsencrypt.org, and the domain is still attached to the `integra-mcp` service.
One host gets a certificate and the other does not, with identical
configuration. **This needs a Railway support ticket** — project
`18e783a9-f02d-4396-b49c-98a7a99bbc72`, domain
`d27eb5a5-008f-49f1-bfc4-1ada1be18a85`. Nothing is blocked by it: the dashboard
already hands out the `.up.railway.app` address.

**`NEXT_PUBLIC_GOOGLE_CLIENT_ID` — order still matters.** Confirmed today the
variable is still absent from the `integra-dashboard` Vercel project.

1. Google Cloud Console → the client → **Authorized JavaScript origins** → add
   `https://dashboard.integramarkets.app`
2. *Then* set the variable on `integra-dashboard`.

Setting it first turns #89's verifier check green while the consent screen
still shows the Supabase host — a false green, which is the one thing that
tooling exists to prevent. Try the free fix first: the OAuth consent screen's
**App name**. Google shows "to continue to *\<App name\>*" when branding is
set and falls back to the raw host when it is not.

**`web/src/components/SocialAuthButtons.tsx` still uses `signInWithOAuth`.**
#80 never touched it, so the Vercel variable will not change www. Porting the
GIS module across is about an hour.

**`freight` has no curve rules.** FFAs are a real forward market with real
contango. 14 of 20 markets covered; the other absences are correct.

**iOS 1.0.3 (91)** was uploaded on 11 Sep and the storefront still shows 1.0.2
— almost certainly awaiting a manual submit in App Store Connect.

**App Store localization / ASO**, asked about and deferred: the lever is
`fastlane deliver` with per-locale metadata, and the ranking surface is each
locale's own 100-character keyword field — not the description.

## Working notes for whoever picks this up

`/tmp/lat` is gone; a current checkout of `Centori/integra-markets` main is at
`~/Desktop/integra/integra-markets-main`. `~/integra-markets` is still the
stale `jeremiahMshelia` fork — reading it produced an entirely fictional
analysis once already — and `~/Desktop/integra/integra-markets-2` is the
shipped mobile lineage on `release/1.0.3`. Run `npm run where`.

The live backend is `https://api.integramarkets.app`, **not**
`integra-markets-backend-production.up.railway.app`, which now answers
"Application not found" and looks exactly like an outage.

Railway builds queue behind each other: merging two PRs a minute apart left a
backend deployment QUEUED for several minutes while the MCP service built.
A watcher that treats an empty CLI response as "gone" will report a result it
never observed — watch a specific deployment id, and retry on a parse failure.
