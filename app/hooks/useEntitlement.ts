// useEntitlement — single hook every gated screen calls to learn the
// current user's tier + limits. Cached in-memory + refreshed on foreground.

import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { Tier, TierLimits } from '../services/entitlementGate';
import { limitsFor } from '../services/entitlementGate';
import { fetchTier, initSubscriptions } from '../services/subscriptionService';

let _globalTier: Tier = 'free_trial';
const _listeners = new Set<(t: Tier) => void>();

function setGlobal(tier: Tier) {
  _globalTier = tier;
  _listeners.forEach((cb) => cb(tier));
}

export function getCurrentTier(): Tier {
  return _globalTier;
}

// Kickoff — call once from MainApp on startup.
export async function bootstrapEntitlements(userId?: string): Promise<void> {
  await initSubscriptions(userId);
  const t = await fetchTier();
  setGlobal(t);
}

export function useEntitlement(): { tier: Tier; limits: TierLimits; refresh: () => Promise<void> } {
  const [tier, setTier] = useState<Tier>(_globalTier);

  useEffect(() => {
    const cb = (t: Tier) => setTier(t);
    _listeners.add(cb);
    return () => { _listeners.delete(cb); };
  }, []);

  // On foreground return, refresh in case the user purchased on another device
  // or the trial expired while the app was backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        const t = await fetchTier();
        if (t !== _globalTier) setGlobal(t);
      }
    });
    return () => sub.remove();
  }, []);

  const refresh = useCallback(async () => {
    const t = await fetchTier();
    if (t !== _globalTier) setGlobal(t);
  }, []);

  return { tier, limits: limitsFor(tier), refresh };
}
