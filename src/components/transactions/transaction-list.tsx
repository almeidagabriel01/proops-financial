'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FileX2, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionItem } from '@/components/transactions/transaction-item';
import { TransactionDetail } from '@/components/transactions/transaction-detail';
import { TransactionActions } from '@/components/transactions/transaction-actions';
import { CATEGORY_CONFIG } from '@/lib/utils/categories';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/hooks/use-transactions';
import type { Category } from '@/lib/billing/plans';

interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  onMutated?: () => void;
}

/* ── Desktop table row ─────────────────────────────────────────── */

function TransactionTableRow({
  transaction: tx,
  onMutated,
}: {
  transaction: Transaction;
  onMutated?: () => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [localCategory, setLocalCategory] = useState(tx.category ?? 'outros');
  const isCredit = tx.type === 'credit';
  const catConfig = CATEGORY_CONFIG[localCategory as Category] ?? CATEGORY_CONFIG.outros;
  const isManual = tx.import_id === null;

  function handleCategoryUpdated(transactionId: string, newCategory: string) {
    if (transactionId === tx.id) setLocalCategory(newCategory);
    onMutated?.();
  }

  const dateStr = new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

  return (
    <>
      <tr
        className="border-b border-border transition-colors hover:bg-muted/50 cursor-pointer group"
        onClick={() => setDetailOpen(true)}
      >
        <td className="py-3 pl-8 pr-3 text-xs text-muted-foreground whitespace-nowrap">
          {dateStr}
        </td>
        <td className="px-3 py-3 max-w-xs">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                isCredit
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
              )}
            >
              {isCredit ? '+' : '-'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{tx.description}</p>
              {isManual && (
                <span className="text-[10px] text-muted-foreground">Manual</span>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-3">
          <Badge
            variant="outline"
            className="h-5 px-2 text-[11px] whitespace-nowrap"
            style={{ borderColor: catConfig.color, color: catConfig.color }}
          >
            {catConfig.label}
          </Badge>
        </td>
        <td className="px-3 py-3 text-xs text-muted-foreground">
          {isCredit ? 'Receita' : 'Despesa'}
        </td>
        <td className="px-3 py-3 text-right">
          <span
            className={cn(
              'text-sm font-semibold tabular-nums',
              isCredit
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400',
            )}
          >
            {isCredit ? '+' : '-'}
            {formatCurrency(Math.abs(tx.amount))}
          </span>
        </td>
        <td
          className="py-3 pl-3 pr-8 text-right"
          onClick={(e) => e.stopPropagation()}
        >
          {onMutated && <TransactionActions transaction={tx} onMutated={onMutated} />}
        </td>
      </tr>
      <TransactionDetail
        transaction={{ ...tx, category: localCategory }}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onCategoryUpdated={handleCategoryUpdated}
      />
    </>
  );
}

/* ── Main list component ───────────────────────────────────────── */

export function TransactionList({
  transactions,
  isLoading,
  isLoadingMore,
  error,
  hasMore,
  onLoadMore,
  onRefresh,
  onMutated,
}: TransactionListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (isLoading) return <TransactionListSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <p className="mb-4 text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <FileX2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="mb-1 text-base font-semibold text-foreground">
          Nenhuma transação encontrada
        </h3>
        <p className="mb-6 max-w-xs text-sm text-muted-foreground">
          Tente ajustar os filtros ou importe um extrato bancário.
        </p>
        <Link href="/import" className={buttonVariants({ variant: 'default' })}>
          Importar meu primeiro extrato
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Count + refresh bar */}
      <div className="flex items-center justify-between px-4 py-2 lg:px-8">
        <span className="text-xs text-muted-foreground">{transactions.length} transações</span>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onRefresh}>
          <RefreshCw className="mr-1 h-3 w-3" />
          Atualizar
        </Button>
      </div>

      {/* Mobile: cards */}
      <div className="lg:hidden divide-y divide-border">
        {transactions.map((tx) => (
          <TransactionItem key={tx.id} transaction={tx} onMutated={onMutated} />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="py-2.5 pl-8 pr-3 text-left text-xs font-medium text-muted-foreground">
                Data
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Descrição
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Categoria
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Tipo
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                Valor
              </th>
              <th className="py-2.5 pl-3 pr-8" />
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <TransactionTableRow key={tx.id} transaction={tx} onMutated={onMutated} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {isLoadingMore && (
        <div className="space-y-2 px-4 py-3 lg:px-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      )}

      {!hasMore && transactions.length > 0 && (
        <p className="pb-24 pt-4 text-center text-xs text-muted-foreground lg:pb-28">
          Todas as transações carregadas
        </p>
      )}

      {/* Espaço para dock/bottom-nav quando não há sentinel visível */}
      {hasMore && <div className="h-24 lg:h-28 shrink-0" />}
    </div>
  );
}

function TransactionListSkeleton() {
  return (
    <>
      {/* Mobile skeleton */}
      <div className="lg:hidden divide-y divide-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      {/* Desktop skeleton */}
      <div className="hidden lg:block">
        <div className="border-b border-border bg-muted/30 py-2.5 pl-8" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-8 py-3">
            <Skeleton className="h-3 w-16" />
            <div className="flex flex-1 items-center gap-2.5">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="ml-auto h-4 w-24" />
          </div>
        ))}
      </div>
    </>
  );
}
