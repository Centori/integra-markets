// Server-side entitlement lookup against the Integra backend. Falls back to
// free_trial on any failure so pages render a sane default instead of 500ing.

const API_URL =
  process.env.NEXT_PUBLIC_INTEGRA_API_URL ?? "https://api.integramarkets.app";

export type EntitlementSummary = {
  tier: string;
  /**
   * The caller's Supabase UUID, as the backend sees it.
   *
   * Surfaced because it appears nowhere else a person can reach: it is what a
   * support request has to quote, and what INTEGRA_COMP_USER_IDS is keyed on.
   * Older backends do not return it, so it is optional and the UI omits the
   * row rather than rendering an empty one.
   */
  userId: string | null;
};

const FALLBACK: EntitlementSummary = { tier: "free_trial", userId: null };

export async function fetchEntitlementSummary(
  jwt: string
): Promise<EntitlementSummary> {
  if (!jwt) return FALLBACK;
  try {
    // Bounded: this runs on every /account render, and an unbounded fetch
    // here hangs the whole Vercel invocation rather than falling through to
    // the free_trial default below. The catch cannot save us — a request that
    // never settles never rejects.
    const res = await fetch(`${API_URL}/api/subscriptions/entitlement`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) {
      // Loud on purpose. This fallback made a backend outage indistinguishable
      // from a correctly locked account: PyJWT was missing from the deployed
      // image, every authenticated route answered 503, and this returned
      // free_trial — so the page rendered "upgrade to the API tier" to a user
      // who already had it, with nothing anywhere saying the API was down.
      console.error(
        `[entitlement] ${API_URL} returned ${res.status}; falling back to ` +
          `${FALLBACK.tier}. The account's real tier is unknown, not free.`
      );
      return FALLBACK;
    }
    const data = (await res.json()) as { tier?: string; user_id?: string };
    return { tier: data.tier ?? FALLBACK.tier, userId: data.user_id ?? null };
  } catch (err) {
    console.error(
      `[entitlement] lookup failed (${err instanceof Error ? err.message : err}); ` +
        `falling back to ${FALLBACK.tier}.`
    );
    return FALLBACK;
  }
}

export async function fetchTier(jwt: string): Promise<string> {
  return (await fetchEntitlementSummary(jwt)).tier;
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
