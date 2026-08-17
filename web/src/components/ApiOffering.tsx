'use client';

import { motion } from 'framer-motion';
import { Terminal, Database, Webhook, KeyRound } from 'lucide-react';

// Capability section for the landing page. Tells developers what the API does;
// it deliberately does NOT price it.
//
// The three pricing tiers (Trial / API / API + Archive) and their CTA buttons
// used to sit below these cards. Plan selection now lives only in the signed-in
// console at dashboard.integramarkets.app/api-tier, so the marketing page
// explains the product and the dashboard sells the plan.
//
// Dropping the tiers also removed this component's only reason to touch
// Supabase: the CTAs branched on whether a session existed, to choose between
// the public pricing page and the API console. With them gone there is no auth
// check, no client state and no session round-trip on the home page — it is
// purely presentational. 'use client' remains only because framer-motion needs it.

const capabilities = [
    {
        icon: Terminal,
        title: 'REST API',
        description: 'Sentiment scores, prediction-market odds and divergence signals as JSON — the same data powering the app.'
    },
    {
        icon: Database,
        title: 'Historical Archive',
        description: 'Query the sentiment archive across 34 commodity and macro topics for backtesting and research.'
    },
    {
        icon: Webhook,
        title: 'Webhooks',
        description: 'Push divergence and threshold events straight into your own systems as they fire.'
    },
    {
        icon: KeyRound,
        title: 'Key Management',
        description: 'Scoped keys with rotation and usage metrics, managed from your dashboard.'
    }
];

export default function ApiOffering() {
    return (
        <section id="api" className="py-32 bg-gradient-to-b from-black to-[#0a0a0a] relative">
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <span className="inline-block text-[11px] uppercase tracking-[0.2em] text-[#4ECCA3] border border-[#4ECCA3]/30 rounded-full px-3 py-1 mb-6">
                        For developers &amp; desks
                    </span>
                    <h2 className="text-[40px] md:text-[56px] font-[100] mb-6 text-white tracking-tight leading-tight">
                        Integra <span className="bg-gradient-to-r from-[#4ECCA3] to-[#45b393] bg-clip-text text-transparent font-light">API</span>
                    </h2>
                    <p className="text-[18px] text-zinc-400 font-light max-w-2xl mx-auto leading-relaxed">
                        Pull our sentiment engine, live Polymarket and Kalshi odds, and the cross-market
                        divergence signal directly into your models, dashboards and trading systems.
                    </p>
                </motion.div>

                {/* No bottom margin: the pricing grid that used to follow these
                    cards is gone, so the section's own py-32 provides the spacing
                    before How It Works. */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {capabilities.map((c, i) => (
                        <motion.div
                            key={c.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.08 }}
                            className="bg-[#0a0a0a] border border-white/5 rounded-[12px] p-8 hover:border-[#4ECCA3]/20 transition-colors duration-300"
                        >
                            <div className="text-[#4ECCA3] mb-6">
                                <c.icon size={26} strokeWidth={1} />
                            </div>
                            <h3 className="text-[18px] font-light text-white mb-3">{c.title}</h3>
                            <p className="text-[14px] text-zinc-500 leading-relaxed font-light">{c.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
