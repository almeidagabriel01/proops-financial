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
import { MonthPickerFilter } from '@/components/ui/month-picker-filter';
import { useTransactions } from '@/hooks/use-transactions';
import { getMonthBounds, currentYM } from '@/lib/utils/format';
import { CATEGORIES } from '@/lib/billing/plans';
import { CATEGORY_CONFIG } from '@/lib/utils/categories';
import type { Category } from '@/lib/billing/plans';

type TypeFilter = 'all' | 'credit' | 'debit';

const TYPE_LABELS: Record<TypeFilter, string> = {
  all: 'Todos',
  credit: 'Receitas',
  debit: 'Despesas',
};

const VALID_TYPES: TypeFilter[] = ['all', 'credit', 'debit'];

function getMonthBoundsFromYM(ym: string): { startDate: string; endDate: string } {
  const [y, m] = ym.split('-').map(Number);
  const { start, end } = getMonthBounds(new Date(y, m - 1, 1));
  return { startDate: start, endDate: end };
}

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawMonth = searchParams.get('month') ?? '';
  const initialMonth = /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : currentYM();
  const rawType = searchParams.get('type') as TypeFilter;
  const initialType = VALID_TYPES.includes(rawType) ? rawType : 'all';
  const initialSearch = searchParams.get('search') ?? '';
  const initialCategory = searchParams.get('category') ?? '';

  const [monthFilter, setMonthFilter] = useState<string>(initialMonth);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialType);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce search input
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  // Sync filters to URL search params
  const syncToUrl = useCallback(
    (month: string, t: TypeFilter, s: string, cat: string) => {
      const params = new URLSearchParams();
      const now = currentYM();
      if (month !== now) params.set('month', month);
      if (t !== 'all') params.set('type', t);
      if (s) params.set('search', s);
      if (cat) params.set('category', cat);
      router.replace(`/transactions${params.size ? '?' + params.toString() : ''}`, {
        scroll: false,
      });
    },
    [router],
  );

  function handleMonthChange(month: string) {
    setMonthFilter(month);
    syncToUrl(month, typeFilter, debouncedSearch, categoryFilter);
  }

  function handleTypeChange(value: TypeFilter | null) {
    if (!value) return;
    setTypeFilter(value);
    syncToUrl(monthFilter, value, debouncedSearch, categoryFilter);
  }

  function handleCategoryChange(value: string | null) {
    const cat = !value || value === 'all' ? '' : value;
    setCategoryFilter(cat);
    syncToUrl(monthFilter, typeFilter, debouncedSearch, cat);
  }

  const filters = useMemo(() => {
    const { startDate, endDate } = getMonthBoundsFromYM(monthFilter);
    return {
      startDate,
      endDate,
      type: typeFilter,
      search: debouncedSearch,
      category: categoryFilter || undefined,
    };
  }, [monthFilter, typeFilter, debouncedSearch, categoryFilter]);

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
          <MonthPickerFilter value={monthFilter} onChange={handleMonthChange} />
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
              <SelectContent className="max-h-60">
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
        </div>

        {/* Mobile: stacked */}
        <div className="space-y-2 lg:hidden">
          {/* MonthPicker centralizado no mobile */}
          <div className="flex justify-center">
            <MonthPickerFilter value={monthFilter} onChange={handleMonthChange} />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" placeholder="Buscar por descrição..." className="pl-9" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-9 flex-1 text-xs">{TYPE_LABELS[typeFilter]}</SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="credit">Receitas</SelectItem>
                <SelectItem value="debit">Despesas</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex flex-1 items-center gap-1">
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
          </div>
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

      {/* FAB — mobile only. Lado esquerdo para não colidir com FloatingChatButton (direita) */}
      <Button
        size="lg"
        className="fixed left-4 z-30 h-14 w-14 rounded-full p-0 shadow-lg lg:hidden"
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
