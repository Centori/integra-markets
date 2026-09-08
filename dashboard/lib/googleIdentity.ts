/**
 * Google sign-in without the Supabase redirect.
 *
 * The redirect flow sends the browser to
 * `https://<project>.supabase.co/auth/v1/authorize`, so Google's consent screen
 * shows **zhdcpiopihqwcmicjpca.supabase.co** — the project's generated
 * hostname, not the product's. That is what a user sees when they sign in on
 * the web today.
 *
 * The mobile app does not have this problem, and its own source says why
 * (app/services/authService.ts):
 *
 *     "On iOS we use the native Google Sign-In SDK — pops the iOS account
 *      picker sheet, returns an idToken without ever opening a browser, then
 *      exchanges it for a Supabase session via signInWithIdToken. Result: the
 *      user never sees the Supabase project URL... On web we fall back to
 *      Supabase's redirect-based OAuth (no native SDK available there)."
 *
 * There is a web equivalent: Google Identity Services returns an ID token
 * in-page, with no navigation. The token then goes through the *same*
 * `signInWithIdToken({ provider: "google" })` call the mobile app already uses,
 * so both platforms converge on one code path and the consent screen shows the
 * origin the user is actually on.
 *
 * NONCE. Google is given the SHA-256 hash of a random nonce; Supabase is given
 * the raw value and re-hashes it to compare. Sending the same string to both
 * makes the check tautological, which is the usual way this is got wrong.
 */

const GIS_SRC = "https://accounts.google.com/gsi/client";

/** Set per environment. Absent means the redirect flow stays in use. */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export type GoogleNonce = { raw: string; hashed: string };

/**
 * A nonce and its SHA-256 hash, hex-encoded.
 *
 * Uses crypto.randomUUID and SubtleCrypto — both available in every browser
 * that can run this dashboard, and neither needs a dependency.
 */
export async function createNonce(): Promise<GoogleNonce> {
  const raw = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw)
  );
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

let scriptPromise: Promise<void> | null = null;

/**
 * Load the GIS script once.
 *
 * Rejects rather than hanging if it cannot load — an ad blocker or a
 * restrictive network will block accounts.google.com, and the caller needs to
 * know so it can fall back to the redirect rather than leaving a button that
 * spins forever.
 */
export function loadGoogleIdentity(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("google identity: not in a browser"));
  }
  if ((window as any).google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`
    );
    const script = existing ?? document.createElement("script");
    const done = () =>
      (window as any).google?.accounts?.id
        ? resolve()
        : reject(new Error("google identity: script loaded but API missing"));

    script.addEventListener("load", done, { once: true });
    script.addEventListener(
      "error",
      () => {
        // Allow a later retry — a blocked request now may succeed after the
        // user disables a blocker, and a permanently rejected promise would
        // make the button dead for the rest of the session.
        scriptPromise = null;
        reject(new Error("google identity: script blocked or unreachable"));
      },
      { once: true }
    );

    if (!existing) {
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return scriptPromise;
}

/**
 * Prompt for a Google account and resolve with the returned ID token.
 *
 * `prompt()` shows One Tap. It is dismissible and can be suppressed entirely by
 * browser settings or a previous dismissal, so `onUnavailable` fires and the
 * caller falls back rather than the user pressing a button that does nothing.
 */
export function requestGoogleIdToken(
  clientId: string,
  nonce: GoogleNonce,
  onUnavailable: (reason: string) => void
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const id = (window as any).google?.accounts?.id;
    if (!id) return reject(new Error("google identity: not initialised"));

    id.initialize({
      client_id: clientId,
      nonce: nonce.hashed,
      callback: (response: { credential?: string }) => {
        if (response?.credential) resolve(response.credential);
        else reject(new Error("google identity: no credential returned"));
      },
      // The token is exchanged for a Supabase session immediately; there is
      // nothing to auto-select into on a later visit.
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    id.prompt((notification: any) => {
      if (
        notification?.isNotDisplayed?.() ||
        notification?.isSkippedMoment?.() ||
        notification?.isDismissedMoment?.()
      ) {
        onUnavailable(
          notification?.getNotDisplayedReason?.() ??
            notification?.getSkippedReason?.() ??
            notification?.getDismissedReason?.() ??
            "dismissed"
        );
      }
    });
  });
}
