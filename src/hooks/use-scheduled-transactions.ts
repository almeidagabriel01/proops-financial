'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ScheduledTransaction {
  id: string;
  user_id: string;
  bank_account_id: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
  recurring_rule_id: string | null;
  installment_group_id: string | null;
  installment_number: number | null;
  paid_transaction_id: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Filters {
  status?: string;
  type?: string;
  from?: string;
  to?: string;
}

export function useScheduledTransactions(filters: Filters = {}) {
  const [data, setData] = useState<ScheduledTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filters.status) params.set('status', filters.status);
      if (filters.type) params.set('type', filters.type);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);

      const res = await fetch(`/api/scheduled?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar agendamentos');
      const json = await res.json() as { data: ScheduledTransaction[]; total: number };
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [filters.status, filters.type, filters.from, filters.to]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const markPaid = useCallback(async (id: string, paidDate?: string) => {
    const res = await fetch(`/api/scheduled/${id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paidDate ? { paid_date: paidDate } : {}),
    });
    if (!res.ok) {
      const json = await res.json() as { error?: string };
      throw new Error(json.error ?? 'Erro ao marcar como pago');
    }
    await fetchData();
  }, [fetchData]);

  const cancel = useCallback(async (id: string) => {
    const res = await fetch(`/api/scheduled/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'canceled' }),
    });
    if (!res.ok) {
      const json = await res.json() as { error?: string };
      throw new Error(json.error ?? 'Erro ao cancelar agendamento');
    }
    await fetchData();
  }, [fetchData]);

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/scheduled/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error('Erro ao excluir agendamento');
    await fetchData();
  }, [fetchData]);

  const create = useCallback(async (payload: {
    bank_account_id: string;
    description: string;
    amount: number;
    type: 'credit' | 'debit';
    category: string;
    due_date: string;
    notes?: string;
    recurring_rule_id?: string | null;
    installment_group_id?: string | null;
    installment_number?: number | null;
  }) => {
    const res = await fetch('/api/scheduled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json() as { error?: string };
      throw new Error(json.error ?? 'Erro ao criar agendamento');
    }
    await fetchData();
  }, [fetchData]);

  return { data, total, isLoading, error, refresh: fetchData, markPaid, cancel, remove, create };
}
