"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { browserClient } from "@/lib/supabase";

// Web Apple sign-in needs a Services ID configured in Supabase (separate from
// the iOS App ID). Flip NEXT_PUBLIC_ENABLE_APPLE_AUTH=1 in Vercel once that
// exists — no code change needed.
const APPLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_APPLE_AUTH === "1";

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

  const onOAuth = async (provider: "google" | "apple") => {
    setError(null);
    setPending(provider);
    try {
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
        <button
          onClick={() => onOAuth("google")}
          disabled={pending !== null}
          className="w-full flex items-center justify-center gap-3 rounded-md bg-white text-black font-medium px-4 py-2.5 text-sm disabled:opacity-50"
        >
          <GoogleIcon />
          {pending === "google" ? "Redirecting…" : "Continue with Google"}
        </button>
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
