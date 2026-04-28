'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Subscription {
  id: string;
  display_name: string;
  description_normalized: string;
  current_amount: number;
  previous_amount: number | null;
  frequency: 'monthly' | 'annual';
  last_occurrence_date: string;
  occurrence_count: number;
  price_change_detected: boolean;
  dismissed_at: string | null;
}

interface SubscriptionsData {
  subscriptions: Subscription[];
  total_monthly: number;
  total_annual_equivalent: number;
}

export function useSubscriptions() {
  const [data, setData] = useState<SubscriptionsData>({
    subscriptions: [],
    total_monthly: 0,
    total_annual_equivalent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await window.fetch('/api/subscriptions');
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as SubscriptionsData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar assinaturas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const dismiss = useCallback(
    async (id: string) => {
      const res = await window.fetch(`/api/subscriptions/${id}/dismiss`, { method: 'PATCH' });
      if (!res.ok) throw new Error(await res.text());
      // Optimistic: remove from local state
      setData((prev) => ({
        ...prev,
        subscriptions: prev.subscriptions.filter((s) => s.id !== id),
        total_monthly:
          prev.total_monthly -
          (prev.subscriptions.find((s) => s.id === id)?.frequency === 'monthly'
            ? (prev.subscriptions.find((s) => s.id === id)?.current_amount ?? 0)
            : (prev.subscriptions.find((s) => s.id === id)?.current_amount ?? 0) / 12),
      }));
    },
    [],
  );

  return {
    subscriptions: data.subscriptions,
    total_monthly: data.total_monthly,
    total_annual_equivalent: data.total_annual_equivalent,
    isLoading,
    error,
    dismiss,
    refresh: fetch,
  };
}
