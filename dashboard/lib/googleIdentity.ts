/**
 * Google sign-in without the Supabase redirect.
 *
 * The redirect flow sends the browser to
 * `https://<project>.supabase.co/auth/v1/authorize`, so Google's consent screen
 * shows **zhdcpiopihqwcmicjpca.supabase.co** — the project's generated
 * hostname, not the product's. Verified live on 2026-09-10:
 *
 *     GET /auth/v1/authorize?provider=google  ->  302 accounts.google.com
 *       client_id    1039046627332-btsk2dvtdui7onof4tieaqvk3koq99fo…
 *       redirect_uri https://zhdcpiopihqwcmicjpca.supabase.co/auth/v1/callback
 *
 * Google Identity Services returns an ID token in-page instead, with no
 * navigation. The token goes through `signInWithIdToken({ provider: "google" })`
 * — the same exchange the iOS build performs with the token from the native
 * sheet — so the consent screen names the origin the user is actually on.
 *
 * WHICH GOOGLE CLIENT. The client above is a **Web application** client, and it
 * is the one to use here: it is already the Google provider's configured client
 * in Supabase (proven by the probe above), so Supabase accepts its ID tokens
 * with nothing further added to "Authorized Client IDs". The iOS client that
 * app.json registers — 1039046627332-nk0jejccajfd9u63p5kas0l5ps53nlsq, via
 * `iosUrlScheme` — is a different client and cannot serve this flow: an
 * iOS-type OAuth client has no Authorized JavaScript origins field at all.
 * Configuring Google for the mobile app therefore does not carry over to the
 * web; the origin has to be added to the *web* client.
 *
 * NONCE. Google is given the SHA-256 hash of a random nonce; Supabase is given
 * the raw value and re-hashes it to compare. Sending the same string to both
 * makes the check tautological, which is the usual way this is got wrong.
 *
 * ONE TAP IS NOT USED. The first version of this file called
 * `google.accounts.id.prompt()`. Two problems, one of them fatal:
 *
 *   1. `prompt()` reports suppression through a notification callback, not
 *      through the promise. The caller awaited a promise that, on every
 *      suppressed path, never settled — so a user whose One Tap was in
 *      cooldown got a button stuck on "Redirecting…" forever. The fallback the
 *      design promised could not run, because nothing ever returned.
 *   2. One Tap is suppressed by design after a dismissal, and Chrome now
 *      routes it through FedCM, which deprecates the very notification methods
 *      that were being read. The pretty prompt would have appeared once and
 *      then quietly stopped appearing.
 *
 * `renderButton` has neither property. It is a click on a real Google button,
 * it is not rate-limited, and — closest to the point — it is the web analogue
 * of what mobile does: tap, account sheet, token.
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

/** Google rejects widths outside this range. */
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

/**
 * How long to wait for the button to appear before giving up on GIS.
 *
 * An unauthorised JavaScript origin is the case this exists for: GIS accepts
 * `renderButton`, logs its complaint to the console, and simply never fills the
 * container. Nothing rejects and no callback fires, so without a deadline the
 * page would sit on an empty space where a sign-in button belongs.
 */
const RENDER_TIMEOUT_MS = 4000;

function waitForButton(container: HTMLElement): Promise<void> {
  if (container.childElementCount > 0) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const observer = new MutationObserver(() => {
      if (container.childElementCount > 0) {
        clearTimeout(timer);
        observer.disconnect();
        resolve();
      }
    });
    const timer = setTimeout(() => {
      observer.disconnect();
      reject(
        new Error(
          "google identity: button did not render within " +
            `${RENDER_TIMEOUT_MS}ms — the usual cause is that this origin ` +
            "is not listed under Authorized JavaScript origins on the web " +
            "OAuth client"
        )
      );
    }, RENDER_TIMEOUT_MS);
    observer.observe(container, { childList: true });
  });
}

export type GoogleButtonOptions = {
  container: HTMLElement;
  clientId: string;
  /** The SHA-256 hash. The raw value goes to Supabase, never to Google. */
  nonceHashed: string;
  onCredential: (idToken: string) => void;
  /** Container width in px; clamped to what Google accepts. */
  width?: number;
};

/**
 * Render Google's own sign-in button and resolve once it is actually on screen.
 *
 * Resolving on *render* rather than on init is the whole point: every way this
 * can fail — script blocked, origin not authorised, API missing — has to end in
 * a rejection the caller can fall back from, because a sign-in button that is
 * present but inert is worse than the redirect it replaced.
 *
 * `theme: "outline"` is a white button with dark text, which is what sits
 * beside it in the form; picking Google's dark themes would have made the two
 * providers look like different classes of thing.
 */
export async function renderGoogleButton(
  options: GoogleButtonOptions
): Promise<void> {
  await loadGoogleIdentity();
  const id = (window as any).google?.accounts?.id;
  if (!id) throw new Error("google identity: not initialised");

  id.initialize({
    client_id: options.clientId,
    nonce: options.nonceHashed,
    callback: (response: { credential?: string }) => {
      if (response?.credential) options.onCredential(response.credential);
    },
    // The token is exchanged for a Supabase session immediately; there is
    // nothing to auto-select into on a later visit.
    auto_select: false,
    itp_support: true,
  });

  clearContainer(options.container);
  id.renderButton(options.container, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
    logo_alignment: "left",
    ...(options.width
      ? {
          width: Math.min(
            MAX_WIDTH,
            Math.max(MIN_WIDTH, Math.round(options.width))
          ),
        }
      : {}),
  });

  await waitForButton(options.container);
}

/** Clear any button left by a previous render (StrictMode mounts twice). */
function clearContainer(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}
