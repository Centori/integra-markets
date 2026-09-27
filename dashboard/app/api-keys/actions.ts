"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase-server";
import * as api from "@/lib/api";

// Return the caller's Supabase access token (a JWT the backend verifies via
// verify_supabase_jwt). We send the token, not the user id — the backend
// derives user_id from it so a caller can only manage their OWN keys.
async function requireToken(): Promise<string> {
  const supabase = serverClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Not authenticated");
  return data.session.access_token;
}

export async function listKeysAction() {
  const token = await requireToken();
  return api.listKeys(token);
}

export async function createKeyAction(name: string) {
  if (!name.trim()) throw new Error("Name is required");
  const token = await requireToken();
  const created = await api.createKey(token, name.trim());
  revalidatePath("/api-keys");
  return created;
}

export async function revokeKeyAction(keyId: string) {
  const token = await requireToken();
  await api.revokeKey(token, keyId);
  revalidatePath("/api-keys");
}

// ---- Usage, limits, alerts and billing -----------------------------------
//
// Same shape as the key actions above: the server action holds the session and
// the browser never sees a JWT. Each throws on failure rather than returning a
// fallback, so the calling page can distinguish "no usage" from "could not read
// usage" — a Usage page that renders zero because a query failed tells a paying
// customer their integration is dead.

export async function fetchPlanLimitsAction() {
  const token = await requireToken();
  return api.fetchPlanLimits(token);
}

export async function fetchUsageAction() {
  const token = await requireToken();
  return api.fetchUsage(token);
}

export async function fetchAlertsAction() {
  const token = await requireToken();
  return api.fetchAlerts(token);
}

export async function saveAlertsAction(config: {
  enabled: boolean;
  thresholds: number[];
  webhook_url: string | null;
}) {
  const token = await requireToken();
  const saved = await api.saveAlerts(token, config);
  revalidatePath("/account/alerts");
  return saved;
}

export async function createBillingPortalSessionAction(returnPath = "/account/billing") {
  const token = await requireToken();
  const { url } = await api.createBillingPortalSession(token, returnPath);
  return url;
}
