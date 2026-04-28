'use client';

import { useState, useEffect, useCallback } from 'react';

export type MatchType = 'contains' | 'exact' | 'starts_with';

export interface CategorizationRule {
  id: string;
  user_id: string;
  pattern: string;
  match_type: MatchType;
  category: string;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

type ApiResponse = {
  data: CategorizationRule[];
  activeCount: number;
  limit: number;
};

export function useCategorizationRules() {
  const [data, setData] = useState<CategorizationRule[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [limit, setLimit] = useState<number>(5);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/categorization-rules');
      if (!res.ok) throw new Error('Erro ao carregar regras');
      const json = await res.json() as ApiResponse;
      setData(json.data ?? []);
      setActiveCount(json.activeCount ?? 0);
      setLimit(json.limit ?? 5);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const create = useCallback(async (values: {
    pattern: string;
    match_type: MatchType;
    category: string;
    priority: number;
    active: boolean;
  }) => {
    const res = await fetch('/api/categorization-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const json = await res.json() as { data?: CategorizationRule; error?: string };
    if (!res.ok) throw new Error(json.error ?? 'Erro ao criar regra');
    await fetchData();
    return json.data!;
  }, [fetchData]);

  const update = useCallback(async (id: string, updates: Partial<CategorizationRule>) => {
    const res = await fetch(`/api/categorization-rules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await res.json() as { data?: CategorizationRule; error?: string };
    if (!res.ok) throw new Error(json.error ?? 'Erro ao atualizar regra');
    await fetchData();
    return json.data!;
  }, [fetchData]);

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/categorization-rules/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) {
      const json = await res.json() as { error?: string };
      throw new Error(json.error ?? 'Erro ao excluir regra');
    }
    await fetchData();
  }, [fetchData]);

  const atLimit = limit !== Infinity && activeCount >= limit;

  return { data, activeCount, limit, atLimit, isLoading, error, create, update, remove, refresh: fetchData };
}
