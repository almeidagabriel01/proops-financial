import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateRelative } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/hooks/use-transactions';

interface TransactionItemProps {
  transaction: Transaction;
}

export function TransactionItem({ transaction: tx }: TransactionItemProps) {
  const isCredit = tx.type === 'credit';

  return (
    <div className="flex min-h-[56px] items-center gap-3 px-4 py-3">
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
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{formatDateRelative(tx.date)}</span>
          <Badge variant="outline" className="h-4 px-1.5 text-[10px] capitalize">
            {tx.category}
          </Badge>
        </div>
      </div>

      <span
        className={cn(
          'shrink-0 text-sm font-semibold',
          isCredit
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400',
        )}
      >
        {isCredit ? '+' : '-'}
        {formatCurrency(Math.abs(tx.amount))}
      </span>
    </div>
  );
}
