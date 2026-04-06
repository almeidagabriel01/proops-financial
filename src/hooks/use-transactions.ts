'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

export type Transaction = Tables<'transactions'>;

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: 'all' | 'credit' | 'debit';
  search?: string;
}

export interface TransactionSummary {
  income: number;
  expenses: number;
  balance: number;
}

const PAGE_SIZE = 50;

export function useTransactions(filters: TransactionFilters = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const offsetRef = useRef(0);
  const supabase = createClient();

  const buildQuery = useCallback(
    (offset: number, limit: number) => {
      let q = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (filters.startDate) q = q.gte('date', filters.startDate);
      if (filters.endDate) q = q.lte('date', filters.endDate);
      if (filters.type && filters.type !== 'all') q = q.eq('type', filters.type);
      if (filters.search?.trim()) {
        // Use description_search (generated column: lower + unaccent) for accent-insensitive search.
        // Normalize the search term client-side to match the stored format.
        const normalized = filters.search
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        q = q.ilike('description_search', `%${normalized}%`);
      }

      return q;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.startDate, filters.endDate, filters.type, filters.search],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    offsetRef.current = 0;

    try {
      const { data, count, error: err } = await buildQuery(0, PAGE_SIZE);
      if (err) throw err;
      setTransactions(data ?? []);
      setTotal(count ?? 0);
      setHasMore((count ?? 0) > PAGE_SIZE);
      offsetRef.current = PAGE_SIZE;
    } catch {
      setError('Erro ao carregar transações. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      const { data, error: err } = await buildQuery(offsetRef.current, PAGE_SIZE);
      if (err) throw err;
      setTransactions((prev) => [...prev, ...(data ?? [])]);
      offsetRef.current += PAGE_SIZE;
      setHasMore(offsetRef.current < total);
    } catch {
      setError('Erro ao carregar mais transações.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [buildQuery, hasMore, isLoadingMore, total]);

  useEffect(() => {
    load();
  }, [load]);

  return { transactions, isLoading, isLoadingMore, error, hasMore, total, loadMore, refresh: load };
}

export async function getTransactionSummary(
  supabase: ReturnType<typeof createClient>,
  startDate: string,
  endDate: string,
): Promise<TransactionSummary> {
  const { data } = await supabase
    .from('transactions')
    .select('amount, type')
    .gte('date', startDate)
    .lte('date', endDate);

  const rows = data ?? [];
  const income = rows.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const expenses = rows
    .filter((t) => t.type === 'debit')
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return { income, expenses, balance: income - expenses };
}
