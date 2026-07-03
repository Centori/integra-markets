import Link from "next/link";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase";
import { listKeysAction } from "./actions";
import { KeysPanel } from "./KeysPanel";
import { ConnectClaude } from "./ConnectClaude";
import type { KeyRow } from "@/lib/api";

export const dynamic = "force-dynamic";

async function fetchTier(jwt: string): Promise<string> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_INTEGRA_API_URL ?? "https://api.integramarkets.app"}/api/subscriptions/entitlement`,
      { headers: { Authorization: `Bearer ${jwt}` }, cache: "no-store" }
    );
    if (!res.ok) return "free_trial";
    const data = (await res.json()) as { tier?: string };
    return data.tier ?? "free_trial";
  } catch {
    return "free_trial";
  }
}

export default async function ApiKeysPage() {
  const supabase = serverClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData.session?.access_token ?? "";
  const tier = await fetchTier(jwt);

  // Gate: only paying API-tier customers can manage keys. Others see the
  // upgrade card that routes to /api-tier for the Stripe purchase flow.
  if (tier !== "api") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold">API keys</h1>
          <p className="text-text-secondary mt-1">
            API keys are available on the API tier.
          </p>
        </div>
        <div className="rounded-lg border border-divider bg-bg-secondary p-6 text-sm">
          <p>
            Your account is currently on the{" "}
            <span className="text-text-primary font-semibold">
              {tier === "free_trial" ? "free trial" : tier.replace("_", " + ")}
            </span>{" "}
            plan. To create programmatic keys and access the REST API, subscribe
            to the API tier.
          </p>
          <Link
            href="/api-tier"
            className="mt-4 inline-block rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-bg-primary"
          >
            See API tier — $99/mo
          </Link>
        </div>
      </div>
    );
  }

  let keys: KeyRow[] = [];
  let fetchError: string | null = null;
  try {
    keys = await listKeysAction();
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load keys";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">API keys</h1>
        <p className="text-text-secondary mt-1">
          Create keys to authenticate API requests. Each key is shown once at
          creation — copy it then. You can have up to 10 active keys.
        </p>
      </div>
      {fetchError ? (
        <div className="rounded-lg border border-accent-negative bg-bg-secondary p-4 text-sm">
          Couldn&apos;t load keys: {fetchError}
        </div>
      ) : null}
      <KeysPanel initialKeys={keys} userEmail={data.user.email ?? ""} />
      <ConnectClaude />
    </div>
  );
}
