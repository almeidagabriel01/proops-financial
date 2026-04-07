'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransactionList } from '@/components/transactions/transaction-list';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { useTransactions } from '@/hooks/use-transactions';
import { getMonthBounds, getPrevMonthBounds } from '@/lib/utils/format';
import { CATEGORIES } from '@/lib/billing/plans';
import { CATEGORY_CONFIG } from '@/lib/utils/categories';
import type { Category } from '@/lib/billing/plans';

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
  const initialCategory = searchParams.get('category') ?? '';

  const [period, setPeriod] = useState<PeriodKey>(initialPeriod);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialType);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [customStart, setCustomStart] = useState(initialCustomStart);
  const [customEnd, setCustomEnd] = useState(initialCustomEnd);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce search input (AC3)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  // Sync filters to URL search params
  const syncToUrl = useCallback(
    (p: PeriodKey, t: TypeFilter, s: string, cs: string, ce: string, cat: string) => {
      const params = new URLSearchParams();
      if (p !== 'current') params.set('period', p);
      if (t !== 'all') params.set('type', t);
      if (s) params.set('search', s);
      if (p === 'custom' && cs) params.set('start', cs);
      if (p === 'custom' && ce) params.set('end', ce);
      if (cat) params.set('category', cat);
      router.replace(`/transactions${params.size ? '?' + params.toString() : ''}`, {
        scroll: false,
      });
    },
    [router],
  );

  function handlePeriodChange(value: PeriodKey | null) {
    if (!value) return;
    setPeriod(value);
    syncToUrl(value, typeFilter, debouncedSearch, customStart, customEnd, categoryFilter);
  }

  function handleTypeChange(value: TypeFilter | null) {
    if (!value) return;
    setTypeFilter(value);
    syncToUrl(period, value, debouncedSearch, customStart, customEnd, categoryFilter);
  }

  function handleCustomStartChange(value: string) {
    setCustomStart(value);
    syncToUrl(period, typeFilter, debouncedSearch, value, customEnd, categoryFilter);
  }

  function handleCustomEndChange(value: string) {
    setCustomEnd(value);
    syncToUrl(period, typeFilter, debouncedSearch, customStart, value, categoryFilter);
  }

  function handleCategoryChange(value: string | null) {
    const cat = !value || value === 'all' ? '' : value;
    setCategoryFilter(cat);
    syncToUrl(period, typeFilter, debouncedSearch, customStart, customEnd, cat);
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
      category: categoryFilter || undefined,
    }),
    [periodDates, typeFilter, debouncedSearch, categoryFilter],
  );

  const { transactions, isLoading, isLoadingMore, error, hasMore, loadMore, refresh } =
    useTransactions(filters);

  const [formOpen, setFormOpen] = useState(false);

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

          {/* Category filter */}
          <div className="flex items-center gap-2">
            <Select
              value={categoryFilter || 'all'}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="h-9 flex-1 text-xs">
                <SelectValue placeholder="Por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_CONFIG[cat as Category].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 shrink-0"
                aria-label="Limpar filtro de categoria"
                onClick={() => handleCategoryChange('all')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
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

      {/* Transaction list */}
      <TransactionList
        transactions={transactions}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        error={error}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onRefresh={refresh}
        onMutated={refresh}
      />

      {/* FAB — add transaction */}
      <Button
        size="lg"
        className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full p-0 shadow-lg"
        aria-label="Adicionar transação"
        onClick={() => setFormOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={refresh}
      />
    </div>
  );
}
