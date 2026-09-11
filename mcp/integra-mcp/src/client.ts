const DEFAULT_BASE = "https://api.integramarkets.app";

// Kept in step with package.json / server.ts by the release process.
const CLIENT_VERSION = "0.2.0";

/** Pull FastAPI's {"detail": "..."} out of an error body, if present. */
function extractDetail(text: string): string | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as { detail?: unknown };
    if (typeof parsed.detail === "string" && parsed.detail.trim()) {
      return parsed.detail.trim();
    }
  } catch {
    // Not JSON — fall through and let the caller use the raw text.
  }
  return null;
}

export class IntegraClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = (baseUrl ?? process.env.INTEGRA_API_URL ?? DEFAULT_BASE).replace(/\/$/, "");
  }

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const qs = params
      ? "?" + Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    return this.request<T>("GET", `${path}${qs}`);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": `integra-mcp/${CLIENT_VERSION}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const detail = extractDetail(text);

      if (res.status === 401) {
        throw new Error(
          "Integra API key rejected. Set INTEGRA_API_KEY to a valid key from https://dashboard.integramarkets.app/api-keys"
        );
      }
      if (res.status === 403) {
        // Deliberately does NOT quote a price. The old message advertised an
        // "API+History tier ($249/mo)" that was dropped from launch, so users
        // were being shown a plan they could not buy. The server's own detail
        // is authoritative and stays current without a client release.
        throw new Error(
          detail ??
            "Your subscription tier does not include this endpoint. " +
              "See https://dashboard.integramarkets.app/api-tier"
        );
      }
      if (res.status === 429) {
        // The API meters requests per calendar month. Say so plainly and name
        // the reset, so the model reports a quota problem to the user instead
        // of treating it as a transient error and retrying into the wall.
        const reset = res.headers.get("x-ratelimit-reset");
        const when = reset
          ? new Date(Number(reset) * 1000).toISOString().slice(0, 10)
          : "the start of next month";
        throw new Error(
          `${detail ?? "Monthly request limit reached for your Integra plan."} ` +
            `Do not retry — the allowance resets on ${when}. ` +
            `Raise it at https://dashboard.integramarkets.app/api-tier`
        );
      }
      if (res.status === 501) {
        // A feature that exists in the tool list but not yet on the server.
        // Surfacing "not built yet" beats a raw 501 the model will try to
        // work around.
        throw new Error(
          `${detail ?? "This endpoint is not available yet."} ` +
            "This capability is still being built — no action needed on your side."
        );
      }
      throw new Error(`Integra API ${res.status}: ${detail ?? text ?? res.statusText}`);
    }
    return res.json() as Promise<T>;
  }
}
