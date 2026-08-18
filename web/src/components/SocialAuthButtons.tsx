'use client';

/**
 * Provider sign-in buttons, shared by /login and /signup.
 *
 * Why shared: Google and Apple make no distinction between signing up and
 * signing in — the same authorization either creates the account or returns the
 * existing one. Two copies of that logic on two pages is how they drift, and
 * the pages already had two separately-maintained Google handlers.
 *
 * Why Apple: mobile offers Sign in with Apple, the web did not, and both read
 * the same Supabase project. An Apple-only signup therefore had NO way into the
 * web console — and API keys are web-only, so those users could never collect
 * one. That is the customer most likely to buy the API tier.
 *
 * Ordering: providers render ABOVE the email form. One tap versus typing an
 * address and a password, so the faster path goes first — the pattern Instagram,
 * X, Linear and Vercel all use. The form previously came first with providers
 * buried under an "or" divider.
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

type Provider = 'google' | 'apple';

// Apple is behind a flag because the provider is not yet enabled on the
// Supabase project: as of 2026-08-18,
//   GET /auth/v1/authorize?provider=apple  ->  400
//   GET /auth/v1/authorize?provider=google ->  302 (working)
// Rendering a sign-in button that cannot complete is worse than omitting it —
// someone taps it, fails, and may not try again. Set
// NEXT_PUBLIC_APPLE_AUTH_ENABLED=true in Vercel once Apple is configured in
// Supabase (Services ID + key); no code change or redeploy of this component is
// needed beyond the env var taking effect on the next build.
const APPLE_ENABLED = process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED === 'true';

export default function SocialAuthButtons({
    onError,
}: {
    onError: (message: string) => void;
}) {
    // Which provider is mid-redirect, or null. A single value rather than a
    // boolean per provider: only one OAuth flow can be in flight, and this lets
    // every button disable together so a second tap cannot start a competing
    // authorization while the first is still resolving.
    const [pending, setPending] = useState<Provider | null>(null);

    const signIn = async (provider: Provider) => {
        setPending(provider);
        onError('');

        try {
            const supabase = createClient();
            // Same fixed origin the email flow uses, so www and non-www cannot
            // produce two different redirect targets.
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: { redirectTo: `${siteUrl}/auth/callback` },
            });

            if (error) throw error;
            // On success the browser navigates away; leave `pending` set so the
            // buttons stay disabled for the remainder of this page's life.
        } catch (err: unknown) {
            const raw = err instanceof Error ? err.message : '';
            // Supabase answers "Unsupported provider" when the provider exists in
            // the client but is not enabled on the project. That is a
            // configuration state, not something the visitor can act on, so say
            // so plainly instead of surfacing the raw string.
            const message = /unsupported provider|provider is not enabled/i.test(raw)
                ? `${label(provider)} sign-in isn't available right now. Please use another method.`
                : raw || `Could not continue with ${label(provider)}.`;
            onError(message);
            setPending(null);
        }
    };

    return (
        <div className="space-y-3">
            {APPLE_ENABLED && (
            <button
                type="button"
                onClick={() => signIn('apple')}
                disabled={pending !== null}
                aria-busy={pending === 'apple'}
                className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-white/10 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4ecca3]/60"
            >
                {pending === 'apple' ? (
                    <Spinner />
                ) : (
                    <>
                        {/* Apple's mark, unmodified per their identity guidelines.
                            Black button with a white mark, kept on the same
                            treatment as Google so neither provider is visually
                            favoured — Apple requires equal prominence. */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                        </svg>
                        Continue with Apple
                    </>
                )}
            </button>
            )}

            <button
                type="button"
                onClick={() => signIn('google')}
                disabled={pending !== null}
                aria-busy={pending === 'google'}
                className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-white/10 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4ecca3]/60"
            >
                {pending === 'google' ? (
                    <Spinner />
                ) : (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </>
                )}
            </button>
        </div>
    );
}

function Spinner() {
    return <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />;
}

function label(provider: Provider) {
    return provider === 'apple' ? 'Apple' : 'Google';
}
