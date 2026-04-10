'use client';

import { CreditCard, ChevronRight, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getCategoryConfig } from '@/lib/utils/categories';
import { formatCurrency } from '@/lib/utils/format';
import type { InstallmentGroup } from '@/hooks/use-installment-groups';

interface InstallmentGroupCardProps {
  group: InstallmentGroup;
  onDelete: (id: string) => void;
  onViewDetails?: (group: InstallmentGroup) => void;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function InstallmentGroupCard({ group, onDelete, onViewDetails }: InstallmentGroupCardProps) {
  const config = getCategoryConfig(group.category);
  const scheduled = group.scheduled_transactions ?? [];

  // parcela atual importada não está em scheduled_transactions, então conta o total - pendentes restantes
  const totalPaid = group.installment_count - scheduled.filter((s) => s.status === 'pending' || s.status === 'overdue').length;
  const percentage = Math.round((totalPaid / group.installment_count) * 100);

  const nextPending = scheduled
    .filter((s) => s.status === 'pending' || s.status === 'overdue')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  const amountPaid = totalPaid * group.installment_amount;
  const amountRemaining = group.total_amount - amountPaid;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: config.color + '20' }}
          >
            <CreditCard className="h-4 w-4" style={{ color: config.color }} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{group.description}</p>
            <p className="text-xs text-muted-foreground capitalize">{config.label}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant="outline" className="text-xs">
            {totalPaid}/{group.installment_count}x
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(group.id)}
            aria-label="Excluir parcelas"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <Progress value={percentage} />
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatCurrency(amountPaid)} pago</span>
          <span className="font-medium text-foreground">{formatCurrency(amountRemaining)} restante</span>
        </div>
      </div>

      <div className={`mt-2 flex items-center justify-between rounded-md px-2.5 py-1.5 ${nextPending ? 'bg-muted/40' : 'invisible'}`}>
        <span className="text-xs text-muted-foreground">
          {nextPending ? `Próxima: parcela ${nextPending.installment_number}` : '—'}
        </span>
        <span className={`text-xs font-medium ${nextPending?.status === 'overdue' ? 'text-destructive' : ''}`}>
          {nextPending ? `${formatDate(nextPending.due_date)} · ${formatCurrency(nextPending.amount)}` : '—'}
        </span>
      </div>

      {onViewDetails && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-7 w-full text-xs text-muted-foreground"
          onClick={() => onViewDetails(group)}
        >
          Ver detalhes <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      )}
    </Card>
  );
}
