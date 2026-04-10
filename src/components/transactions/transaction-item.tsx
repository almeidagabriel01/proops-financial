'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateRelative } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import type { TransactionWithTags } from '@/hooks/use-transactions';
import { TransactionActions } from '@/components/transactions/transaction-actions';
import { TransactionDetail } from '@/components/transactions/transaction-detail';
import { CATEGORY_CONFIG } from '@/lib/utils/categories';
import type { Category } from '@/lib/billing/plans';

const MAX_CHIPS = 3;

interface TransactionItemProps {
  transaction: TransactionWithTags;
  onMutated?: () => void;
}

export function TransactionItem({ transaction: tx, onMutated }: TransactionItemProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [localCategory, setLocalCategory] = useState(tx.category ?? 'outros');
  const [localTags, setLocalTags] = useState<string[]>(
    (tx.transaction_tags ?? []).map((t) => t.tag),
  );
  const isCredit = tx.type === 'credit';
  const catConfig = CATEGORY_CONFIG[localCategory as Category] ?? CATEGORY_CONFIG.outros;
  const isManual = tx.import_id === null;

  function handleCategoryUpdated(transactionId: string, newCategory: string) {
    if (transactionId === tx.id) {
      setLocalCategory(newCategory);
    }
    onMutated?.();
  }

  function handleTagsUpdated(tags: string[]) {
    setLocalTags(tags);
  }

  const visibleTags = localTags.slice(0, MAX_CHIPS);
  const overflowCount = localTags.length - MAX_CHIPS;

  return (
    <>
      <div className="flex min-h-[56px] items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={`Ver detalhe: ${tx.description}`}
        >
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
              isCredit
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            )}
          >
            {isCredit ? '+' : '-'}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{tx.description}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{formatDateRelative(tx.date)}</span>
              <Badge
                variant="outline"
                className="h-4 px-1.5 text-[10px]"
                style={{ borderColor: catConfig.color, color: catConfig.color }}
              >
                {catConfig.label}
              </Badge>
              {isManual && (
                <span className="text-[10px] text-muted-foreground">Manual</span>
              )}
              {tx.notes && (
                <FileText
                  className="h-3 w-3 shrink-0 text-muted-foreground"
                  aria-label="Tem nota"
                />
              )}
              {visibleTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="h-4 px-1.5 text-[10px] font-normal"
                >
                  {tag}
                </Badge>
              ))}
              {overflowCount > 0 && (
                <span className="text-[10px] text-muted-foreground">+{overflowCount}</span>
              )}
            </div>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <span
            className={cn(
              'text-sm font-semibold',
              isCredit
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400',
            )}
          >
            {isCredit ? '+' : '-'}
            {formatCurrency(Math.abs(tx.amount))}
          </span>

          {onMutated && (
            <TransactionActions transaction={tx} onMutated={onMutated} />
          )}
        </div>
      </div>

      <TransactionDetail
        transaction={{ ...tx, category: localCategory, transaction_tags: localTags.map((t) => ({ tag: t })) }}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onCategoryUpdated={handleCategoryUpdated}
        onTagsUpdated={handleTagsUpdated}
      />
    </>
  );
}
