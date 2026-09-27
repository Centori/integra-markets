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

// ---- Plan limits, usage and alerts --------------------------------------

/**
 * The limits ACTUALLY enforced for the caller's plan.
 *
 * Fetched rather than written down. The subscription panel used to state
 * "100k requests / month, 100 req/sec burst" as hand-typed copy while the
 * backend enforced 50,000/month and had no per-second limiter at all — so a
 * paying customer was promised double their allowance and would have been
 * refused at half the advertised figure. These numbers now come out of the
 * constants that enforce them, which is the only way copy cannot drift.
 *
 * `null` on a depth field means unlimited: math.inf is not representable in
 * JSON, so the backend serialises it as null.
 */
type PlanLimits = {
  tier: string;
  requests_per_month: number;
  requests_per_second: number;
  burst_capacity: number;
  query_depth_days: number | null;
  export_depth_days: number | null;
  exports_per_month: number;
  export_rows_per_call: number;
  export_rows_per_call_xlsx: number;
  enforced: boolean;
  max_keys: number;
};

/**
 * Each section carries its own `available` flag. A section whose query failed
 * must render as "couldn't load", never as zero — a usage page showing 0
 * requests tells a customer their integration is dead.
 */
type UsageSection<T> = { available: boolean; rows: T[] };

type UsageKeyRow = {
  key_id: string;
  name: string;
  prefix: string;
  revoked: boolean;
  requests: number;
  errors: number;
  rate_limited: number;
  p50_ms: number | null;
  p95_ms: number | null;
  last_used_at: string | null;
};

type UsageDayRow = { day: string; requests: number; errors: number };

type UsageEndpointRow = {
  endpoint: string;
  method: string;
  requests: number;
  errors: number;
  p95_ms: number | null;
};

type UsageSummary = {
  period: { start: string; end: string; label: string };
  plan: Omit<PlanLimits, "max_keys">;
  current: {
    available: boolean;
    requests: number | null;
    errors: number | null;
    rate_limited: number | null;
    limit: number;
    remaining: number | null;
    percent_used: number | null;
    error_rate: number | null;
  };
  by_key: UsageSection<UsageKeyRow>;
  daily: UsageSection<UsageDayRow> & { window_days: number };
  by_endpoint: UsageSection<UsageEndpointRow>;
};

type AlertConfig = {
  enabled: boolean;
  thresholds: number[];
  webhook_url: string | null;
  last_notified_period: string | null;
  last_notified_threshold: number | null;
  configured: boolean;
  available_thresholds: number[];
  max_thresholds?: number;
  delivery?: string;
  unavailable?: boolean;
};

export function fetchPlanLimits(token: string) {
  return call<PlanLimits>("/api/keys/limits", { headers: authHeaders(token) });
}

export function fetchUsage(token: string) {
  return call<UsageSummary>("/api/keys/usage", { headers: authHeaders(token) });
}

export function fetchAlerts(token: string) {
  return call<AlertConfig>("/api/keys/alerts", { headers: authHeaders(token) });
}

export function saveAlerts(
  token: string,
  config: { enabled: boolean; thresholds: number[]; webhook_url: string | null }
) {
  return call<AlertConfig>("/api/keys/alerts", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(config),
  });
}

/**
 * Stripe's hosted billing portal. 409 means there is no Stripe customer on this
 * login — a comp grant, the free beta, or an App Store purchase — and the
 * message the backend returns says which, so it is shown verbatim rather than
 * replaced with a generic failure.
 */
export function createBillingPortalSession(jwt: string, returnPath = "/account/billing") {
  return call<{ url: string }>("/api/stripe/portal", {
    method: "POST",
    headers: authHeaders(jwt),
    body: JSON.stringify({ return_path: returnPath }),
  });
}

export type {
  KeyRow,
  CreateKeyResponse,
  EntitlementResponse,
  PlanLimits,
  UsageSummary,
  UsageKeyRow,
  UsageDayRow,
  UsageEndpointRow,
  AlertConfig,
};
