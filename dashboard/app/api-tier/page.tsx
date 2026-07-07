// Public API pricing page — visible WITHOUT login, like any conventional
// paid product: see the price first, sign in only to buy. Sells the "$99/mo
// programmatic access" SKU via Stripe Checkout. Mobile users never see this —
// Apple IAP handles the Basic / Basic+Markets consumer tiers.

import { serverClient } from "@/lib/supabase-server";
import { fetchTier } from "@/lib/entitlement";
import ApiTierPanel from "./ApiTierPanel";

export const dynamic = "force-dynamic";

export default async function ApiTierPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const supabase = serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Entitlement only matters for the button state; logged-out visitors just
  // see the public pricing with a "Sign in to subscribe" CTA.
  let jwt = "";
  let currentTier = "free_trial";
  if (user) {
    const session = await supabase.auth.getSession();
    jwt = session.data.session?.access_token ?? "";
    currentTier = await fetchTier(jwt);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-semibold">API Access</h1>
        <p className="mt-2 text-text-secondary">
          Programmatic access to Integra&apos;s sentiment archive, divergence signals,
          and news pipeline. Web-only — the mobile subscriptions are separate.
        </p>
      </div>

      {searchParams.success ? (
        <div className="rounded-lg border border-accent-positive bg-bg-secondary p-4 text-sm">
          Payment received — your API access is active. Head over to{" "}
          <a href="/account/api" className="text-accent-primary underline">
            API &amp; integrations
          </a>{" "}
          to create your first key.
        </div>
      ) : null}
      {searchParams.canceled ? (
        <div className="rounded-lg border border-text-secondary bg-bg-secondary p-4 text-sm">
          Checkout cancelled. Your account is unchanged.
        </div>
      ) : null}

      <ApiTierPanel currentTier={currentTier} jwt={jwt} loggedIn={Boolean(user)} />

      <div className="rounded-lg border border-accent-primary bg-bg-secondary p-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Also works with Claude — no code required</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Install the Integra MCP connector once and query commodity sentiment, prediction-market
              divergences, and historical analogs directly from Claude Desktop or Claude Code.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-text-secondary sm:grid-cols-2">
          <div>
            <div className="text-text-primary">You ask:</div>
            <p className="mt-1 italic">
              &ldquo;Give me a market brief for Brent.&rdquo;
            </p>
          </div>
          <div>
            <div className="text-text-primary">Claude returns:</div>
            <p className="mt-1">Sentiment score, top narratives, biggest AI-vs-market divergences, and price context — pulled live from Integra.</p>
          </div>
        </div>
        <a
          href="/mcp"
          className="mt-4 inline-block text-sm text-accent-primary hover:underline"
        >
          See MCP setup docs →
        </a>
      </div>

      <div className="rounded-lg border border-divider bg-bg-secondary p-6">
        <h2 className="text-lg font-semibold">What&apos;s included</h2>
        <ul className="mt-4 space-y-2 text-sm text-text-secondary">
          <li>
            <span className="text-text-primary">•</span> Full REST access:{" "}
            <code className="text-accent-primary">/v1/news</code>,{" "}
            <code className="text-accent-primary">/v1/sentiment</code>,{" "}
            <code className="text-accent-primary">/v1/markets/divergence</code>
          </li>
          <li>
            <span className="text-text-primary">•</span> 100k requests / month, 100 req/sec burst
          </li>
          <li>
            <span className="text-text-primary">•</span> Full historical sentiment archive back to launch
          </li>
          <li>
            <span className="text-text-primary">•</span> Kalshi + Polymarket divergence signals
          </li>
          <li>
            <span className="text-text-primary">•</span> Up to 10 active API keys with per-key scopes
          </li>
          <li>
            <span className="text-text-primary">•</span> Priority email support
          </li>
        </ul>
      </div>

      <p className="text-xs text-text-secondary">
        Subscriptions renew monthly. Cancel anytime from your Stripe billing portal
        (link emailed after purchase). Enterprise volume &amp; SLA — email{" "}
        <a href="mailto:contact@integramarkets.app" className="text-accent-primary underline">
          contact@integramarkets.app
        </a>
        .
      </p>
    </div>
  );
}
