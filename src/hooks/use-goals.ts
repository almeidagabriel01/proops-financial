'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  status: 'active' | 'completed' | 'canceled';
  created_at: string;
  updated_at: string;
}

export function useGoals() {
  const [data, setData] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/goals');
      if (!res.ok) throw new Error('Erro ao carregar objetivos');
      const json = (await res.json()) as { data: Goal[] };
      setData(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const create = useCallback(
    async (payload: { name: string; target_amount: number; deadline: string; current_amount?: number }) => {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? 'Erro ao criar objetivo');
      }
      await fetchData();
    },
    [fetchData],
  );

  const update = useCallback(
    async (id: string, payload: Partial<Pick<Goal, 'name' | 'target_amount' | 'current_amount' | 'deadline' | 'status'>>) => {
      const res = await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? 'Erro ao atualizar objetivo');
      }
      await fetchData();
    },
    [fetchData],
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error('Erro ao excluir objetivo');
      await fetchData();
    },
    [fetchData],
  );

  const markComplete = useCallback(
    async (id: string) => {
      await update(id, { status: 'completed' });
    },
    [update],
  );

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
    create,
    update,
    remove,
    markComplete,
  };
}
