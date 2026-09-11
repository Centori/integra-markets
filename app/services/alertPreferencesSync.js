/**
 * Alert preferences, shared between the app and the web.
 *
 * They were not shared. AlertPreferencesForm saved to AsyncStorage and nothing
 * else — no code anywhere in app/ wrote public.alert_preferences — while
 * www.integramarkets.app/alerts reads that table and nothing else. So a user
 * who set preferences on their phone opened the web and found an account that
 * looked untouched: alerts appeared for a moment while the feed loaded, then
 * emptied into "set up your alert preferences".
 *
 * AsyncStorage stays as the local cache. It is what makes the app work offline
 * and on first paint, and it is authoritative for nothing.
 *
 * WRITES ARE BEST-EFFORT. Saving preferences must not fail because the network
 * did — the user has just tapped Save on a form they filled in, and the local
 * copy has already been written. A failed sync returns false and is logged; the
 * next save retries it in full, because this upserts the whole row rather than
 * a delta.
 */

import { supabase } from '../utils/supabaseConfig';

/**
 * The table's CHECK constraints accept lowercase only:
 *
 *   alert_frequency IN ('real-time', 'hourly', 'daily', 'weekly')
 *   alert_threshold IN ('low', 'medium', 'high')
 *
 * The form's buttons read 'Real-time' / 'Daily' / 'Weekly' and 'Low' /
 * 'Medium' / 'High'. Writing those verbatim violates the constraint and the
 * whole upsert is rejected — which would have looked exactly like the bug this
 * file is fixing, so it is normalised here rather than at the call site.
 */
function normalizeFrequency(value) {
  const allowed = ['real-time', 'hourly', 'daily', 'weekly'];
  const lowered = String(value ?? '').trim().toLowerCase();
  return allowed.includes(lowered) ? lowered : 'daily';
}

function normalizeThreshold(value) {
  const allowed = ['low', 'medium', 'high'];
  const lowered = String(value ?? '').trim().toLowerCase();
  return allowed.includes(lowered) ? lowered : 'medium';
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

/** Local shape (camelCase) -> table columns (snake_case). */
function toRow(prefs, userId) {
  return {
    user_id: userId,
    commodities: toArray(prefs.commodities),
    regions: toArray(prefs.regions),
    currencies: toArray(prefs.currencies),
    keywords: toArray(prefs.keywords),
    website_urls: toArray(prefs.websiteURLs),
    alert_frequency: normalizeFrequency(prefs.alertFrequency),
    alert_threshold: normalizeThreshold(prefs.alertThreshold),
    push_notifications: prefs.pushNotifications !== false,
    email_alerts: Boolean(prefs.emailAlerts),
    updated_at: new Date().toISOString(),
  };
}

/** Table columns -> local shape. Frequency and threshold keep the stored
 *  lowercase; the form matches its buttons case-insensitively. */
function fromRow(row) {
  return {
    commodities: toArray(row.commodities),
    regions: toArray(row.regions),
    currencies: toArray(row.currencies),
    keywords: toArray(row.keywords),
    websiteURLs: toArray(row.website_urls),
    alertFrequency: row.alert_frequency || 'daily',
    alertThreshold: row.alert_threshold || 'medium',
    pushNotifications: row.push_notifications !== false,
    emailAlerts: Boolean(row.email_alerts),
    lastUpdated: row.updated_at || null,
  };
}

/**
 * Push the local preferences to the account. Returns true if the row landed.
 *
 * Conflict target is user_id, which carries a UNIQUE constraint — so this is
 * one row per account, updated in place, and running it twice is harmless.
 */
export async function pushAlertPreferences(prefs) {
  if (!supabase) return false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('alert_preferences')
      .upsert(toRow(prefs, user.id), { onConflict: 'user_id' });

    if (error) {
      console.warn('alert preferences sync failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('alert preferences sync failed:', err?.message ?? err);
    return false;
  }
}

/**
 * Read the account's preferences, or null if there are none to read.
 *
 * null covers every "nothing to apply" case — signed out, offline, no row yet
 * — so the caller keeps whatever it loaded from AsyncStorage instead of
 * wiping a good local copy with an empty remote one.
 */
export async function pullAlertPreferences() {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // maybeSingle: no row is the ordinary state for a new account, and
    // .single() reports it as an error.
    const { data, error } = await supabase
      .from('alert_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return null;
    return fromRow(data);
  } catch (err) {
    console.warn('alert preferences fetch failed:', err?.message ?? err);
    return null;
  }
}
