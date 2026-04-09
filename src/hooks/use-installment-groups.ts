'use client';

import { useState, useEffect, useCallback } from 'react';

export interface InstallmentGroup {
  id: string;
  user_id: string;
  bank_account_id: string;
  description: string;
  total_amount: number;
  installment_count: number;
  installment_amount: number;
  first_date: string;
  category: string;
  source: 'import' | 'manual';
  source_transaction_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  scheduled_transactions?: Array<{
    id: string;
    installment_number: number;
    status: string;
    due_date: string;
    amount: number;
    paid_at: string | null;
  }>;
}

export function useInstallmentGroups() {
  const [data, setData] = useState<InstallmentGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/installment-groups?limit=100');
      if (!res.ok) throw new Error('Erro ao carregar parcelas');
      const json = await res.json() as { data: InstallmentGroup[]; total: number };
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const create = useCallback(async (payload: {
    description: string;
    total_amount: number;
    installment_count: number;
    installment_amount: number;
    first_date: string;
    category: string;
    bank_account_id: string;
    current_installment_number?: number;
  }) => {
    const res = await fetch('/api/installment-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json() as { error?: string };
      throw new Error(json.error ?? 'Erro ao criar grupo de parcelas');
    }
    await fetchData();
  }, [fetchData]);

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/installment-groups/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error('Erro ao excluir grupo de parcelas');
    await fetchData();
  }, [fetchData]);

  return { data, total, isLoading, error, refresh: fetchData, create, remove };
}
