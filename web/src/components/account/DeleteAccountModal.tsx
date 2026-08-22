'use client';

/**
 * Account-deletion confirmation, the web counterpart of mobile's
 * `app/components/DeleteAccountModal.tsx`.
 *
 * Deletion is scheduled, not immediate: the Edge Function sets a 30-day window
 * the user can cancel. The copy says so plainly, because "delete my account"
 * that silently means "in 30 days" is worse than either alternative — a user
 * who wanted it gone now needs to know it isn't, and a user who clicked by
 * mistake needs to know they can undo it.
 *
 * Requires typing DELETE. A destructive, account-scoped action should not be
 * reachable by one mistaken tap, and a checkbox is too easy to click through.
 */

import { useEffect, useRef, useState } from 'react';
import { requestAccountDeletion } from '@/lib/accountService';

const CONFIRM_WORD = 'DELETE';

export default function DeleteAccountModal({
    onClose,
    onScheduled,
}: {
    onClose: () => void;
    onScheduled: (expiresAt: string) => void;
}) {
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // The parent mounts this only while it should be visible, so state resets
    // naturally on mount — no effect needed to clear a previous attempt's typed
    // word or error. Focus is the one thing that does need the DOM to exist.
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Escape closes, matching every other dismissible surface on the site.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busy) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [busy, onClose]);

    const armed = confirm.trim().toUpperCase() === CONFIRM_WORD && !busy;

    const submit = async () => {
        if (!armed) return;
        setBusy(true);
        setError('');
        const res = await requestAccountDeletion();
        if (!res.ok) {
            setError(
                res.error === 'not_authenticated'
                    ? 'Your session expired. Sign in again and retry.'
                    : `Could not schedule deletion: ${res.error}`
            );
            setBusy(false);
            return;
        }
        onScheduled(res.data.expires_at);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => !busy && onClose()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="del-title"
                className="w-full max-w-md bg-[#161616] border border-[#333] rounded-2xl p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="del-title" className="text-lg font-semibold text-white mb-2">
                    Delete your account
                </h2>

                <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                    Your account will be scheduled for deletion and permanently removed in{' '}
                    <span className="text-white font-medium">30 days</span>. Until then you can
                    cancel at any time from this site or the app, and nothing is lost.
                </p>

                <ul className="text-sm text-zinc-400 space-y-1.5 mb-5 list-disc pl-5">
                    <li>Your profile, bookmarks and alerts are removed</li>
                    <li>Any active subscription should be cancelled separately</li>
                    <li>After 30 days this cannot be undone</li>
                </ul>

                <label htmlFor="del-confirm" className="block text-xs text-zinc-500 mb-1.5">
                    Type <span className="text-white font-semibold">{CONFIRM_WORD}</span> to confirm
                </label>
                <input
                    id="del-confirm"
                    ref={inputRef}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    disabled={busy}
                    autoComplete="off"
                    className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg py-2.5 px-3.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#F05454]/60 transition-colors disabled:opacity-50"
                    placeholder={CONFIRM_WORD}
                />

                <div aria-live="polite">
                    {error && (
                        <p className="mt-3 text-sm text-[#F05454] bg-[#F05454]/10 border border-[#F05454]/20 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-[#242424] hover:bg-[#2e2e2e] border border-[#333] transition-colors disabled:opacity-50"
                    >
                        Keep my account
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!armed}
                        className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#F05454] hover:bg-[#d84848] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {busy ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            'Schedule deletion'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
