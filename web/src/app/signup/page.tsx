'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import SocialAuthButtons from '@/components/SocialAuthButtons';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleEmailSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) throw error;
            setSuccess(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to sign up');
        } finally {
            setLoading(false);
        }
    };


    if (success) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-sm text-center">
                    <div className="p-8">
                        <div className="w-14 h-14 bg-[#4ecca3]/20 rounded-full flex items-center justify-center mx-auto mb-5">
                            <svg width="28" height="28" fill="none" stroke="#4ecca3" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-white mb-3">Check your email</h1>
                        <p className="text-[#888] text-sm mb-5">
                            We&apos;ve sent a confirmation link to <span className="text-white">{email}</span>.
                            Click the link to activate your account.
                        </p>
                        <Link href="/login" className="inline-block bg-[#4ECCA3] hover:bg-[#45b393] text-black font-semibold py-2.5 px-5 rounded-lg text-sm transition-all">
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex">
            {/* Left Side - Form (40%) */}
            <div className="w-full lg:w-[40%] flex items-center justify-center px-8 py-12">
                <div className="w-full max-w-sm">
                    {/* Logo - links to home */}
                    <Link href="/" className="flex items-center justify-center gap-2.5 mb-10 hover:opacity-80 transition-opacity">
                        <Image
                            src="/logoNew.png"
                            alt="Integra Markets"
                            width={28}
                            height={28}
                            className="w-7 h-7"
                        />
                        <div className="flex items-center">
                            <span className="text-white font-semibold text-base">integra</span>
                            <span className="text-[#888] text-base ml-1">Markets</span>
                        </div>
                    </Link>

                    <h1 className="text-2xl font-bold text-white mb-1.5 text-center">Create an account</h1>
                    <p className="text-[#888] text-sm mb-8 text-center">Start trading smarter today</p>

                    {/* Error — aria-live so a failed attempt is announced. */}
                    <div aria-live="polite">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-5 text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Providers first — same order as /login, so the two pages
                        do not teach different habits. Apple and Google create
                        the account on first authorization, so no separate
                        "sign up with" wording is needed. */}
                    <SocialAuthButtons onError={setError} />

                    <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-3 bg-black text-[#555]">or</span>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleEmailSignup} className="space-y-4">
                        <div>
                            <label className="block text-[#888] text-xs mb-1.5">Full Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full bg-[#111] border border-white/10 rounded-lg py-2.5 px-3.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#4ecca3]/50 transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[#888] text-xs mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-[#111] border border-white/10 rounded-lg py-2.5 px-3.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#4ecca3]/50 transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[#888] text-xs mb-1.5">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-[#111] border border-white/10 rounded-lg py-2.5 px-3.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#4ecca3]/50 transition-all"
                                required
                                minLength={8}
                            />
                            {/* Password Strength Indicator */}
                            {password && (
                                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                                    <div className={`flex items-center gap-1.5 text-xs transition-colors ${password.length >= 8 ? 'text-[#4ecca3]' : 'text-[#444]'}`}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            {password.length >= 8 ? <path d="M20 6L9 17l-5-5" /> : <circle cx="12" cy="12" r="10" />}
                                        </svg>
                                        8+ characters
                                    </div>
                                    <div className={`flex items-center gap-1.5 text-xs transition-colors ${/[a-z]/.test(password) ? 'text-[#4ecca3]' : 'text-[#444]'}`}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            {/[a-z]/.test(password) ? <path d="M20 6L9 17l-5-5" /> : <circle cx="12" cy="12" r="10" />}
                                        </svg>
                                        Lowercase
                                    </div>
                                    <div className={`flex items-center gap-1.5 text-xs transition-colors ${/[A-Z]/.test(password) ? 'text-[#4ecca3]' : 'text-[#444]'}`}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            {/[A-Z]/.test(password) ? <path d="M20 6L9 17l-5-5" /> : <circle cx="12" cy="12" r="10" />}
                                        </svg>
                                        Uppercase
                                    </div>
                                    <div className={`flex items-center gap-1.5 text-xs transition-colors ${/[0-9]/.test(password) ? 'text-[#4ecca3]' : 'text-[#444]'}`}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            {/[0-9]/.test(password) ? <path d="M20 6L9 17l-5-5" /> : <circle cx="12" cy="12" r="10" />}
                                        </svg>
                                        Number
                                    </div>
                                    <div className={`flex items-center gap-1.5 text-xs transition-colors ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) ? 'text-[#4ecca3]' : 'text-[#444]'}`}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) ? <path d="M20 6L9 17l-5-5" /> : <circle cx="12" cy="12" r="10" />}
                                        </svg>
                                        Special char
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#4ECCA3] hover:bg-[#45b393] text-black font-semibold py-2.5 px-4 rounded-lg text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-[#888] text-sm mt-6">
                        Already have an account?{' '}
                        <Link href="/login" className="text-[#4ecca3] hover:text-[#5fd9b3] transition-colors font-medium">
                            Sign in
                        </Link>
                    </p>

                    <p className="text-center text-[#555] text-[10px] mt-5">
                        By creating an account, you agree to our{' '}
                        <Link href="/terms" className="text-[#666] hover:text-white transition-colors">Terms</Link>
                        {' '}and{' '}
                        <Link href="/privacy" className="text-[#666] hover:text-white transition-colors">Privacy Policy</Link>
                    </p>
                </div>
            </div>

            {/* Right Side - Video (60%) */}
            <div className="hidden lg:flex w-[60%] relative bg-black items-center justify-center">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                >
                    <source src="/video_ascii_integra.webm" type="video/webm" />
                </video>
            </div>
        </div>
    );
}
