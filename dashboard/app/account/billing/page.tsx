// /account/billing — replaces "Soon", and replaces the instruction it used to
// carry on /account/api:
//
//     "Manage or cancel from the Stripe billing portal link emailed after
//      purchase."
//
// That is not a billing page. Those links expire, so a customer who has lost
// the email had no route to an invoice, a card update or a cancellation short
// of emailing support — which for a subscription sold in the EU/UK is also a
// cancellation path they are entitled to be able to find. The portal session is
// now created on demand from the stripe_customer_id the webhook already stores.

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase-server";
import { fetchEntitlementSummary, isApiTier, tierLabel } from "@/lib/entitlement";
import { fetchPlanLimitsAction } from "@/app/api-keys/actions";
import ApiTierPanel from "@/app/api-tier/ApiTierPanel";
import BillingPortalButton from "./BillingPortalButton";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 bg-bg-secondary px-4 py-3">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="tabular-nums text-sm text-text-primary">{value}</dd>
    </div>
  );
}

async function BillingSection({ jwt }: { jwt: string }) {
  const { tier } = await fetchEntitlementSummary(jwt);
  const paid = isApiTier(tier) && tier !== "api_trial";

  // Best-effort: the plan table is useful but must not be able to break the
  // page whose main job is the cancellation button.
  let limits: Awaited<ReturnType<typeof fetchPlanLimitsAction>> | null = null;
  if (isApiTier(tier)) {
    try {
      limits = await fetchPlanLimitsAction();
    } catch {
      limits = null;
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Your plan, and where to change it.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Current plan</h2>
        <dl className="grid gap-px overflow-hidden rounded-lg border border-divider bg-divider">
          <Row label="Plan" value={tierLabel(tier)} />
          {limits ? (
            <>
              <Row label="Requests / month" value={limits.requests_per_month.toLocaleString()} />
              <Row label="Requests / second per key" value={`${limits.requests_per_second}`} />
              <Row
                label="History depth"
                value={
                  limits.query_depth_days === null
                    ? "Full archive"
                    : `${limits.query_depth_days} days`
                }
              />
              <Row label="Active keys allowed" value={`${limits.max_keys}`} />
            </>
          ) : null}
        </dl>
        {isApiTier(tier) ? (
          <p className="text-xs text-text-muted">
            Read from the limits the API enforces, so what you see here is what
            you get.{" "}
            <a className="text-accent-primary underline" href="/account/usage">
              See this month&apos;s usage
            </a>
            .
          </p>
        ) : null}
      </section>

      {tier === "api_trial" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Beta access</h2>
          <div className="rounded-lg border border-divider bg-bg-secondary p-5 text-sm text-text-secondary">
            You&apos;re on the free beta — there is nothing to bill, and no card
            on file. Subscribe below whenever you need the higher allowance or
            deeper history.
          </div>
          <ApiTierPanel currentTier={tier} jwt={jwt} loggedIn />
        </section>
      ) : null}

      {paid ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Invoices and payment method</h2>
          <BillingPortalButton />
        </section>
      ) : null}

      {!isApiTier(tier) ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Plans</h2>
          <ApiTierPanel currentTier={tier} jwt={jwt} loggedIn />
          <p className="text-xs text-text-muted">
            Already subscribed and still seeing this? Entitlements are looked up
            by account ID, not by email — quote the ID from{" "}
            <a className="text-accent-primary underline" href="/account/api">
              API &amp; integrations
            </a>{" "}
            in any support request.
          </p>
        </section>
      ) : null}
    </div>
  );
}

export default async function BillingPage() {
  const supabase = serverClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?redirect=/account/billing");

  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData.session?.access_token ?? "";

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Billing</h1>
          <div className="h-40 animate-pulse rounded-lg border border-divider bg-bg-secondary" />
        </div>
      }
    >
      <BillingSection jwt={jwt} />
    </Suspense>
  );
}
