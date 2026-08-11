'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Terminal, Database, Webhook, KeyRound, Check } from 'lucide-react';

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

const tiers = [
    {
        name: 'Trial',
        tagline: '30 days, free',
        features: ['Full API access', '30-day data window', 'Read-only — no exports'],
        cta: 'Start free trial',
        highlighted: false
    },
    {
        name: 'API',
        tagline: 'For production use',
        features: ['Everything in Trial', 'Exports (CSV / Excel)', '30-day rolling window', 'Includes Integra Pro on mobile'],
        cta: 'Get API access',
        highlighted: true
    },
    {
        name: 'API + Archive',
        tagline: 'For research & backtesting',
        features: ['Everything in API', 'Full historical archive', 'Unlimited lookback', 'Priority support'],
        cta: 'Talk to us',
        highlighted: false
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

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
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

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {tiers.map((t, i) => (
                        <motion.div
                            key={t.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className={`relative rounded-[12px] p-8 border transition-colors duration-300 ${
                                t.highlighted
                                    ? 'border-[#4ECCA3]/40 bg-[#0c1512]'
                                    : 'border-white/5 bg-[#0a0a0a] hover:border-white/10'
                            }`}
                        >
                            {t.highlighted && (
                                <span className="absolute -top-3 left-8 bg-[#4ECCA3] text-black text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                                    Most popular
                                </span>
                            )}
                            <h3 className="text-[22px] font-light text-white">{t.name}</h3>
                            <p className="text-[13px] text-zinc-500 mb-6 font-light">{t.tagline}</p>
                            <ul className="space-y-3 mb-8">
                                {t.features.map((f) => (
                                    <li key={f} className="flex items-start gap-2.5">
                                        <Check size={16} strokeWidth={1.5} className="text-[#4ECCA3] mt-[3px] flex-none" />
                                        <span className="text-[14px] text-zinc-400 font-light leading-relaxed">{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href="/api-tier"
                                className={`flex items-center justify-center h-11 rounded-[8px] text-[14px] font-medium transition-colors ${
                                    t.highlighted
                                        ? 'bg-[#4ECCA3] hover:bg-[#45b393] text-black'
                                        : 'border border-white/15 text-zinc-300 hover:border-[#4ECCA3]/40 hover:text-white'
                                }`}
                            >
                                {t.cta}
                            </Link>
                        </motion.div>
                    ))}
                </div>

                <p className="text-center text-[13px] text-zinc-600 mt-10 font-light">
                    Pricing shown at checkout. Mobile subscriptions are billed through the App Store.
                </p>
            </div>
        </section>
    );
}
