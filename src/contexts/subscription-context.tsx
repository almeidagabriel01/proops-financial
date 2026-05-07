'use client';

import { createContext, useContext } from 'react';

interface SubscriptionContextValue {
  subscriptionStatus: string | null;
  plan: string | null;
  trialEndsAt: string | null;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscriptionStatus: null,
  plan: null,
  trialEndsAt: null,
});

export function SubscriptionProvider({
  children,
  subscriptionStatus,
  plan,
  trialEndsAt,
}: {
  children: React.ReactNode;
  subscriptionStatus: string | null;
  plan: string | null;
  trialEndsAt: string | null;
}) {
  return (
    <SubscriptionContext.Provider value={{ subscriptionStatus, plan, trialEndsAt }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionStatus(): string | null {
  return useContext(SubscriptionContext).subscriptionStatus;
}

export function useSubscriptionContext() {
  return useContext(SubscriptionContext);
}
