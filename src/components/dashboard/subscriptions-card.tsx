import { CreditCard } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/format';

interface SubscriptionsCardProps {
  totalMonthly: number;
  count: number;
  priceChangeCount: number;
}

export function SubscriptionsCard({ totalMonthly, count, priceChangeCount }: SubscriptionsCardProps) {
  if (count === 0) return null;

  return (
    <Link
      href="/financeiro/recorrentes"
      className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 lg:shadow-[var(--shadow-elevated)]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
            <CreditCard className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Assinaturas detectadas</p>
            <p className="text-xs text-muted-foreground">
              {count} assinatura{count !== 1 ? 's' : ''} ·{' '}
              {formatCurrency(totalMonthly)}/mês
            </p>
          </div>
        </div>

        {priceChangeCount > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {priceChangeCount} reajuste{priceChangeCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </Link>
  );
}
