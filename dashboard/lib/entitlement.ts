// Server-side entitlement lookup against the Integra backend. Falls back to
// free_trial on any failure so pages render a sane default instead of 500ing.

const API_URL =
  process.env.NEXT_PUBLIC_INTEGRA_API_URL ?? "https://api.integramarkets.app";

export async function fetchTier(jwt: string): Promise<string> {
  if (!jwt) return "free_trial";
  try {
    const res = await fetch(`${API_URL}/api/subscriptions/entitlement`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    });
    if (!res.ok) return "free_trial";
    const data = (await res.json()) as { tier?: string };
    return data.tier ?? "free_trial";
  } catch {
    return "free_trial";
  }
}

// Every tier the backend can return that grants programmatic access.
//
// The dashboard used to gate on `tier === "api"` alone. The backend actually
// issues `api_basic` (the shipping $99 plan), `api_trial` and `api_history` —
// so a paying api_basic customer was told "Key management unlocks with the API
// tier" and could not see, create or revoke their own keys. tierLabel had no
// case for them either, so the same customer was shown "Free trial".
//
// Kept as a set rather than an equality check so adding a tier is one edit
// here instead of a hunt through pages.
const API_TIERS = new Set(["api", "api_basic", "api_history", "api_trial"]);

export function isApiTier(tier: string): boolean {
  return API_TIERS.has(tier);
}

export function tierLabel(tier: string): string {
  switch (tier) {
    case "api":
      return "API";
    case "api_basic":
      return "API";
    case "api_history":
      return "API + History";
    case "api_trial":
      return "API trial";
    case "basic":
      return "Basic";
    case "basic_markets":
      return "Basic + Markets";
    case "free_trial":
      return "Free trial";
    default:
      return "Free";
  }
}
