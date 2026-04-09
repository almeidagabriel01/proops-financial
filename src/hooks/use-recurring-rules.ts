'use client';

import { useState, useEffect, useCallback } from 'react';

export interface RecurringRule {
  id: string;
  user_id: string;
  bank_account_id: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'annual';
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  status: 'active' | 'paused' | 'canceled';
  source: 'auto_detected' | 'manual';
  auto_detect_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export const FREQUENCY_LABELS: Record<RecurringRule['frequency'], string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  annual: 'Anual',
};

export function useRecurringRules(statusFilter?: string) {
  const [data, setData] = useState<RecurringRule[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/recurring?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar recorrentes');
      const json = await res.json() as { data: RecurringRule[]; total: number };
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const create = useCallback(async (payload: {
    description: string;
    amount: number;
    type: 'credit' | 'debit';
    category: string;
    frequency: RecurringRule['frequency'];
    start_date: string;
    end_date?: string | null;
    bank_account_id: string;
  }) => {
    const res = await fetch('/api/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json() as { error?: string };
      throw new Error(json.error ?? 'Erro ao criar recorrente');
    }
    await fetchData();
  }, [fetchData]);

  const updateStatus = useCallback(async (id: string, status: RecurringRule['status']) => {
    const res = await fetch(`/api/recurring/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const json = await res.json() as { error?: string };
      throw new Error(json.error ?? 'Erro ao atualizar recorrente');
    }
    await fetchData();
  }, [fetchData]);

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/recurring/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error('Erro ao excluir recorrente');
    await fetchData();
  }, [fetchData]);

  return { data, total, isLoading, error, refresh: fetchData, create, updateStatus, remove };
}
