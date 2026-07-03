const DEFAULT_BASE = "https://api.integramarkets.app";

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
        "User-Agent": "integra-mcp/0.1.0",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 401) {
        throw new Error("Integra API key rejected. Set INTEGRA_API_KEY to a valid key from https://dashboard.integramarkets.app/api-keys");
      }
      if (res.status === 403) {
        throw new Error("Your subscription tier does not include this endpoint. Historical endpoints require the API+History tier ($249/mo). Upgrade at https://dashboard.integramarkets.app/api-tier");
      }
      throw new Error(`Integra API ${res.status}: ${text || res.statusText}`);
    }
    return res.json() as Promise<T>;
  }
}
