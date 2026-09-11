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


// Vercel kills a serverless invocation at its wall-clock limit. A `fetch`
// with no timeout does not fail — it hangs, and takes the whole function down
// with it, which surfaces to the user as:
//
//     504: GATEWAY_TIMEOUT  /  FUNCTION_INVOCATION_TIMEOUT
//
// A try/catch does not help here: a request that never settles never rejects,
// so the catch never runs. The only thing that bounds it is an abort signal.
//
// 8s is chosen against observed backend latency (~0.5-0.9s for /health and
// /v1) with generous headroom for a cold Railway container, while still
// leaving room inside Vercel's limit to render an error rather than be killed.
const UPSTREAM_TIMEOUT_MS = 8_000;

export class UpstreamTimeoutError extends Error {
  constructor(path: string) {
    super(
      `The Integra API did not respond within ${UPSTREAM_TIMEOUT_MS / 1000}s (${path}).`
    );
    this.name = "UpstreamTimeoutError";
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    // AbortSignal.timeout rejects with a TimeoutError DOMException. Translate
    // it so the page shows "the API is slow" instead of a bare "aborted".
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new UpstreamTimeoutError(path);
    }
    throw err;
  }
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
