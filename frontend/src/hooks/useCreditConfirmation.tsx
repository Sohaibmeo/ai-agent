import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { CreditConfirmationModal } from '../components/credit/CreditConfirmationModal';

type CreditConfirmationOptions = {
  cost: number;
  title: string;
  detail?: string;
  insufficient?: boolean;
  ctaLabel?: string;
  onRecharge?: () => void;
};

type PendingConfirmation = CreditConfirmationOptions & {
  resolve: (value: boolean) => void;
};

type CreditConfirmationContextValue = {
  requestCreditConfirmation: (options: CreditConfirmationOptions) => Promise<boolean>;
};

const CreditConfirmationContext = createContext<CreditConfirmationContextValue | null>(null);

export function CreditConfirmationProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);

  const requestCreditConfirmation = useCallback(
    (options: CreditConfirmationOptions) => {
      return new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
      });
    },
    [],
  );

  const handleClose = (confirmed: boolean) => {
    setPending((current) => {
      if (current) {
        current.resolve(confirmed);
      }
      return null;
    });
  };

  return (
    <CreditConfirmationContext.Provider value={{ requestCreditConfirmation }}>
      {children}
      {pending && (
        <CreditConfirmationModal
          cost={pending.cost}
          title={pending.title}
          detail={pending.detail}
          insufficient={pending.insufficient}
          ctaLabel={pending.ctaLabel}
          onRecharge={() => {
            pending.onRecharge?.();
            handleClose(false);
          }}
          onConfirm={() => handleClose(true)}
          onCancel={() => handleClose(false)}
        />
      )}
    </CreditConfirmationContext.Provider>
  );
}

export function useCreditConfirmation() {
  const ctx = useContext(CreditConfirmationContext);
  if (!ctx) {
    throw new Error('useCreditConfirmation must be used within CreditConfirmationProvider');
  }
  return ctx;
}
