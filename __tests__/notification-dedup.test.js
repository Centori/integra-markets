/**
 * Notification de-duplication, watermarking and rate limiting.
 *
 * Regression cover for a notification deluge observed on build 88
 * (2026-08-17): the user received a burst of pushes — "You have 9 new Integra
 * Markets notifications" — for articles they had already been told about, each
 * one also popping a blocking "Breaking News / OK" modal.
 *
 * `checkNewsAlerts` ran every 30 seconds and fired up to 3 notifications per
 * tick with no memory of what it had already sent, so the same headlines were
 * re-announced roughly 360 times an hour. It had been silent purely by
 * accident: /api/news/latest returned no `sentiment` field, so `impact` was
 * always 'medium' and the high-impact list was always empty. Making that
 * endpoint return real sentiment woke the loop up.
 *
 * These tests pin the behaviour a production news app needs: announce a story
 * once, never announce backlog on first run, and collapse a burst into one
 * summary rather than N interruptions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  selectNotifiable,
  articleKey,
  resetDedupState,
  MAX_PER_TICK,
  MAX_PER_HOUR,
} from '../app/services/notificationDedup';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// Fixed clock so watermark comparisons are deterministic.
const T0 = new Date('2026-08-17T12:00:00Z').getTime();

const article = (id, minutesAgo, at = T0) => ({
  headline: `Headline ${id}`,
  source: 'OilPrice.com',
  impact: 'high',
  url: `https://example.com/${id}`,
  published: new Date(at - minutesAgo * MINUTE).toISOString(),
});

beforeEach(async () => {
  await AsyncStorage.clear();
  await resetDedupState();
});

describe('first run', () => {
  it('notifies nothing and adopts a watermark', async () => {
    const feed = [article('a', 5), article('b', 20), article('c', 90)];
    const result = await selectNotifiable(feed, T0);

    expect(result.notify).toHaveLength(0);
    expect(result.digest).toBe(0);
    expect(result.reason).toBe('first_run_watermark');
  });

  it('does not blast the backlog after a reinstall', async () => {
    // 20 unseen articles present at install time must produce zero pushes.
    const feed = Array.from({ length: 20 }, (_, i) => article(`old${i}`, i + 1));
    const result = await selectNotifiable(feed, T0);
    expect(result.notify).toHaveLength(0);
    expect(result.suppressed).toBe(20);
  });
});

describe('announce once, never again', () => {
  it('a genuinely new article notifies exactly once', async () => {
    await selectNotifiable([article('seed', 60)], T0);

    const fresh = article('new', 0, T0 + 5 * MINUTE);
    const first = await selectNotifiable([fresh], T0 + 5 * MINUTE);
    expect(first.notify.map((a) => a.headline)).toEqual(['Headline new']);

    // Same article on the next tick 30s later — the old code re-sent here.
    const second = await selectNotifiable([fresh], T0 + 5 * MINUTE + 30 * 1000);
    expect(second.notify).toHaveLength(0);
    expect(second.reason).toBe('nothing_new');
  });

  it('the exact 30-second re-poll loop produces one notification, not many', async () => {
    await selectNotifiable([article('seed', 60)], T0);
    const fresh = [article('x', 0, T0 + MINUTE), article('y', 1, T0 + MINUTE)];

    let sent = 0;
    for (let tick = 0; tick < 20; tick++) {
      const r = await selectNotifiable(fresh, T0 + MINUTE + tick * 30 * 1000);
      sent += r.digest > 0 ? 1 : r.notify.length;
    }
    // 20 ticks over 10 minutes. Old behaviour: up to 60 pushes.
    expect(sent).toBeLessThanOrEqual(MAX_PER_TICK);
  });

  it('re-announces nothing when the feed is simply reordered', async () => {
    await selectNotifiable([article('seed', 60)], T0);
    const a = article('p', 0, T0 + MINUTE);
    const b = article('q', 2, T0 + MINUTE);

    await selectNotifiable([a, b], T0 + MINUTE);
    const again = await selectNotifiable([b, a], T0 + 2 * MINUTE);
    expect(again.notify).toHaveLength(0);
  });
});

describe('watermark', () => {
  it('ignores articles older than the newest already notified', async () => {
    await selectNotifiable([article('seed', 60)], T0);
    // Announce something recent.
    await selectNotifiable([article('recent', 0, T0 + 10 * MINUTE)], T0 + 10 * MINUTE);

    // A source now surfaces an older story we never saw. It is backlog, not news.
    const older = { ...article('backdated', 0), url: 'https://example.com/backdated',
                    published: new Date(T0 + 2 * MINUTE).toISOString() };
    const result = await selectNotifiable([older], T0 + 11 * MINUTE);
    expect(result.notify).toHaveLength(0);
  });

  it('an article with no parseable date is judged on the seen set alone', async () => {
    await selectNotifiable([article('seed', 60)], T0);
    const undated = { headline: 'No date', source: 'X', impact: 'high',
                      url: 'https://example.com/undated', published: '' };

    const first = await selectNotifiable([undated], T0 + MINUTE);
    expect(first.notify).toHaveLength(1);

    const second = await selectNotifiable([undated], T0 + 2 * MINUTE);
    expect(second.notify).toHaveLength(0);
  });
});

describe('burst becomes a digest', () => {
  it('more than the per-tick cap yields one summary, not N pushes', async () => {
    await selectNotifiable([article('seed', 120)], T0);

    const burst = Array.from({ length: 9 }, (_, i) =>
      article(`burst${i}`, i, T0 + 30 * MINUTE));
    const result = await selectNotifiable(burst, T0 + 30 * MINUTE);

    expect(result.digest).toBe(9);
    expect(result.notify).toHaveLength(0);
  });

  it('a small number of new articles are sent individually', async () => {
    await selectNotifiable([article('seed', 120)], T0);
    const few = [article('m', 0, T0 + 30 * MINUTE)];
    const result = await selectNotifiable(few, T0 + 30 * MINUTE);

    expect(result.digest).toBe(0);
    expect(result.notify).toHaveLength(1);
  });
});

describe('hourly cap', () => {
  it('stops notifying once the hourly budget is spent', async () => {
    await selectNotifiable([article('seed', 120)], T0);

    let fired = 0;
    for (let i = 0; i < 20; i++) {
      const at = T0 + (10 + i) * MINUTE;
      const r = await selectNotifiable([article(`drip${i}`, 0, at)], at);
      fired += r.digest > 0 ? 1 : r.notify.length;
    }
    expect(fired).toBeLessThanOrEqual(MAX_PER_HOUR);
  });

  it('the budget refills after the window passes', async () => {
    await selectNotifiable([article('seed', 120)], T0);
    for (let i = 0; i < 20; i++) {
      const at = T0 + (10 + i) * MINUTE;
      await selectNotifiable([article(`drip${i}`, 0, at)], at);
    }
    const later = T0 + 10 * MINUTE + 2 * HOUR;
    const r = await selectNotifiable([article('after', 0, later)], later);
    expect(r.notify.length + (r.digest > 0 ? 1 : 0)).toBeGreaterThan(0);
  });
});

describe('articleKey', () => {
  it('prefers the URL', () => {
    expect(articleKey({ url: 'https://Example.com/A', headline: 'x' }))
      .toBe('https://example.com/a');
  });

  it('falls back to a normalised headline', () => {
    expect(articleKey({ headline: 'Oil Near $90, Again!' }))
      .toBe(articleKey({ headline: 'oil near 90 again' }));
  });

  it('treats link and url interchangeably', () => {
    expect(articleKey({ link: 'https://e.com/1' })).toBe(articleKey({ url: 'https://e.com/1' }));
  });
});

describe('robustness', () => {
  it('tolerates junk input without throwing', async () => {
    await expect(selectNotifiable(null, T0)).resolves.toBeTruthy();
    await expect(selectNotifiable(undefined, T0)).resolves.toBeTruthy();
    await expect(selectNotifiable([{}, null], T0)).resolves.toBeTruthy();
  });

  it('survives corrupt persisted state', async () => {
    await AsyncStorage.setItem('@integra_notif_dedup_v1', 'not json');
    const result = await selectNotifiable([article('a', 1)], T0);
    expect(result).toBeTruthy();
  });
});
