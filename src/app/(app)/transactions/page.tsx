'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransactionList } from '@/components/transactions/transaction-list';
import { useTransactions } from '@/hooks/use-transactions';
import { getMonthBounds, getPrevMonthBounds } from '@/lib/utils/format';

type PeriodKey = 'current' | 'previous' | 'custom';
type TypeFilter = 'all' | 'credit' | 'debit';

function getPeriodDates(
  period: PeriodKey,
  customStart?: string,
  customEnd?: string,
): { start?: string; end?: string } {
  if (period === 'current') {
    const { start, end } = getMonthBounds();
    return { start, end };
  }
  if (period === 'previous') {
    const { start, end } = getPrevMonthBounds();
    return { start, end };
  }
  // custom: only apply when both dates are set
  if (period === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }
  return {};
}

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPeriod = (searchParams.get('period') as PeriodKey) ?? 'current';
  const initialType = (searchParams.get('type') as TypeFilter) ?? 'all';
  const initialSearch = searchParams.get('search') ?? '';
  const initialCustomStart = searchParams.get('start') ?? '';
  const initialCustomEnd = searchParams.get('end') ?? '';

  const [period, setPeriod] = useState<PeriodKey>(initialPeriod);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialType);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [customStart, setCustomStart] = useState(initialCustomStart);
  const [customEnd, setCustomEnd] = useState(initialCustomEnd);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce search input (AC3)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  // Sync filters to URL search params (AC2)
  const syncToUrl = useCallback(
    (p: PeriodKey, t: TypeFilter, s: string, cs: string, ce: string) => {
      const params = new URLSearchParams();
      if (p !== 'current') params.set('period', p);
      if (t !== 'all') params.set('type', t);
      if (s) params.set('search', s);
      if (p === 'custom' && cs) params.set('start', cs);
      if (p === 'custom' && ce) params.set('end', ce);
      router.replace(`/transactions${params.size ? '?' + params.toString() : ''}`, {
        scroll: false,
      });
    },
    [router],
  );

  function handlePeriodChange(value: PeriodKey | null) {
    if (!value) return;
    setPeriod(value);
    syncToUrl(value, typeFilter, debouncedSearch, customStart, customEnd);
  }

  function handleTypeChange(value: TypeFilter | null) {
    if (!value) return;
    setTypeFilter(value);
    syncToUrl(period, value, debouncedSearch, customStart, customEnd);
  }

  function handleCustomStartChange(value: string) {
    setCustomStart(value);
    syncToUrl(period, typeFilter, debouncedSearch, value, customEnd);
  }

  function handleCustomEndChange(value: string) {
    setCustomEnd(value);
    syncToUrl(period, typeFilter, debouncedSearch, customStart, value);
  }

  // Filters object for the hook
  const periodDates = useMemo(
    () => getPeriodDates(period, customStart, customEnd),
    [period, customStart, customEnd],
  );
  const filters = useMemo(
    () => ({
      ...periodDates,
      type: typeFilter,
      search: debouncedSearch,
    }),
    [periodDates, typeFilter, debouncedSearch],
  );

  const { transactions, isLoading, isLoadingMore, error, hasMore, loadMore, refresh } =
    useTransactions(filters);

  return (
    <div className="flex flex-col">
      {/* Filter bar (AC2) */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="space-y-2">
          {/* Search (AC3) */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por descrição..."
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {/* Period + Type filters */}
          <div className="flex gap-2">
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="h-9 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Mês atual</SelectItem>
                <SelectItem value="previous">Mês anterior</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-9 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="credit">Receitas</SelectItem>
                <SelectItem value="debit">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom date range (AC2) — shown only when period === 'custom' */}
          {period === 'custom' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] text-muted-foreground">De</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => handleCustomStartChange(e.target.value)}
                  max={customEnd || undefined}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[10px] text-muted-foreground">Até</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => handleCustomEndChange(e.target.value)}
                  min={customStart || undefined}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction list (AC1, AC6, AC7) */}
      <TransactionList
        transactions={transactions}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        error={error}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onRefresh={refresh}
      />
    </div>
  );
}
