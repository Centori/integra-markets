"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase";
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
