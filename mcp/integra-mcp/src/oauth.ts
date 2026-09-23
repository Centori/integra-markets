/**
 * Just enough OAuth 2.1 for a connector dialog that offers nothing else.
 *
 * Claude.ai's custom-connector UI has a URL field and an OAuth section. There
 * is no place to put a static request header, so a server authenticated by
 * `Authorization: Bearer ik_live_…` cannot be configured there at all — the
 * instructions on the dashboard described a field that does not exist, and a
 * user following them picked an auth mode that sent Claude hunting for OAuth
 * metadata we did not serve.
 *
 * So the metadata exists now. What sits behind it is not an identity provider:
 * the "sign-in" page asks for an Integra API key, checks it against the API,
 * and hands back a token that carries that key. Claude runs the flow it knows;
 * the user pastes the one secret they actually have.
 *
 * STATELESS BY CONSTRUCTION. Authorization codes, access tokens and client ids
 * are all sealed blobs — AES-256-GCM under a server secret — rather than rows
 * in a table. Railway can run more than one replica, and an authorization code
 * held in one process's memory would be redeemed against another and fail
 * perhaps half the time. Intermittent auth failures are the worst kind to
 * diagnose, and this removes the possibility rather than making it unlikely.
 *
 * WHAT THE SEALING BUYS. The code travels through the user's browser to
 * Claude's callback, and it contains an API key. Signing it would let anyone
 * who sees it read the key; encrypting means the ciphertext is opaque to
 * everyone but this server. PKCE then binds the code to the client that asked
 * for it, so possession of the code alone is not enough to redeem it.
 *
 * WHAT IT DOES NOT BUY. Codes cannot be made single-use without storage, so
 * they are instead very short-lived (60 seconds) and PKCE-bound. That is the
 * one place this differs from a stateful authorization server, and it is a
 * deliberate trade, not an oversight.
 *
 * OFF UNLESS CONFIGURED. Every entry point here returns null when
 * MCP_OAUTH_SECRET is unset, and the HTTP layer then behaves exactly as it did
 * before: no OAuth advertised, no discovery, keys by header only. A half-built
 * auth server that answers discovery and then fails to issue tokens is worse
 * than none, because the client commits to the flow before finding out.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const CODE_TTL_S = 60;
const ACCESS_TTL_S = 90 * 24 * 60 * 60;
const REFRESH_TTL_S = 365 * 24 * 60 * 60;

export const OAUTH_PATHS = {
  protectedResource: "/.well-known/oauth-protected-resource",
  authorizationServer: "/.well-known/oauth-authorization-server",
  register: "/register",
  authorize: "/authorize",
  token: "/token",
} as const;

/** The signing/encryption secret, or null when OAuth is switched off. */
export function oauthSecret(): string | null {
  const secret = (process.env.MCP_OAUTH_SECRET ?? "").trim();
  return secret.length >= 16 ? secret : null;
}

export function oauthEnabled(): boolean {
  return oauthSecret() !== null;
}

/**
 * The public origin this server is reached at.
 *
 * Must be the address the USER's client is talking to, not the container's own
 * hostname: every URL in the discovery documents is followed by the client, and
 * an internal hostname would send it somewhere it cannot reach. Taken from the
 * request's Host header, with MCP_PUBLIC_ORIGIN as an override for deployments
 * behind a proxy that rewrites it.
 */
