import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacySettingsPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] font-[var(--font-geist-sans)]">
            <header className="sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 px-4 py-4">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <ArrowLeft size={20} className="text-zinc-400" />
                    </Link>
                    <h1 className="text-lg font-semibold text-white">Privacy Policy</h1>
                </div>
            </header>
            <main className="max-w-3xl mx-auto p-6">
                <p className="text-zinc-500 text-sm mb-8 italic">
                    Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>

                <div className="space-y-8 text-zinc-400 text-[15px] leading-relaxed">
                    <section>
                        <h2 className="text-white font-semibold text-xl mb-3">1. Introduction</h2>
                        <p>
                            Integra Markets (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy while providing advanced AI-powered financial market analysis. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services, including our Bring Your Own Key (BYOK) AI integration features.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-xl mb-3">2. Information We Collect</h2>
                        <p className="mb-4">We collect different types of information to provide and improve our services:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Account Information: Email address, preferences, and settings</li>
                            <li>Usage Data: App interactions, feature usage patterns, and session data</li>
                            <li>Device Information: Device type, operating system, app version, and unique identifiers</li>
                            <li>Financial Data Queries: Market analysis requests and trading-related questions (anonymized)</li>
                            <li>Third-Party API Keys: Encrypted storage of your AI service API keys (OpenAI, Anthropic, Groq)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-xl mb-3">3. Bring Your Own Key (BYOK) Model</h2>
                        <p className="mb-4">Our BYOK approach ensures:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Your API keys are encrypted and stored locally on your device</li>
                            <li>Direct communication between your device and your chosen AI provider</li>
                            <li>We never access, store, or transmit your API keys to our servers</li>
                            <li>You maintain full control over your AI service costs and usage</li>
                            <li>Your API provider&apos;s privacy policy governs the handling of your queries</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-xl mb-3">4. Data Security & Protection</h2>
                        <p className="mb-4">We implement robust security measures:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>End-to-end encryption for sensitive data transmission</li>
                            <li>Secure local storage for API keys using device keychain services</li>
                            <li>Regular security audits and updates</li>
                            <li>No storage of personal financial decisions or trading strategies</li>
                            <li>Compliance with financial data protection standards</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-xl mb-3">5. Your Privacy Rights</h2>
                        <p className="mb-4">You have comprehensive control over your data:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Access and review your stored information</li>
                            <li>Correct or update your account details</li>
                            <li>Delete your account and associated data</li>
                            <li>Revoke API key permissions at any time</li>
                            <li>Opt-out of anonymized usage analytics</li>
                            <li>Request data portability in standard formats</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-white font-semibold text-xl mb-3">6. Contact Information</h2>
                        <p className="mb-4">For privacy-related questions or concerns:</p>
                        <p className="text-white">Email: privacy@integra-markets.com</p>
                        <p className="text-white">Data Protection Officer: dpo@integra-markets.com</p>
                        <p className="mt-4 text-zinc-500">Response time: We aim to respond within 72 hours</p>
                    </section>
                </div>

                <div className="mt-12 p-6 bg-white/5 border border-white/10 rounded-xl">
                    <p className="text-zinc-400 text-sm text-center italic">
                        By using Integra Markets, you acknowledge that you have read and understand this Privacy Policy.
                    </p>
                </div>
            </main>
        </div>
    );
}
