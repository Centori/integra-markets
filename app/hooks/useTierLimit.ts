// useTierLimit — read a specific limit + current usage for one dimension.
//
// Usage:
//   const { max, current, canAdd, remaining } = useTierLimit('bookmarks');
//   ...
//   <TouchableOpacity disabled={!canAdd}>
//     <Text>Bookmark {remaining !== null && `(${remaining} left)`}</Text>
//   </TouchableOpacity>

import { useMemo } from 'react';
import { useBookmarks } from '../providers/BookmarkProvider';
import { useEntitlement } from './useEntitlement';
import type { TierLimits } from '../services/entitlementGate';

export type LimitDim = keyof Pick<
  TierLimits,
  'bookmarks' | 'alerts' | 'commodities' | 'customRssUrls' | 'aiOverlayPerDay' | 'articlesPerSession'
>;

type LimitInfo = {
  max: number;
  current: number;
  canAdd: boolean;
  remaining: number | null; // null when unlimited (max === Infinity)
};

export function useTierLimit(dimension: LimitDim, currentOverride?: number): LimitInfo {
  const { limits } = useEntitlement();
  const bookmarks = useBookmarks();

  const current = useMemo(() => {
    if (typeof currentOverride === 'number') return currentOverride;
    switch (dimension) {
      case 'bookmarks': return bookmarks?.bookmarks?.length ?? 0;
      // Other dimensions expect callers to pass currentOverride from their own
      // state (alerts screen, commodity tracker, etc.).
      default: return 0;
    }
  }, [dimension, currentOverride, bookmarks?.bookmarks?.length]);

  const max = limits[dimension];
  const isUnlimited = !Number.isFinite(max);

  return {
    max,
    current,
    canAdd: isUnlimited || current < max,
    remaining: isUnlimited ? null : Math.max(0, max - current),
  };
}
