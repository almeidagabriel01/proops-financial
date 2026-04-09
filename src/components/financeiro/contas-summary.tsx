'use client';

import { TrendingDown, TrendingUp, Scale } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';
import type { ScheduledTransaction } from '@/hooks/use-scheduled-transactions';

interface ContasSummaryProps {
  items: ScheduledTransaction[];
}

export function ContasSummary({ items }: ContasSummaryProps) {
  const activeItems = items.filter((i) => i.status === 'pending' || i.status === 'overdue');

  const totalAPagar = activeItems
    .filter((i) => i.type === 'debit')
    .reduce((s, i) => s + i.amount, 0);

  const totalAReceber = activeItems
    .filter((i) => i.type === 'credit')
    .reduce((s, i) => s + i.amount, 0);

  const saldoProjetado = totalAReceber - totalAPagar;

  return (
    <div className="grid grid-cols-3 gap-2">
      <Card className="p-3">
        <div className="flex items-center gap-1.5">
          <TrendingDown className="h-4 w-4 shrink-0 text-destructive" />
          <span className="text-xs text-muted-foreground">A Pagar</span>
        </div>
        <p className="mt-1 text-base font-semibold text-destructive">
          {formatCurrency(totalAPagar)}
        </p>
      </Card>

      <Card className="p-3">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 shrink-0 text-green-600" />
          <span className="text-xs text-muted-foreground">A Receber</span>
        </div>
        <p className="mt-1 text-base font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(totalAReceber)}
        </p>
      </Card>

      <Card className="p-3">
        <div className="flex items-center gap-1.5">
          <Scale className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-xs text-muted-foreground">Saldo</span>
        </div>
        <p
          className={`mt-1 text-base font-semibold ${saldoProjetado >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
        >
          {formatCurrency(saldoProjetado)}
        </p>
      </Card>
    </div>
  );
}
