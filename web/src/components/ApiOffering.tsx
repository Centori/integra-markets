'use client';

import { motion } from 'framer-motion';
import { Terminal, Database, MessagesSquare, type LucideIcon } from 'lucide-react';

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

/**
 * Explicitly typed, because the inferred type broke the production build.
 *
 * `soon` marks a capability that is designed but not yet reachable by a
 * customer. When the last card carrying it was removed, TypeScript stopped
 * inferring the property on the array element type and the `c.soon` read below
 * became a compile error — so www stopped deploying and quietly kept serving
 * the previous build. The site looked unchanged rather than broken, which is
 * the worst way for a build failure to present.
 *
 * Declaring the shape keeps the badge available for the next honest "not yet"
 * without the array's contents deciding whether the code compiles.
 */
type Capability = {
    icon: LucideIcon;
    title: string;
    description: string;
    soon?: boolean;
};

const capabilities: Capability[] = [
    {
        icon: Terminal,
        title: 'REST API',
        description: 'Sentiment scores, prediction-market odds and divergence signals as JSON — the same data powering the app.'
    },
    {
        icon: Database,
        title: 'Historical Archive',
        description: 'Six years of daily commodity sentiment — 49 commodities, continuous from 2020 — queryable for backtesting and research.'
    },
    {
        // Replaces the old "Key Management" card. Key management is table stakes
        // — it described plumbing, not a reason to buy, and it now lives in the
        // signed-in profile anyway. The MCP connector is the differentiator: it
        // is the only capability here that a non-developer can use, so the copy
        // leads with the plain-English question and leaves MCP as the second
        // clause for developers who are scanning for the protocol name.
        // `soon` used to sit here, with a note that the MCP server was
        // "stdio-only, unpublished, and has no hosted endpoint". That stopped
        // being true: it is hosted at mcp.integramarkets.app with OAuth
        // discovery, it is in the production verification suite, and the console
        // ships a one-click connect button. The label was hiding the one
        // capability here a non-developer can use.
        //
        // The Webhooks card that sat above this was removed rather than
        // relabelled — divergence and threshold push does not exist, and a
        // roadmap card earns its place only while someone is actually building it.
        icon: MessagesSquare,
        title: 'Ask in Claude',
        description: 'Ask "what changed in copper this week?" in plain English and get sourced analysis back, with every figure traceable to the headline behind it.',
    }
];

/** Scanned, not read. Six words or fewer; no line needs a second pass. */
const HIGHLIGHTS = [
    'Sentiment that shows its work',
    'Energy, metals, agriculture',
    'Ask it in plain English',
    'Named signals, quoted evidence',
    'Sample size on every score',
    'Daily history, not just today',
    'No SDK to install',
    'Prediction-market divergence, built in',
    'Export to CSV or XLSX',
    'Usage and limits you can see',
];

/** For the reader who has already decided. Each line is checkable in the code. */
const SPECIFICS = [
    'Bearer-token HTTP. Working curl in under a minute.',
    'Seven MCP tools over the same data as the REST surface.',
    'Aggregate sentiment by commodity and window, with article counts.',
    'Emerging narratives clustered from recent coverage.',
    'Model sentiment against Polymarket and Kalshi odds.',
    'Daily series with momentum for backtesting.',
    'Per-key usage, error rate, p95 latency and quota in the dashboard.',
    'Quota webhooks at thresholds you choose.',
    'Up to 10 active keys, revocable independently.',
    'Rate limits published from the constants that enforce them.',
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
                {/* Three columns, not four. The fourth was the Webhooks card;
                    removing it left `lg:grid-cols-4` holding an empty track, so
                    the row rendered three-quarters full and visibly off-centre
                    against the section above it. A column count has to match
                    what is in the array. */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                            <div className="flex items-center gap-2.5 mb-3">
                                <h3 className="text-[18px] font-light text-white">{c.title}</h3>
                                {c.soon && (
                                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#4ECCA3] border border-[#4ECCA3]/30 rounded-full px-2 py-0.5">
                                        Soon
                                    </span>
                                )}
                            </div>
                            <p className="text-[14px] text-zinc-500 leading-relaxed font-light">{c.description}</p>
                        </motion.div>
                    ))}
                </div>

                {/*
                  Two registers, deliberately separated.

                  The strip is scanned — six words or fewer, no punctuation to
                  parse, read in one pass by someone deciding whether to keep
                  reading. The list below it is read by a developer who has
                  already decided and now wants to know exactly what they get,
                  where precision beats punch.

                  Every line was checked against the code before it went up.
                  "Quota webhooks at thresholds you choose" is here because that
                  one is real — services/usage_alerts fires at thresholds the
                  customer picks. The divergence-event webhook that used to be
                  advertised beside it is not, and is not mentioned.
                */}
                <div className="mt-16 pt-12 border-t border-white/5">
                    <ul className="flex flex-wrap gap-x-8 gap-y-3">
                        {HIGHLIGHTS.map((h) => (
                            <li
                                key={h}
                                className="flex items-center gap-2.5 text-[14px] font-light text-zinc-400"
                            >
                                <span className="h-1 w-1 rounded-full bg-[#4ECCA3]" aria-hidden="true" />
                                {h}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-14">
                    <h3 className="text-[11px] uppercase tracking-[0.18em] text-zinc-600 font-light mb-6">
                        What you get
                    </h3>
                    <ul className="grid md:grid-cols-2 gap-x-12 gap-y-4">
                        {SPECIFICS.map((line) => (
                            <li
                                key={line}
                                className="text-[14px] font-light text-zinc-500 leading-relaxed border-l border-white/10 pl-4"
                            >
                                {line}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}
