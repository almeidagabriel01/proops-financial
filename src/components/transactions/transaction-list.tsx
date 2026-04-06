'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { FileX2, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionItem } from '@/components/transactions/transaction-item';
import type { Transaction } from '@/hooks/use-transactions';

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
    <div>
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs text-muted-foreground">{transactions.length} transações</span>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onRefresh}>
          <RefreshCw className="mr-1 h-3 w-3" />
          Atualizar
        </Button>
      </div>

      <div className="divide-y divide-border">
        {transactions.map((tx) => (
          <TransactionItem key={tx.id} transaction={tx} onMutated={onMutated} />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {isLoadingMore && (
        <div className="space-y-2 px-4 py-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      )}

      {!hasMore && transactions.length > 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Todas as transações carregadas
        </p>
      )}
    </div>
  );
}

function TransactionListSkeleton() {
  return (
    <div className="divide-y divide-border">
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
  );
}
