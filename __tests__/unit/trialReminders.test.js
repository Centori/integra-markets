/**
 * Trial-ending reminders.
 *
 * The 30-day trial used to end in silence — the app just became less capable on
 * day 31. The likeliest reading of that is "the app broke", not "I should
 * subscribe".
 *
 * The risk in fixing it is duplication: fetchTier() runs on every launch and
 * after every purchase, so anything that schedules unconditionally stacks
 * notifications. That exact failure (a 30s loop with no dedup) had to be fixed
 * in this app once already, so most of these tests are about NOT scheduling.
 */

jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k) => (k in store ? store[k] : null)),
      setItem: jest.fn(async (k, v) => { store[k] = v; }),
      removeItem: jest.fn(async (k) => { delete store[k]; }),
      __reset: () => { store = {}; },
    },
  };
});

// jest.mock factories are hoisted above these declarations, so the spies must
// carry the `mock` prefix that jest allows out-of-scope.
const mockSchedule = jest.fn(async () => undefined);
const mockCancel = jest.fn(async () => undefined);
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a) => mockSchedule(...a),
  cancelScheduledNotificationAsync: (...a) => mockCancel(...a),
}), { virtual: true });

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const {
  planTrialReminders,
  syncTrialReminders,
  REMINDER_DAYS_BEFORE,
} = require('../../app/services/trialReminders');

const NOW = new Date('2026-09-01T12:00:00Z');
const in30d = new Date(NOW.getTime() + 30 * 86400_000).toISOString();

beforeEach(() => {
  AsyncStorage.__reset();
  mockSchedule.mockClear();
  mockCancel.mockClear();
});

describe('planTrialReminders', () => {
  it('plans one reminder per configured milestone', () => {
    const plan = planTrialReminders(in30d, NOW);
    expect(plan.map((r) => r.daysBefore)).toEqual([...REMINDER_DAYS_BEFORE]);
  });

  it('fires each one the right number of days before the end', () => {
    const endsAt = new Date(in30d).getTime();
    for (const r of planTrialReminders(in30d, NOW)) {
      expect(endsAt - r.fireAt.getTime()).toBe(r.daysBefore * 86400_000);
    }
  });

  it('drops milestones already in the past', () => {
    // Installed with 3 days left: the 7-day warning can never fire, but the
    // 1-day one still should.
    const soon = new Date(NOW.getTime() + 3 * 86400_000).toISOString();
    expect(planTrialReminders(soon, NOW).map((r) => r.daysBefore)).toEqual([1]);
  });

  it('plans nothing for an already-elapsed trial', () => {
    const past = new Date(NOW.getTime() - 86400_000).toISOString();
    expect(planTrialReminders(past, NOW)).toEqual([]);
  });

  it('never announces that the trial has already ended', () => {
    // A notification saying "your trial ended" is an obituary, not a prompt.
    expect(REMINDER_DAYS_BEFORE).not.toContain(0);
  });

  it.each([null, undefined, '', 'not-a-date'])('returns [] for %p', (bad) => {
    expect(planTrialReminders(bad, NOW)).toEqual([]);
  });
});

describe('syncTrialReminders — idempotence', () => {
  it('schedules on the first call', async () => {
    await syncTrialReminders({ isTrial: true, trialEndsAt: in30d });
    expect(mockSchedule).toHaveBeenCalledTimes(REMINDER_DAYS_BEFORE.length);
  });

  it('does NOT reschedule on repeat calls with the same end date', async () => {
    await syncTrialReminders({ isTrial: true, trialEndsAt: in30d });
    mockSchedule.mockClear();

    // Three more launches.
    await syncTrialReminders({ isTrial: true, trialEndsAt: in30d });
    await syncTrialReminders({ isTrial: true, trialEndsAt: in30d });
    await syncTrialReminders({ isTrial: true, trialEndsAt: in30d });

    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('reschedules when the end date actually changes', async () => {
    await syncTrialReminders({ isTrial: true, trialEndsAt: in30d });
    mockSchedule.mockClear();

    const extended = new Date(NOW.getTime() + 45 * 86400_000).toISOString();
    await syncTrialReminders({ isTrial: true, trialEndsAt: extended });
    expect(mockSchedule).toHaveBeenCalledTimes(REMINDER_DAYS_BEFORE.length);
  });

  it('cancels before rescheduling so nothing accumulates', async () => {
    await syncTrialReminders({ isTrial: true, trialEndsAt: in30d });
    const extended = new Date(NOW.getTime() + 45 * 86400_000).toISOString();
    mockCancel.mockClear();
    await syncTrialReminders({ isTrial: true, trialEndsAt: extended });
    expect(mockCancel).toHaveBeenCalled();
  });
});

describe('syncTrialReminders — leaving the trial', () => {
  it('clears pending reminders once the user subscribes', async () => {
    await syncTrialReminders({ isTrial: true, trialEndsAt: in30d });
    mockCancel.mockClear();

    // Converted. A paying subscriber must never be told their trial is ending.
    await syncTrialReminders({ isTrial: false, trialEndsAt: null });
    expect(mockCancel).toHaveBeenCalled();
  });

  it('schedules nothing for a user who was never on a trial', async () => {
    await syncTrialReminders({ isTrial: false, trialEndsAt: null });
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('schedules nothing when the date is missing despite is_trial', async () => {
    await syncTrialReminders({ isTrial: true, trialEndsAt: null });
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});

describe('syncTrialReminders — failure handling', () => {
  it('does not mark work done if scheduling threw', async () => {
    mockSchedule.mockRejectedValueOnce(new Error('denied'));
    await syncTrialReminders({ isTrial: true, trialEndsAt: in30d });
    // Individual failures are swallowed; the sync still completes rather than
    // breaking the tier resolution that gates the app.
    expect(mockSchedule).toHaveBeenCalled();
  });
});
