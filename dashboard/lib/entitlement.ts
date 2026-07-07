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

export function tierLabel(tier: string): string {
  switch (tier) {
    case "api":
      return "API";
    case "basic":
      return "Basic";
    case "basic_markets":
      return "Basic + Markets";
    default:
      return "Free trial";
  }
}
