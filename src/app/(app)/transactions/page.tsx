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
} from '@/components/ui/select';
import { TransactionList } from '@/components/transactions/transaction-list';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { useTransactions } from '@/hooks/use-transactions';
import { getMonthBounds, getPrevMonthBounds } from '@/lib/utils/format';
import { CATEGORIES } from '@/lib/billing/plans';
import { DatePicker } from '@/components/ui/date-picker';
import { CATEGORY_CONFIG } from '@/lib/utils/categories';
import type { Category } from '@/lib/billing/plans';

type PeriodKey = 'current' | 'previous' | 'custom';
type TypeFilter = 'all' | 'credit' | 'debit';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  current: 'Mês atual',
  previous: 'Mês anterior',
  custom: 'Personalizado',
};
const TYPE_LABELS: Record<TypeFilter, string> = {
  all: 'Todos',
  credit: 'Receitas',
  debit: 'Despesas',
};

const VALID_PERIODS: PeriodKey[] = ['current', 'previous', 'custom'];
const VALID_TYPES: TypeFilter[] = ['all', 'credit', 'debit'];

function getPeriodDates(
  period: PeriodKey,
  customStart?: string,
  customEnd?: string,
): { startDate?: string; endDate?: string } {
  if (period === 'current') {
    const { start, end } = getMonthBounds();
    return { startDate: start, endDate: end };
  }
  if (period === 'previous') {
    const { start, end } = getPrevMonthBounds();
    return { startDate: start, endDate: end };
  }
  // custom: only apply when both dates are set
  if (period === 'custom' && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd };
  }
  return {};
}

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawPeriod = searchParams.get('period') as PeriodKey;
  const initialPeriod = VALID_PERIODS.includes(rawPeriod) ? rawPeriod : 'current';
  const rawType = searchParams.get('type') as TypeFilter;
  const initialType = VALID_TYPES.includes(rawType) ? rawType : 'all';
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
    <div className="flex w-full flex-col overflow-hidden">
      {/* Desktop hero header */}
      <div className="hidden lg:flex items-center justify-between shrink-0 px-8 pt-6 pb-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {transactions.length > 0 ? `${transactions.length} transações encontradas` : 'Gerencie suas movimentações'}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Nova transação
        </Button>
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-8">
        {/* Desktop: uma linha só */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" placeholder="Buscar..." className="pl-9 h-9 text-sm" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="h-9 w-40 text-xs">{PERIOD_LABELS[period]}</SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Mês atual</SelectItem>
              <SelectItem value="previous">Mês anterior</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-9 w-32 text-xs">{TYPE_LABELS[typeFilter]}</SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="credit">Receitas</SelectItem>
              <SelectItem value="debit">Despesas</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Select value={categoryFilter || 'all'} onValueChange={handleCategoryChange}>
              <SelectTrigger className="h-9 w-44 text-xs">{categoryFilter ? (CATEGORY_CONFIG[categoryFilter as Category]?.label ?? categoryFilter) : 'Todas as categorias'}</SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{CATEGORY_CONFIG[cat as Category].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryFilter && (
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0" aria-label="Limpar categoria" onClick={() => handleCategoryChange('all')}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {period === 'custom' && (
            <>
              <DatePicker value={customStart} onChange={handleCustomStartChange} max={customEnd || undefined} placeholder="Data inicial" className="w-36" />
              <span className="text-xs text-muted-foreground">até</span>
              <DatePicker value={customEnd} onChange={handleCustomEndChange} min={customStart || undefined} placeholder="Data final" className="w-36" />
            </>
          )}
        </div>

        {/* Mobile: stacked */}
        <div className="space-y-2 lg:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" placeholder="Buscar por descrição..." className="pl-9" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="h-9 flex-1 text-xs">{PERIOD_LABELS[period]}</SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Mês atual</SelectItem>
                <SelectItem value="previous">Mês anterior</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-9 flex-1 text-xs">{TYPE_LABELS[typeFilter]}</SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="credit">Receitas</SelectItem>
                <SelectItem value="debit">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Select value={categoryFilter || 'all'} onValueChange={handleCategoryChange}>
              <SelectTrigger className="h-9 flex-1 text-xs">{categoryFilter ? (CATEGORY_CONFIG[categoryFilter as Category]?.label ?? categoryFilter) : 'Por categoria'}</SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{CATEGORY_CONFIG[cat as Category].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryFilter && (
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0" aria-label="Limpar filtro de categoria" onClick={() => handleCategoryChange('all')}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {period === 'custom' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] text-muted-foreground">De</label>
                <input type="date" value={customStart} onChange={(e) => handleCustomStartChange(e.target.value)} max={customEnd || undefined} className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer" />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[10px] text-muted-foreground">Até</label>
                <input type="date" value={customEnd} onChange={(e) => handleCustomEndChange(e.target.value)} min={customStart || undefined} className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer" />
              </div>
            </div>
          )}
        </div>
      </div>

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

      {/* FAB — mobile only. Usa style para calcular bottom considerando safe area */}
      <Button
        size="lg"
        className="fixed right-4 z-30 h-14 w-14 rounded-full p-0 shadow-lg lg:hidden"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
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
