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

// The backend derives user_id from the Supabase JWT (verify_supabase_jwt), so
// every call carries the caller's access token as a Bearer header. user_id is
// NEVER sent in the body/query — that path was spoofable.
function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export function listKeys(token: string) {
  return call<KeyRow[]>("/api/keys", { headers: authHeaders(token) });
}

export function createKey(token: string, name: string) {
  return call<CreateKeyResponse>("/api/keys", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  });
}

export function revokeKey(token: string, keyId: string) {
  return call<{ status: string; id: string }>(
    `/api/keys/${encodeURIComponent(keyId)}`,
    { method: "DELETE", headers: authHeaders(token) }
  );
}

// ---- Subscription tier ---------------------------------------------------

type EntitlementResponse = {
  tier: "free_trial" | "basic" | "basic_markets" | "api" | "expired";
  limits: Record<string, unknown>;
};

export function fetchEntitlement(jwt: string) {
  return call<EntitlementResponse>("/api/subscriptions/entitlement", {
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

export function createStripeCheckout(jwt: string, tier: "api" = "api") {
  return call<{ url: string; session_id: string }>("/api/stripe/checkout", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ tier }),
  });
}

export type { KeyRow, CreateKeyResponse, EntitlementResponse };
