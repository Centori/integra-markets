/**
 * Divergence marker for a news card.
 *
 * The feed has been enriching articles with `divergence*` fields all along —
 * roughly a third of a typical response carries them — but nothing on web read
 * them, so the prediction-market signal that distinguishes Integra from a plain
 * news reader was invisible here.
 *
 * What the number means: `divergenceDelta` is news sentiment minus the
 * prediction market's implied probability, on the same signed scale. Positive
 * means the newsflow is more bullish than the market is pricing; negative means
 * the market is ahead of the story. The sign is the whole point, so it is
 * always rendered explicitly — a bare "0.37" tells a reader nothing.
 */

export type DivergenceFields = {
    divergenceStatus?: string;
    divergenceDelta?: number;
    divergenceProvider?: string;
    divergenceTopic?: string;
};

/** `iran_middle_east` → `Iran Middle East` */
function humanizeTopic(topic: string): string {
    return topic
        .split('_')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export default function DivergenceBadge({ item }: { item: DivergenceFields }) {
    // Only render for a real divergence with a usable delta. `0` is a legitimate
    // value, so check the type rather than truthiness.
    if (item.divergenceStatus !== 'DIVERGENCE' || typeof item.divergenceDelta !== 'number') {
        return null;
    }

    const delta = item.divergenceDelta;
    const newsAhead = delta >= 0;

    return (
        <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-[#2A2A2E]">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#4ECCA3]/10 border border-[#4ECCA3]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ECCA3]" />
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#4ECCA3]">
                    Divergence
                </span>
            </span>

            {item.divergenceTopic && (
                <span className="text-xs text-zinc-400">{humanizeTopic(item.divergenceTopic)}</span>
            )}

            <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: newsAhead ? '#4ECCA3' : '#F05454' }}
                title={
                    newsAhead
                        ? 'Newsflow is more bullish than the prediction market is pricing'
                        : 'The prediction market is ahead of the newsflow'
                }
            >
                {newsAhead ? '+' : '−'}
                {Math.abs(delta).toFixed(2)}
            </span>

            {item.divergenceProvider && (
                <span className="text-[10px] text-zinc-600 uppercase tracking-wide ml-auto">
                    vs {item.divergenceProvider}
                </span>
            )}
        </div>
    );
}
