'use client';

import { CheckCircle2, Clock, AlertCircle, XCircle, MoreVertical, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCategoryConfig } from '@/lib/utils/categories';
import { formatCurrency } from '@/lib/utils/format';
import type { ScheduledTransaction } from '@/hooks/use-scheduled-transactions';

const STATUS_CONFIG = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-amber-500' },
  paid: { label: 'Pago', icon: CheckCircle2, color: 'text-green-600' },
  overdue: { label: 'Vencido', icon: AlertCircle, color: 'text-destructive' },
  canceled: { label: 'Cancelado', icon: XCircle, color: 'text-muted-foreground' },
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

interface ScheduledItemProps {
  item: ScheduledTransaction;
  onMarkPaid: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ScheduledItem({ item, onMarkPaid, onCancel, onDelete }: ScheduledItemProps) {
  const categoryConfig = getCategoryConfig(item.category);
  const CategoryIcon = categoryConfig.icon;
  const statusConfig = STATUS_CONFIG[item.status];
  const StatusIcon = statusConfig.icon;
  const isDebit = item.type === 'debit';
  const isActive = item.status === 'pending' || item.status === 'overdue';

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      {/* Ícone de categoria */}
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: categoryConfig.color + '20' }}
      >
        {item.installment_number ? (
          <CreditCard className="h-4 w-4" style={{ color: categoryConfig.color }} />
        ) : (
          <CategoryIcon className="h-4 w-4" style={{ color: categoryConfig.color }} />
        )}
      </span>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <p className="truncate text-sm font-medium">{item.description}</p>
          <span
            className={`shrink-0 text-sm font-semibold ${isDebit ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}
          >
            {isDebit ? '-' : '+'}{formatCurrency(item.amount)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
          <span className={`text-xs ${statusConfig.color}`}>
            {item.status === 'paid' && item.paid_at
              ? `Pago em ${formatDate(item.paid_at.slice(0, 10))}`
              : statusConfig.label}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span
            className={`text-xs ${item.status === 'overdue' ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
          >
            Vence {formatDate(item.due_date)}
          </span>
          {item.installment_number && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <Badge variant="outline" className="h-4 px-1 text-[10px]">
                Parcela {item.installment_number}
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Ações */}
      {isActive && (
        <div className="flex shrink-0 flex-col gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs text-green-700 hover:text-green-700"
            onClick={() => onMarkPaid(item.id)}
          >
            Pagar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => onCancel(item.id)}
          >
            Cancelar
          </Button>
        </div>
      )}
      {!isActive && item.status !== 'canceled' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={() => onDelete(item.id)}
          aria-label="Excluir"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
