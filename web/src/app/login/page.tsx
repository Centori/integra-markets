'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import SocialAuthButtons from '@/components/SocialAuthButtons';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const supabase = createClient();
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Check if user has completed onboarding (username is required during onboarding)
            if (data.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', data.user.id)
                    .single();

                if (!profile?.username) {
                    window.location.href = '/onboarding';
                    return;
                }
            }

            window.location.href = '/dashboard';
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };


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

                    <h1 className="text-2xl font-bold text-white mb-1.5 text-center">Welcome back</h1>
                    <p className="text-[#888] text-sm mb-8 text-center">Sign in to your account</p>

                    {/* Error — aria-live so a screen reader announces a failed
                        attempt without the user having to go looking for it. */}
                    <div aria-live="polite">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-5 text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Providers first: one tap versus typing an address and a
                        password. Apple and Google both land on /auth/callback,
                        which is provider-agnostic. */}
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
                    <form onSubmit={handleEmailLogin} className="space-y-4">
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
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#4ECCA3] hover:bg-[#45b393] text-black font-semibold py-2.5 px-4 rounded-lg text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-[#888] text-sm mt-6">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="text-[#4ecca3] hover:text-[#5fd9b3] transition-colors font-medium">
                            Sign up
                        </Link>
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
