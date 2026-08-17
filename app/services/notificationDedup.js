/**
 * Notification de-duplication, watermarking and rate limiting.
 *
 * Why this exists
 * ---------------
 * `alertMonitoringService.checkNewsAlerts` had no memory of what it had already
 * notified. Every 30 seconds it re-fetched /api/news/latest, filtered to
 * `impact === 'high'`, and fired up to 3 notifications — for the SAME articles,
 * forever. Six per minute, ~360 per hour.
 *
 * It stayed silent only by accident: /api/news/latest never returned a
 * `sentiment` field, so `impact` was always 'medium' and the high-impact list
 * was always empty. The moment that endpoint started returning real sentiment,
 * the loop woke up and produced a deluge of duplicate pushes, each one also
 * popping a blocking "Breaking News / OK" dialog.
 *
 * A dormant bug is still a bug. This module is the missing state:
 *
 *   1. WATERMARK — only articles published after the newest one we have already
 *      notified about are candidates. On a first run the watermark is set to
 *      "now" and nothing fires, so installing the app (or clearing storage)
 *      never blasts the whole backlog.
 *   2. SEEN SET — a bounded set of article keys already notified, so identical
 *      timestamps, re-publishes and clock skew cannot cause a repeat.
 *   3. RATE LIMIT — a per-tick cap and a rolling hourly cap. When more articles
 *      qualify than the per-tick cap allows, a single digest notification is
 *      sent instead of N separate ones.
 *
 * That last point is the one that matters for feel: X and Instagram coalesce a
 * burst into "9 new notifications" rather than delivering nine interruptions.
 * The OS already does that collapsing for us, but only if we stop generating
 * nine separate pushes for content the user has effectively already seen.
 *
 * All state is persisted, so it survives relaunch — an in-memory guard would
 * reset on every cold start and re-notify the backlog.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STATE_KEY = '@integra_notif_dedup_v1';

// Per-tick ceiling. Above this we send one digest instead of N pushes.
export const MAX_PER_TICK = 2;
// Rolling hourly ceiling across all news notifications.
export const MAX_PER_HOUR = 6;
// Bound the seen set so storage cannot grow without limit.
const MAX_SEEN = 300;

const HOUR_MS = 60 * 60 * 1000;

/** Stable identity for an article: URL if we have one, else its headline. */
export function articleKey(article) {
  const url = (article?.url || article?.link || '').trim();
  if (url) return url.toLowerCase();
  return String(article?.headline || article?.title || '')
    .replace(/\W+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      watermark: typeof parsed?.watermark === 'number' ? parsed.watermark : null,
      seen: Array.isArray(parsed?.seen) ? parsed.seen : [],
      firedAt: Array.isArray(parsed?.firedAt) ? parsed.firedAt : [],
    };
  } catch {
    return null;
  }
}

async function saveState(state) {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify({
      watermark: state.watermark,
      seen: state.seen.slice(-MAX_SEEN),
      firedAt: state.firedAt.filter((t) => Date.now() - t < HOUR_MS),
    }));
  } catch {
    // Non-fatal: worst case we re-notify once rather than crash a background tick.
  }
}

/**
 * Decide what to notify about.
 *
 * @param {Array} candidates articles already filtered to notification-worthy
 * @param {number} now injectable clock, for tests
 * @returns {Promise<{notify: Array, digest: number, suppressed: number, reason: string}>}
 *   `notify` — send one notification each.
 *   `digest` — when > 0, send a single summary mentioning this many articles
 *              INSTEAD of the items in `notify`.
 */
export async function selectNotifiable(candidates, now = Date.now()) {
  const list = Array.isArray(candidates) ? candidates : [];
  let state = await loadState();

  // First ever run: adopt "now" as the watermark and stay silent. Everything
  // currently in the feed is backlog the user has not asked to be told about.
  if (!state) {
    await saveState({ watermark: now, seen: list.map(articleKey), firedAt: [] });
    return { notify: [], digest: 0, suppressed: list.length, reason: 'first_run_watermark' };
  }

  const seen = new Set(state.seen);
  const recentFires = state.firedAt.filter((t) => now - t < HOUR_MS);

  // Candidates must be unseen AND newer than the watermark. An article with no
  // parseable timestamp is judged on the seen set alone rather than dropped.
  const fresh = list.filter((a) => {
    if (seen.has(articleKey(a))) return false;
    const ts = parseTime(a?.published || a?.time_published || a?.timestamp);
    if (ts === null) return true;
    return state.watermark === null || ts > state.watermark;
  });

  if (fresh.length === 0) {
    await saveState({ ...state, firedAt: recentFires });
    return { notify: [], digest: 0, suppressed: 0, reason: 'nothing_new' };
  }

  const hourlyRemaining = Math.max(0, MAX_PER_HOUR - recentFires.length);
  if (hourlyRemaining === 0) {
    // Mark them seen anyway: the user will see them in the feed, and holding
    // them back only guarantees a burst the moment the window reopens.
    const nextState = {
      watermark: newestTimestamp(fresh, state.watermark),
      seen: [...state.seen, ...fresh.map(articleKey)],
      firedAt: recentFires,
    };
    await saveState(nextState);
    return { notify: [], digest: 0, suppressed: fresh.length, reason: 'hourly_cap' };
  }

  // Newest first, so if we can only send a couple they are the most current.
  const ordered = [...fresh].sort((a, b) => {
    const ta = parseTime(a?.published || a?.time_published || a?.timestamp) || 0;
    const tb = parseTime(b?.published || b?.time_published || b?.timestamp) || 0;
    return tb - ta;
  });

  const perTick = Math.min(MAX_PER_TICK, hourlyRemaining);
  let notify = [];
  let digest = 0;

  if (ordered.length > perTick) {
    // A burst. One summary reads better than N interruptions, and costs one
    // slot against the hourly budget instead of N.
    digest = ordered.length;
  } else {
    notify = ordered;
  }

  const fires = digest > 0 ? 1 : notify.length;
  await saveState({
    watermark: newestTimestamp(ordered, state.watermark),
    seen: [...state.seen, ...ordered.map(articleKey)],
    firedAt: [...recentFires, ...Array(fires).fill(now)],
  });

  return {
    notify,
    digest,
    suppressed: digest > 0 ? 0 : ordered.length - notify.length,
    reason: digest > 0 ? 'digest' : 'ok',
  };
}

function newestTimestamp(articles, fallback) {
  let max = fallback ?? null;
  for (const a of articles) {
    const ts = parseTime(a?.published || a?.time_published || a?.timestamp);
    if (ts !== null && (max === null || ts > max)) max = ts;
  }
  return max;
}

/** Test/debug helper — forget everything and re-watermark on next check. */
export async function resetDedupState() {
  try {
    await AsyncStorage.removeItem(STATE_KEY);
  } catch {
    // ignore
  }
}

export default { selectNotifiable, articleKey, loadState, resetDedupState, MAX_PER_TICK, MAX_PER_HOUR };
