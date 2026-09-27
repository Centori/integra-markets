// /account/usage — real request metering, replacing the "Soon" placeholder.
//
// The data behind this page has existed since launch: api_key_usage has a row
// for every authenticated request. Nothing read it. Two things had to change
// before it could be shown — the grouping had to move into Postgres (PostgREST
// disables aggregates and caps responses at 1,000 rows, so "fetch and group in
// Python" silently summarises an arbitrary subset), and status_code had to
// actually be written, which needed the usage log to move out of the auth
// dependency and into middleware. See supabase/migrations/20260927 and
// backend/services/usage_recorder.py.
//
// Streamed, for the same reason /account/api is: the upstream call is on a
// variable-latency backend, and blocking the first byte on it showed a blank
// page for as long as the slowest hop took.

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase-server";
import { fetchEntitlementSummary, isApiTier, tierLabel } from "@/lib/entitlement";
import { fetchUsageAction } from "@/app/api-keys/actions";
import UsageView from "./UsageView";

export const dynamic = "force-dynamic";

async function UsageSection({ jwt }: { jwt: string }) {
  const { tier } = await fetchEntitlementSummary(jwt);

  if (!isApiTier(tier)) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Usage</h1>
        <div className="rounded-lg border border-divider bg-bg-secondary p-5 text-sm text-text-secondary">
          You&apos;re on the{" "}
          <span className="font-semibold text-text-primary">{tierLabel(tier)}</span>{" "}
          plan, which has no API allowance to report. Request metering appears
          here once you have API access —{" "}
          <a className="text-accent-primary underline" href="/account/api">
            see the plans
          </a>
          .
        </div>
      </div>
    );
  }

  try {
    const usage = await fetchUsageAction();
    return <UsageView usage={usage} />;
  } catch (err) {
    // Shown rather than swallowed. A usage page that renders zeros because the
    // upstream call failed tells a paying customer their integration is dead.
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Usage</h1>
        <div className="rounded-lg border border-accent-negative bg-bg-secondary p-5 text-sm">
          <p className="text-text-primary">Couldn&apos;t load usage.</p>
          <p className="mt-1 text-text-secondary">
            This is a reporting failure — your requests are metered on a separate
            path and are unaffected.
          </p>
          <code className="mt-3 block break-all text-xs text-text-muted">{message}</code>
        </div>
      </div>
    );
  }
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Usage</h1>
      <div className="h-28 animate-pulse rounded-lg border border-divider bg-bg-secondary" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-divider bg-bg-secondary" />
        ))}
      </div>
    </div>
  );
}

export default async function UsagePage() {
  const supabase = serverClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?redirect=/account/usage");

  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData.session?.access_token ?? "";

  return (
    <Suspense fallback={<Skeleton />}>
      <UsageSection jwt={jwt} />
    </Suspense>
  );
}
