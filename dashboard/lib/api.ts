const API_BASE = process.env.NEXT_PUBLIC_INTEGRA_API_URL ?? "https://api.integramarkets.app";

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
};

type CreateKeyResponse = KeyRow & { key: string };

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function listKeys(userId: string) {
  return call<KeyRow[]>(`/api/keys?user_id=${encodeURIComponent(userId)}`);
}

export function createKey(userId: string, name: string) {
  return call<CreateKeyResponse>("/api/keys", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, name }),
  });
}

export function revokeKey(userId: string, keyId: string) {
  return call<{ revoked: true }>(
    `/api/keys/${encodeURIComponent(keyId)}?user_id=${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  );
}

export type { KeyRow, CreateKeyResponse };
