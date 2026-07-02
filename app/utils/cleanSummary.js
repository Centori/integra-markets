// RSS feeds sometimes ship summaries that are just "[...]", "....", "Read more...",
// or empty after the publisher strips them. Display these as if absent so the
// fallback (article title) kicks in instead of users seeing literal dots.
export function cleanSummaryText(raw) {
    if (raw === null || raw === undefined) return '';
    let s = String(raw).trim();
    s = s.replace(/^[.…]+\s*/, '').replace(/\s*[.…]+$/, '');
    s = s.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    if (s.length < 12) return '';
    if (/^read more$|^continue reading$|^\[\.\.\.\]$/i.test(s)) return '';
    return s;
}
