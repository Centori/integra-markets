// The single API products page: subscription status/upgrade, key management,
// and the Claude MCP connector — embedded in account settings, exactly one
// place to look. /api-keys redirects here.

import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase-server";
import { fetchTier, tierLabel } from "@/lib/entitlement";
import { listKeysAction } from "@/app/api-keys/actions";
import { KeysPanel } from "@/app/api-keys/KeysPanel";
import { ConnectClaude } from "@/app/api-keys/ConnectClaude";
import ApiTierPanel from "@/app/api-tier/ApiTierPanel";
import type { KeyRow } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function AccountApiPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const supabase = serverClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?redirect=/account/api");

  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData.session?.access_token ?? "";
  const tier = await fetchTier(jwt);
  const hasApiTier = tier === "api";

  let keys: KeyRow[] = [];
  let fetchError: string | null = null;
  if (hasApiTier) {
    try {
      keys = await listKeysAction();
    } catch (err) {
      fetchError = err instanceof Error ? err.message : "Failed to load keys";
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 py-8">
      <div>
        <h1 className="text-2xl font-semibold">API &amp; integrations</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Your subscription, API keys, and the Claude connector in one place.
        </p>
      </div>

      {searchParams.success ? (
        <div className="rounded-lg border border-accent-positive bg-bg-secondary p-4 text-sm">
          Payment received — your API access is active. Create your first key below.
        </div>
      ) : null}
      {searchParams.canceled ? (
        <div className="rounded-lg border border-text-secondary bg-bg-secondary p-4 text-sm">
          Checkout cancelled. Your account is unchanged.
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Subscription</h2>
        {hasApiTier ? (
          <div className="rounded-lg border border-accent-positive bg-bg-secondary p-6 text-sm">
            <span className="font-semibold text-text-primary">API tier active.</span>{" "}
            100k requests / month, 100 req/sec burst, up to 10 keys. Manage or
            cancel from the Stripe billing portal link emailed after purchase.
          </div>
        ) : (
          <>
            <p className="text-text-secondary text-sm">
              You&apos;re on the{" "}
              <span className="text-text-primary font-semibold">{tierLabel(tier)}</span>{" "}
              plan. Programmatic access needs the API tier.
            </p>
            <ApiTierPanel currentTier={tier} jwt={jwt} loggedIn />
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">API keys</h2>
        {hasApiTier ? (
          <>
            <p className="text-text-secondary text-sm">
              Each key is shown once at creation — copy it then. Up to 10 active keys.
            </p>
            {fetchError ? (
              <div className="rounded-lg border border-accent-negative bg-bg-secondary p-4 text-sm">
                Couldn&apos;t load keys: {fetchError}
              </div>
            ) : (
              <KeysPanel initialKeys={keys} userEmail={data.user.email ?? ""} />
            )}
          </>
        ) : (
          <div className="rounded-lg border border-divider bg-bg-secondary p-4 text-sm text-text-secondary">
            Key management unlocks with the API tier.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Claude MCP connector</h2>
        <ConnectClaude />
      </section>
    </div>
  );
}
