// Global paywall opener. Wrap the app in <PaywallProvider> once (in MainApp),
// then any component can call `usePaywall().open({ highlightTier: 'basic' })`
// to present the PaywallScreen as a modal.

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { Modal } from 'react-native';
import PaywallScreen from './PaywallScreen';
import type { Tier } from '../services/entitlementGate';

type OpenOptions = {
  highlightTier?: Tier;
};

type PaywallContextValue = {
  open: (opts?: OpenOptions) => void;
  close: () => void;
  isOpen: boolean;
};

const PaywallContext = createContext<PaywallContextValue | null>(null);

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightTier, setHighlightTier] = useState<Tier | undefined>();

  const open = useCallback((opts?: OpenOptions) => {
    setHighlightTier(opts?.highlightTier);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setHighlightTier(undefined);
  }, []);

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <PaywallContext.Provider value={value}>
      {children}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
      >
        <PaywallScreen onClose={close} highlightTier={highlightTier} />
      </Modal>
    </PaywallContext.Provider>
  );
}

export function usePaywall(): PaywallContextValue {
  const ctx = useContext(PaywallContext);
  if (!ctx) {
    // Graceful degradation — if provider isn't mounted, opens are no-ops.
    return { open: () => {}, close: () => {}, isOpen: false };
  }
  return ctx;
}
