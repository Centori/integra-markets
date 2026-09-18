"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { browserClient } from "@/lib/supabase";
import {
  GOOGLE_CLIENT_ID,
  createNonce,
  renderGoogleButton,
  type GoogleNonce,
} from "@/lib/googleIdentity";

// Apple sign-in, enabled. It sat behind NEXT_PUBLIC_ENABLE_APPLE_AUTH, which
// was never set on the integra-dashboard Vercel project — so the dashboard
// offered only Google and a magic link, while www.integramarkets.app/login
// offered Apple, Google AND email/password. Anyone who created their account
// with Apple could not reach their own API keys at all.
//
// Verified against production 2026-09-02, using the DASHBOARD's own callback:
//   GET /auth/v1/authorize?provider=apple&redirect_to=<dashboard>  -> 302
//   GET /auth/v1/authorize?provider=google&redirect_to=<dashboard> -> 302
// which proves both that the Services ID exists and that this callback is in
// Supabase's redirect allowlist. Apple redirects to Supabase's own
// /auth/v1/callback, never to this host, so Apple's return-URL list is not
// involved beyond what already works.
const APPLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_APPLE_AUTH !== "0";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 384 512" fill="currentColor" aria-hidden>
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/account";

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"google" | "apple" | "email" | null>(null);

  const callbackUrl = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`;

  /**
   * Supabase's redirect flow. Still the path for Apple, and the fallback for
   * Google whenever the in-page flow cannot run.
   */
  const oauthRedirect = async (provider: "google" | "apple") => {
    const { error: oauthError } = await browserClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl(),
        ...(provider === "google"
          ? { queryParams: { prompt: "select_account" } }
          : {}),
      },
    });
    if (oauthError) throw oauthError;
    // Browser is being redirected to the provider — leave pending on.
  };

  /**
   * Google without leaving the page, matching what the iOS build does.
   *
   * The redirect flow sends the browser to the Supabase project host, so
   * Google's consent screen reads "zhdcpiopihqwcmicjpca.supabase.co". Google
   * Identity Services returns an ID token in-page instead, which goes through
   * the same signInWithIdToken exchange the app performs with the token from
   * the native sheet — so the consent screen shows this origin.
   *
   * Google's own button is rendered rather than One Tap. One Tap goes into
   * cooldown after a dismissal and reports that through a callback rather than
   * its promise, which is how the first version of this ended up awaiting
   * something that never settled. See lib/googleIdentity.ts.
   *
   * `googleMode` drives which control the user sees:
   *   "pending"  — deciding; the redirect button is shown so there is never a
   *                gap where the form has no way to sign in with Google
   *   "gis"      — Google's button rendered; the redirect button is removed
   *   "redirect" — GIS unavailable for any reason; the existing flow stands
   */
  const [googleMode, setGoogleMode] = useState<"pending" | "gis" | "redirect">(
    GOOGLE_CLIENT_ID ? "pending" : "redirect"
  );
  const googleSlot = useRef<HTMLDivElement | null>(null);
  const nonceRef = useRef<GoogleNonce | null>(null);

  /**
   * Exchange Google's ID token for a Supabase session.
   *
   * A failure here is NOT a fallback case. The token is already issued and the
   * nonce is spent; retrying through the redirect would re-prompt a user who
   * has just consented. Show the error instead.
   */
  const onGoogleCredential = useCallback(
    async (idToken: string) => {
      const nonce = nonceRef.current;
      setError(null);
      setPending("google");
      try {
        const { error: idError } = await browserClient().auth.signInWithIdToken({
          provider: "google",
          token: idToken,
          ...(nonce ? { nonce: nonce.raw } : {}),
        });
        if (idError) throw idError;
        window.location.assign(redirect);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign in failed");
        setPending(null);
      }
    },
    [redirect]
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      // Say so. Without this the page silently uses the redirect flow, which
      // works — so the only symptom is Google's consent screen reading
      // "to continue to zhdcpiopihqwcmicjpca.supabase.co", and the only way to
      // discover the cause is to read this file. The whole in-page flow was
      // shipped and then sat switched off for a day because nothing said it
      // was switched off.
      console.warn(
        "[auth] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set, so Google sign-in " +
          "uses the Supabase redirect and the consent screen shows the " +
          "Supabase project host. Set it on the Vercel project to enable the " +
          "in-page flow."
      );
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const slot = googleSlot.current;
        if (!slot) throw new Error("google identity: no container");
        const nonce = await createNonce();
        if (cancelled) return;
        nonceRef.current = nonce;

        await renderGoogleButton({
          container: slot,
          clientId: GOOGLE_CLIENT_ID,
          nonceHashed: nonce.hashed,
          onCredential: (token) => {
            void onGoogleCredential(token);
          },
          width: slot.getBoundingClientRect().width || undefined,
        });
        if (!cancelled) setGoogleMode("gis");
      } catch (err) {
        // Deliberately loud. A silent fallback here looks identical to a
        // working setup from the outside — the button still signs you in, just
        // through the URL this change exists to remove — so the one signal
        // that the origin or the client ID is wrong is this line.
        console.warn(
          "[auth] Google in-page sign-in unavailable, using redirect:",
          err instanceof Error ? err.message : err
        );
        if (!cancelled) setGoogleMode("redirect");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onGoogleCredential]);

  const onOAuth = async (provider: "google" | "apple") => {
    setError(null);
    setPending(provider);
    try {
      await oauthRedirect(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setPending(null);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending("email");
    try {
      const { error: signInError } = await browserClient().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl() },
      });
      if (signInError) throw signInError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sign in or create account</h1>
        <p className="text-text-secondary text-sm mt-1">
          Same account as the iOS app. New here? Any option below creates your
          free account.
        </p>
      </div>

      <div className="space-y-3">
        {/* Google renders its button into this slot. It stays mounted in
            every mode: the ref has to exist before the effect runs, and an
            empty div has no height, so nothing shifts when the swap happens. */}
        <div ref={googleSlot} className="flex justify-center [color-scheme:light]" />
        {googleMode === "gis" ? null : (
          <button
            onClick={() => onOAuth("google")}
            disabled={pending !== null}
            className="w-full flex items-center justify-center gap-3 rounded-md bg-white text-black font-medium px-4 py-2.5 text-sm disabled:opacity-50"
          >
            <GoogleIcon />
            {pending === "google" ? "Redirecting…" : "Continue with Google"}
          </button>
        )}
        {APPLE_ENABLED ? (
          <button
            onClick={() => onOAuth("apple")}
            disabled={pending !== null}
            className="w-full flex items-center justify-center gap-3 rounded-md bg-white text-black font-medium px-4 py-2.5 text-sm disabled:opacity-50"
          >
            <AppleIcon />
            {pending === "apple" ? "Redirecting…" : "Continue with Apple"}
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-bg-tertiary" />
        <span className="text-xs text-text-secondary">or</span>
        <div className="h-px flex-1 bg-bg-tertiary" />
      </div>

      {sent ? (
        <div className="rounded-lg border border-accent-positive bg-bg-secondary p-4 text-sm">
          Check your email at <span className="font-mono">{email}</span> for a sign-in link.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            disabled={pending !== null}
            className="w-full rounded-md bg-bg-secondary border border-bg-tertiary px-3 py-2 text-sm focus:outline-none focus:border-accent-positive"
          />
          <button
            type="submit"
            disabled={pending !== null}
            className="w-full rounded-md bg-accent-positive text-bg-primary font-medium px-4 py-2 text-sm disabled:opacity-50"
          >
            {pending === "email" ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>
      )}

      {error ? <p className="text-xs text-accent-negative">{error}</p> : null}
    </div>
  );
}
