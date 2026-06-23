import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase";
import { listKeysAction } from "./actions";
import { KeysPanel } from "./KeysPanel";
import type { KeyRow } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const supabase = serverClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

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
    </div>
  );
}
