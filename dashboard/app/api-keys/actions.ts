"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase-server";
import * as api from "@/lib/api";

async function requireUserId(): Promise<string> {
  const supabase = serverClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function listKeysAction() {
  const userId = await requireUserId();
  return api.listKeys(userId);
}

export async function createKeyAction(name: string) {
  if (!name.trim()) throw new Error("Name is required");
  const userId = await requireUserId();
  const created = await api.createKey(userId, name.trim());
  revalidatePath("/api-keys");
  return created;
}

export async function revokeKeyAction(keyId: string) {
  const userId = await requireUserId();
  await api.revokeKey(userId, keyId);
  revalidatePath("/api-keys");
}
