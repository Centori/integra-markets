"use client";

import { useState } from "react";
import { createStripeCheckout } from "@/lib/api";

type Props = {
  currentTier: string;
  jwt: string;
};

export default function ApiTierPanel({ currentTier, jwt }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isActive = currentTier === "api";

  const handleSubscribe = async () => {
    setError(null);
    setLoading(true);
    try {
      const { url } = await createStripeCheckout(jwt, "api");
      // Redirect the whole tab to Stripe-hosted checkout.
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-divider bg-bg-secondary p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-2xl font-semibold">API Access</h2>
          <p className="mt-1 text-text-secondary">
            Programmatic subscription — sold via Stripe on the web.
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold text-accent-primary">$99</div>
          <div className="text-xs text-text-secondary">/month</div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded border border-accent-negative bg-bg-primary p-3 text-sm">
          {error}
        </div>
      ) : null}

      <button
        onClick={handleSubscribe}
        disabled={loading || isActive}
        className="mt-6 w-full rounded-lg bg-accent-primary py-3 text-center text-sm font-semibold text-bg-primary transition-opacity disabled:opacity-50"
      >
        {isActive
          ? "You already have API access"
          : loading
          ? "Redirecting to Stripe…"
          : "Subscribe — $99/mo"}
      </button>

      {!isActive ? (
        <p className="mt-3 text-center text-xs text-text-secondary">
          You&apos;ll be taken to Stripe&apos;s secure checkout. Cancel any time.
        </p>
      ) : null}
    </div>
  );
}
