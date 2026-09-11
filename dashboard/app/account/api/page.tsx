// The single API products page: subscription status/upgrade, key management,
// and the Claude MCP connector — embedded in account settings, exactly one
// place to look. /api-keys redirects here.
//
// STREAMED, deliberately. The previous version awaited four things in series
// before emitting a single byte:
//
//     getUser()  ->  getSession()  ->  fetchTier(jwt)  ->  listKeysAction()
//
// Measured against production, the three network hops were 0.78s + 3.07s +
// 2.53s. Time-to-first-byte was their sum, so the page showed nothing at all
// for as long as the slowest chain of upstream calls took — and the API's
// latency is highly variable (the same endpoints answered in 0.44s warm).
//
// Only the auth check has to block: it decides whether to redirect, and a
// redirect must be issued before any HTML. Everything downstream of the tier
// lookup now renders inside <Suspense>, so the header, the connector and the
// page frame paint immediately and the tier-dependent sections fill in.
//
// The tier and key fetches are NOT parallelised. `listKeysAction` is gated on
// the tier the first call returns, so firing both at once would issue a request
// for every visitor who cannot use it — trading a wasted upstream call for
// latency that streaming already removes.

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase-server";
import { fetchEntitlementSummary, isApiTier, tierLabel } from "@/lib/entitlement";
import { listKeysAction } from "@/app/api-keys/actions";
import { KeysPanel } from "@/app/api-keys/KeysPanel";
import { ConnectClaude } from "@/app/api-keys/ConnectClaude";
import ApiTierPanel from "@/app/api-tier/ApiTierPanel";
import { TryIt } from "./TryIt";
import { QuickStart } from "./QuickStart";
import type { KeyRow } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Roughly the height of the loaded panels, so the page does not jump. */
function PanelSkeleton({ label }: { label: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{label}</h2>
      <div className="h-24 animate-pulse rounded-lg border border-divider bg-bg-secondary" />
    </section>
  );
}

/**
 * Everything that depends on the tier lookup.
 *
 * Split into its own async component so React can stream it: the shell around
 * it is sent while these upstream calls are still in flight.
 */
async function TierSections({
  jwt,
  userEmail,
}: {
  jwt: string;
  userEmail: string;
}) {
  const { tier, userId } = await fetchEntitlementSummary(jwt);
  // NOT `tier === "api"`. The shipping plan is `api_basic`, so that check
  // hid the keys panel from every paying customer.
  const hasApiTier = isApiTier(tier);

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
    <>
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
              <KeysPanel initialKeys={keys} userEmail={userEmail} />
            )}
          </>
        ) : (
          <div className="rounded-lg border border-divider bg-bg-secondary p-4 text-sm text-text-secondary">
            Key management unlocks with the API tier. If you already subscribed
            and still see this, quote your account ID below — the tier is looked
            up by ID, not by email.
          </div>
        )}
      </section>

      {hasApiTier ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Test the API</h2>
          <p className="text-text-secondary text-sm">
            Fire a real request without leaving the dashboard.
          </p>
          <TryIt />
        </section>
      ) : null}

      {/* Shown at every tier. Someone deciding whether to subscribe needs to
          see what calling this actually looks like, and it costs nothing to
          show — the key is what is gated, not the shape of the request. */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Using your key</h2>
        <p className="text-text-secondary text-sm">
          Plain HTTP, no SDK to install. Any language that can set a header can
          call this.
        </p>
        <QuickStart />
      </section>

      {userId ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Account ID</h2>
          <p className="text-text-secondary text-sm">
            Quote this in any support request — it is how entitlements are
            looked up.
          </p>
          <code className="block break-all rounded-lg border border-divider bg-bg-secondary px-4 py-3 text-xs text-text-primary">
            {userId}
          </code>
        </section>
      ) : null}
    </>
  );
}

export default async function AccountApiPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const supabase = serverClient();

  // The only blocking call. It decides whether to redirect, and a redirect has
  // to be issued before any HTML is streamed.
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?redirect=/account/api");

  // Local read of the session cookie — no network round-trip.
  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData.session?.access_token ?? "";

  return (
    // Width is owned by account/layout.tsx's content column.
    <div className="space-y-10">
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

      <Suspense
        fallback={
          <>
            <PanelSkeleton label="Subscription" />
            <PanelSkeleton label="API keys" />
          </>
        }
      >
        <TierSections jwt={jwt} userEmail={data.user.email ?? ""} />
      </Suspense>

      {/* Static — no upstream dependency, so it renders with the shell rather
          than waiting behind the tier lookup. */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Claude MCP connector</h2>
        <ConnectClaude />
      </section>
    </div>
  );
}
