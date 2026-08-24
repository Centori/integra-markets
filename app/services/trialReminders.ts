// Trial-ending reminders.
//
// The 30-day trial previously ended in silence: the app simply became less
// capable on day 31, with no warning and no explanation. The likeliest reading
// of that from a user's side is "the app broke", not "I should subscribe".
//
// These are LOCAL notifications scheduled from the trial end date the backend
// now returns on /api/subscriptions/entitlement. Nothing is sent from a server,
// so they cost nothing and work offline.
//
// ⚠️ Idempotence is the whole design problem here. `fetchTier()` runs on every
// launch and after every purchase, so a naive "schedule on each call" would
// stack duplicates — the same failure mode as the 30s notification loop that
// had to be fixed once already (see notificationDedup.js). We therefore record
// WHICH trial end date we have already scheduled for, and re-schedule only when
// that date actually changes.

import AsyncStorage from '@react-native-async-storage/async-storage';

const SCHEDULED_FOR_KEY = '@trial_reminders_scheduled_for';

// Identifier prefix so we can find and cancel only our own notifications and
// never touch the breaking-news ones.
export const REMINDER_ID_PREFIX = 'trial-reminder-';

export type TrialReminder = {
  id: string;
  fireAt: Date;
  title: string;
  body: string;
  daysBefore: number;
};

// How many days before the end to warn. 7 gives time to decide; 1 is the
// "last chance" nudge. Day 0 is deliberately absent — a notification telling
// someone their trial ended is an obituary, not a prompt.
export const REMINDER_DAYS_BEFORE = [7, 1] as const;

function copyFor(daysBefore: number): { title: string; body: string } {
  if (daysBefore === 1) {
    return {
      title: 'Your Integra trial ends tomorrow',
      body: 'Keep divergence alerts, prediction-market signals and real-time push. Tap to see plans.',
    };
  }
  return {
    title: `${daysBefore} days left on your Integra trial`,
    body: 'After that you keep the news feed and AI sentiment. Pro features pause unless you subscribe.',
  };
}

/**
 * Which reminders should exist for a trial ending at `endsAtIso`.
 *
 * Pure — no scheduling, no storage. Returns only reminders in the FUTURE:
 * a user who installs on day 27 should get the 1-day nudge and not a silently
 * dropped 7-day one.
 */
export function planTrialReminders(
  endsAtIso: string | null | undefined,
  now: Date = new Date(),
): TrialReminder[] {
  if (!endsAtIso) return [];
  const endsAt = new Date(endsAtIso);
  if (Number.isNaN(endsAt.getTime())) return [];

  return REMINDER_DAYS_BEFORE.map((daysBefore) => {
    const fireAt = new Date(endsAt.getTime() - daysBefore * 86400_000);
    return { id: `${REMINDER_ID_PREFIX}${daysBefore}d`, fireAt, daysBefore, ...copyFor(daysBefore) };
  }).filter((r) => r.fireAt.getTime() > now.getTime());
}

/** Guarded require — matches how the rest of the app loads native modules. */
function loadNotifications(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications');
  } catch (err) {
    console.warn('[trial] expo-notifications unavailable:', err);
    return null;
  }
}

/**
 * Bring scheduled reminders in line with the current trial end date.
 *
 * Safe to call on every launch: it no-ops unless the end date has changed
 * since the last time it scheduled anything.
 */
export async function syncTrialReminders(opts: {
  isTrial: boolean;
  trialEndsAt: string | null;
}): Promise<TrialReminder[]> {
  const { isTrial, trialEndsAt } = opts;

  let scheduledFor: string | null = null;
  try {
    scheduledFor = await AsyncStorage.getItem(SCHEDULED_FOR_KEY);
  } catch {
    // Unreadable storage → treat as "nothing scheduled" and continue.
  }

  // Not on a trial any more (subscribed, or it ended). Clear anything pending
  // so a converted subscriber is never told their trial is about to run out.
  if (!isTrial || !trialEndsAt) {
    if (scheduledFor) await cancelTrialReminders();
    return [];
  }

  // Already scheduled for exactly this end date — nothing to do. This is the
  // branch that runs on almost every launch.
  if (scheduledFor === trialEndsAt) return [];

  const planned = planTrialReminders(trialEndsAt);
  const Notifications = loadNotifications();
  if (!Notifications) return [];

  await cancelTrialReminders();
  for (const r of planned) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body, data: { type: 'trial_reminder', daysBefore: r.daysBefore } },
        trigger: { date: r.fireAt },
      });
    } catch (err) {
      console.warn(`[trial] failed to schedule ${r.id}:`, err);
    }
  }

  try {
    // Written only AFTER scheduling, so a crash mid-way retries next launch
    // rather than marking the work done when it wasn't.
    await AsyncStorage.setItem(SCHEDULED_FOR_KEY, trialEndsAt);
  } catch {
    // Worst case we reschedule next launch; cancelTrialReminders() runs first,
    // so this cannot accumulate duplicates.
  }
  return planned;
}

/** Cancel only our reminders, by their known identifiers. */
export async function cancelTrialReminders(): Promise<void> {
  const Notifications = loadNotifications();
  if (Notifications) {
    for (const daysBefore of REMINDER_DAYS_BEFORE) {
      try {
        await Notifications.cancelScheduledNotificationAsync(`${REMINDER_ID_PREFIX}${daysBefore}d`);
      } catch {
        // Not scheduled — fine.
      }
    }
  }
  try {
    await AsyncStorage.removeItem(SCHEDULED_FOR_KEY);
  } catch {
    // ignore
  }
}
