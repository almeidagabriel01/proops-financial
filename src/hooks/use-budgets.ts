'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
  // Calculados server-side
  spent: number;
  remaining: number;
  percentage: number;
}

export function useBudgets(month?: string) {
  const [data, setData] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(
    month ?? new Date().toISOString().slice(0, 7)
  );

  const fetchData = useCallback(async (m: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/budgets?month=${m}`);
      if (!res.ok) throw new Error('Erro ao carregar orçamentos');
      const json = await res.json() as { data: Budget[] };
      setData(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(currentMonth);
  }, [fetchData, currentMonth]);

  const create = useCallback(async (category: string, monthly_limit: number) => {
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, monthly_limit }),
    });
    if (!res.ok) {
      const json = await res.json() as { error?: string };
      throw new Error(json.error ?? 'Erro ao criar orçamento');
    }
    await fetchData(currentMonth);
  }, [fetchData, currentMonth]);

  const update = useCallback(async (id: string, monthly_limit: number) => {
    const res = await fetch(`/api/budgets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthly_limit }),
    });
    if (!res.ok) {
      const json = await res.json() as { error?: string };
      throw new Error(json.error ?? 'Erro ao atualizar orçamento');
    }
    await fetchData(currentMonth);
  }, [fetchData, currentMonth]);

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error('Erro ao excluir orçamento');
    await fetchData(currentMonth);
  }, [fetchData, currentMonth]);

  return {
    data,
    isLoading,
    error,
    currentMonth,
    setCurrentMonth,
    refresh: () => fetchData(currentMonth),
    create,
    update,
    remove,
  };
}
