"use client";

import { useState } from "react";
import { browserClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const supabase = browserClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (signInError) throw signInError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-text-secondary text-sm mt-1">
          We&apos;ll email you a magic link. No password needed.
        </p>
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
            disabled={pending}
            className="w-full rounded-md bg-bg-secondary border border-bg-tertiary px-3 py-2 text-sm focus:outline-none focus:border-accent-positive"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-accent-positive text-bg-primary font-medium px-4 py-2 text-sm disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send magic link"}
          </button>
          {error ? <p className="text-xs text-accent-negative">{error}</p> : null}
        </form>
      )}
    </div>
  );
}
