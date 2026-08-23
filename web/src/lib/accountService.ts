/**
 * Account deletion — the web counterpart of the mobile service at
 * `app/services/accountService.ts` (integra-markets-2).
 *
 * Deliberately mirrors mobile's contract call-for-call: the same two Supabase
 * Edge Functions and the same `account_deletion_requests` table, so a deletion
 * scheduled on one surface is visible and cancellable on the other. Mobile
 * shipped this in build 88; web had no deletion path at all, which left a user
 * able to schedule deletion on their phone and keep using the site — and left
 * web-only users with no way to exercise a deletion right at all.
 *
 * The 30-day window and all authorization live in the Edge Functions and RLS,
 * not here. This module is a typed transport, nothing more.
 */

import { createClient } from '@/lib/supabase';

/**
 * Mirrors the row returned by /supabase/functions/delete-account.
 * `requested_at` and `expires_at` are ISO-8601 UTC strings.
 */
export type DeletionRequest = {
    requested_at: string;
    expires_at: string;
};

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string };

/**
 * Schedule the current user's account for deletion in 30 days.
 *
 * Idempotent: calling twice returns the same expires_at. The user remains
 * signed in and their session is unaffected — the UI should switch to the
 * pending-deletion banner rather than signing them out, so the 30-day window
 * stays cancellable from the same place it was started.
 */
export async function requestAccountDeletion(): Promise<ServiceResult<DeletionRequest>> {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke<DeletionRequest>('delete-account', {
        method: 'POST',
    });
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: 'empty_response' };
    return { ok: true, data };
}

/**
 * Cancel a pending deletion. Safe to call even if no request exists —
 * the function treats "nothing to restore" as success.
 */
export async function restoreAccount(): Promise<ServiceResult<{ restored: true }>> {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke<{ restored: true }>('restore-account', {
        method: 'POST',
    });
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: 'empty_response' };
    return { ok: true, data };
}

/**
 * Returns the current user's pending deletion request, or null if none.
 * Called after sign-in to decide whether to show the restore banner.
 *
 * Reads via RLS — users can only ever see their own request.
 */
export async function getPendingDeletion(): Promise<ServiceResult<DeletionRequest | null>> {
    const supabase = createClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
        return { ok: false, error: userErr?.message ?? 'not_authenticated' };
    }

    const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('requested_at, expires_at')
        .eq('user_id', userData.user.id)
        .maybeSingle();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data ?? null };
}

/** Whole days remaining before `expires_at`, floored at 0. */
export function daysUntil(expiresAt: string): number {
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86_400_000));
}
