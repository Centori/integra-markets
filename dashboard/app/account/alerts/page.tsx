// /account/alerts — quota alerts, replacing the "Soon" label.
//
// SCOPE, stated because the nav's old hint said "Mirrors the mobile app": these
// are API quota alerts, not the mobile app's price and news alerts. Those are a
// different product surface with a different delivery path (Expo push to a
// registered device) and they belong in the app that receives them. What was
// missing for an API customer is a warning BEFORE their integration starts
// being refused, which is what this configures.

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase-server";
import { fetchEntitlementSummary, isApiTier, tierLabel } from "@/lib/entitlement";
import { fetchAlertsAction } from "@/app/api-keys/actions";
import AlertsForm from "./AlertsForm";

export const dynamic = "force-dynamic";

async function AlertsSection({ jwt }: { jwt: string }) {
  const { tier } = await fetchEntitlementSummary(jwt);

  const header = (
    <div>
      <h1 className="text-2xl font-semibold">Alerts</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Get told you are running out of allowance before you are refused.
      </p>
    </div>
  );

  if (!isApiTier(tier)) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-lg border border-divider bg-bg-secondary p-5 text-sm text-text-secondary">
          You&apos;re on the{" "}
          <span className="font-semibold text-text-primary">{tierLabel(tier)}</span>{" "}
          plan, which has no API allowance to alert on.{" "}
          <a className="text-accent-primary underline" href="/account/api">
            See the plans
          </a>
          .
        </div>
        <p className="text-xs text-text-muted">
          Looking for price and news alerts? Those live in the Integra mobile
          app, which delivers them as push notifications.
        </p>
      </div>
    );
  }

  let config;
  try {
    config = await fetchAlertsAction();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-lg border border-accent-negative bg-bg-secondary p-5 text-sm">
          <p className="text-text-primary">Couldn&apos;t load your alert settings.</p>
          <code className="mt-2 block break-all text-xs text-text-muted">{message}</code>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {header}

      {config.unavailable ? (
        <div className="rounded-lg border border-accent-warning/40 bg-bg-secondary p-4 text-sm text-text-secondary">
          Showing defaults — your saved settings couldn&apos;t be read just now.
          Saving will overwrite whatever is stored.
        </div>
      ) : null}

      {config.last_notified_threshold ? (
        <div className="rounded-lg border border-divider bg-bg-secondary p-4 text-sm text-text-secondary">
          Last alert sent at{" "}
          <span className="tabular-nums text-text-primary">
            {config.last_notified_threshold}%
          </span>
          {config.last_notified_period ? (
            <> for the period beginning {config.last_notified_period}</>
          ) : null}
          .
        </div>
      ) : null}

      <AlertsForm initial={config} />

      <p className="border-t border-divider pt-6 text-xs text-text-muted">
        Price and news alerts are a separate feature and live in the Integra
        mobile app. These settings only cover API quota.
      </p>
    </div>
  );
}

export default async function AlertsPage() {
  const supabase = serverClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?redirect=/account/alerts");

  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData.session?.access_token ?? "";

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Alerts</h1>
          <div className="h-40 animate-pulse rounded-lg border border-divider bg-bg-secondary" />
        </div>
      }
    >
      <AlertsSection jwt={jwt} />
    </Suspense>
  );
}
