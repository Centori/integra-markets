"use client";

// The only interactive part of the billing page, so it is the only client
// component on it.
//
// The session URL is created on demand rather than rendered into the page:
// Stripe's portal links are one-time and short-lived, so a URL baked into the
// HTML would be expired by the time anyone clicked a bookmarked copy of it.

import { useState } from "react";
import { createBillingPortalSessionAction } from "@/app/api-keys/actions";

export default function BillingPortalButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const url = await createBillingPortalSessionAction();
      window.location.href = url;
    } catch (err) {
      // The backend's 409 message says WHERE this account's billing actually
      // lives — App Store, comp grant, or nothing yet — so it is shown as
      // written instead of replaced with a generic failure. Server actions
      // surface it prefixed with the status; trim that off.
      const raw = err instanceof Error ? err.message : "Couldn't open the billing portal.";
      setError(raw.replace(/^\d{3}\s*/, "").replace(/^\{"detail":"?|"?\}$/g, ""));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="rounded-md bg-accent-positive px-4 py-2 text-sm font-semibold text-bg-primary transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Opening Stripe…" : "Manage billing"}
      </button>
      <p className="text-xs text-text-muted">
        Opens Stripe&apos;s hosted portal: invoices, payment method, plan changes
        and cancellation.
      </p>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-accent-warning/50 bg-bg-secondary p-4 text-sm text-text-secondary"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
