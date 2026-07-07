// Account home — the post-login landing. Profile summary up top, then the
// settings sections. All API-related products live under /account/api.

import Link from "next/link";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase-server";
import { fetchTier, tierLabel } from "@/lib/entitlement";
import { SignOutButton } from "./SignOutButton";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = serverClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?redirect=/account");
  const user = data.user;

  const { data: sessionData } = await supabase.auth.getSession();
  const tier = await fetchTier(sessionData.session?.access_token ?? "");

  const provider = (user.app_metadata?.provider as string | undefined) ?? "email";
  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="text-text-secondary mt-1 text-sm">{user.email}</p>
          <p className="text-text-secondary mt-1 text-xs">
            Signed in with {provider === "email" ? "email" : provider}
            {joined ? ` · member since ${joined}` : ""}
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="rounded-lg border border-divider bg-bg-secondary p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Plan</h2>
            <p className="text-text-secondary mt-1 text-sm">
              You&apos;re on the{" "}
              <span className="text-text-primary font-semibold">{tierLabel(tier)}</span>{" "}
              plan.
            </p>
          </div>
          {tier !== "api" ? (
            <Link
              href="/api-tier"
              className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-bg-primary"
            >
              Upgrade
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Settings</h2>

        <Link
          href="/account/api"
          className="block rounded-lg border border-divider bg-bg-secondary p-5 hover:border-accent-primary"
        >
          <div className="font-semibold">API &amp; integrations</div>
          <p className="text-text-secondary mt-1 text-sm">
            API subscription, keys, and the Claude MCP connector — everything
            programmatic lives here.
          </p>
        </Link>

        <a
          href="mailto:contact@integramarkets.app"
          className="block rounded-lg border border-divider bg-bg-secondary p-5 hover:border-accent-primary"
        >
          <div className="font-semibold">Support</div>
          <p className="text-text-secondary mt-1 text-sm">
            Questions, billing, enterprise — contact@integramarkets.app
          </p>
        </a>
      </div>
    </div>
  );
}