export function publicOrigin(hostHeader: string | undefined, forwardedProto?: string): string {
  const override = (process.env.MCP_PUBLIC_ORIGIN ?? "").trim();
  if (override) return override.replace(/\/$/, "");
  const host = hostHeader ?? "localhost";
  const proto = forwardedProto || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

// --- sealed blobs ----------------------------------------------------------

type SealedKind = "client" | "code" | "access" | "refresh";

interface SealedPayload {
  k: SealedKind;
  exp: number;
  [field: string]: unknown;
}

function cipherKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

function seal(secret: string, payload: SealedPayload): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cipherKey(secret), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

function unseal(secret: string, blob: string, expected: SealedKind): SealedPayload | null {
  const parts = blob.split(".");
  if (parts.length !== 3) return null;
  try {
    const [iv, tag, body] = parts.map((p) => Buffer.from(p, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", cipherKey(secret), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
    const payload = JSON.parse(plain) as SealedPayload;
    // The kind check is why one secret can mint four different things safely:
    // an access token replayed as an authorization code is refused here rather
    // than being decrypted successfully and treated as whatever it arrived as.
    if (payload.k !== expected) return null;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    // Wrong secret, tampered ciphertext, or not a blob at all. All one answer.
    return null;
  }
}

function expiry(seconds: number): number {
  return Math.floor(Date.now() / 1000) + seconds;
}

// --- dynamic client registration (RFC 7591) --------------------------------

/**
 * Register a client. Every caller is accepted; the registration exists to pin
 * the redirect URIs, which is the only part a later step needs to trust.
 *
 * The client_id IS the registration — a sealed list of redirect URIs — so
 * /authorize can check the URI it was handed against the ones the client
 * registered without looking anything up.
 */
export function registerClient(redirectUris: string[]): { client_id: string } | null {
  const secret = oauthSecret();
  if (!secret) return null;
  const uris = redirectUris.filter((u) => typeof u === "string" && u.length > 0);
  if (uris.length === 0) return null;
  return {
    client_id: seal(secret, { k: "client", exp: expiry(REFRESH_TTL_S), uris }),
  };
}

export function registeredRedirectUris(clientId: string): string[] | null {
  const secret = oauthSecret();
  if (!secret) return null;
  const payload = unseal(secret, clientId, "client");
  const uris = payload?.uris;
  return Array.isArray(uris) ? (uris as string[]) : null;
}

// --- authorization codes ---------------------------------------------------

export function issueCode(apiKey: string, codeChallenge: string, redirectUri: string): string | null {
  const secret = oauthSecret();
  if (!secret) return null;
  return seal(secret, {
    k: "code",
    exp: expiry(CODE_TTL_S),
    key: apiKey,
    cc: codeChallenge,
    ru: redirectUri,
  });
}

/** PKCE S256: the verifier must hash to the challenge the code was bound to. */
function pkceMatches(challenge: string, verifier: string): boolean {
  const computed = createHash("sha256").update(verifier, "utf8").digest("base64url");
  const a = Buffer.from(computed);
  const b = Buffer.from(challenge);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface TokenSet {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
}

export function redeemCode(
  code: string,
  codeVerifier: string,
  redirectUri: string
): TokenSet | { error: string } {
  const secret = oauthSecret();
  if (!secret) return { error: "server_error" };

  const payload = unseal(secret, code, "code");
  if (!payload) return { error: "invalid_grant" };
  if (payload.ru !== redirectUri) return { error: "invalid_grant" };
  if (!pkceMatches(String(payload.cc), codeVerifier)) return { error: "invalid_grant" };

  return issueTokens(secret, String(payload.key));
}

export function redeemRefresh(refreshToken: string): TokenSet | { error: string } {
  const secret = oauthSecret();
  if (!secret) return { error: "server_error" };
  const payload = unseal(secret, refreshToken, "refresh");
  if (!payload) return { error: "invalid_grant" };
  return issueTokens(secret, String(payload.key));
}

function issueTokens(secret: string, apiKey: string): TokenSet {
  return {
    access_token: seal(secret, { k: "access", exp: expiry(ACCESS_TTL_S), key: apiKey }),
    token_type: "Bearer",
    expires_in: ACCESS_TTL_S,
    refresh_token: seal(secret, { k: "refresh", exp: expiry(REFRESH_TTL_S), key: apiKey }),
  };
}

/**
 * The Integra API key behind a bearer value, whichever form it arrived in.
 *
 * Raw `ik_live_…` keys keep working: stdio users set one in their config, and
 * any client that CAN send a header should not be forced through a browser
 * flow to do it. Only tokens this server sealed take the decryption path.
 */
export function resolveApiKey(bearer: string): string | null {
  if (bearer.startsWith("ik_live_")) return bearer;
  const secret = oauthSecret();
  if (!secret) return null;
  const payload = unseal(secret, bearer, "access");
  return payload ? String(payload.key) : null;
}

// --- discovery documents ---------------------------------------------------

export function protectedResourceMetadata(origin: string): Record<string, unknown> {
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
  };
}

export function authorizationServerMetadata(origin: string): Record<string, unknown> {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}${OAUTH_PATHS.authorize}`,
    token_endpoint: `${origin}${OAUTH_PATHS.token}`,
    registration_endpoint: `${origin}${OAUTH_PATHS.register}`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    // PKCE is mandatory, and S256 is the only method offered: "plain" exists in
    // the spec for clients that cannot hash, and every client that can reach
    // this server can hash.
    code_challenge_methods_supported: ["S256"],
    // Public clients only. There is no client secret to check because the
    // registration is not a credential — the user's API key is.
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp"],
  };
}
