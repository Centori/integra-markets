'use client';

/**
 * Persistent banner shown while an account deletion is pending, the web
 * counterpart of mobile's `app/components/PendingDeletionBanner.tsx`.
 *
 * It is deliberately not dismissible. A user with 4 days left before their
 * account is destroyed should see that on every visit — a banner they can
 * close is a banner they close once and then never think about again.
 *
 * Because both surfaces read the same `account_deletion_requests` row, a
 * deletion scheduled on the phone shows here too, and cancelling from either
 * side clears both.
 */

import { useState } from 'react';
import { restoreAccount, daysUntil } from '@/lib/accountService';

export default function PendingDeletionBanner({
    expiresAt,
    onRestored,
}: {
    expiresAt: string;
    onRestored: () => void;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const days = daysUntil(expiresAt);

    const restore = async () => {
        setBusy(true);
        setError('');
        const res = await restoreAccount();
        if (!res.ok) {
            setError('Could not cancel. Please try again.');
            setBusy(false);
            return;
        }
        onRestored();
    };

    return (
        <div
            role="status"
            className="bg-[#F05454]/10 border border-[#F05454]/30 rounded-xl px-4 py-3 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2"
        >
            <div className="min-w-0 flex-1">
                <p className="text-sm text-white font-medium">
                    {days === 0
                        ? 'Your account is scheduled for deletion today.'
                        : `Your account will be deleted in ${days} ${days === 1 ? 'day' : 'days'}.`}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                    {error || 'Cancel any time before then to keep everything as it is.'}
                </p>
            </div>

            <button
                type="button"
                onClick={restore}
                disabled={busy}
                className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-black bg-[#4ECCA3] hover:bg-[#45b393] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
                {busy ? (
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                    'Keep my account'
                )}
            </button>
        </div>
    );
}
