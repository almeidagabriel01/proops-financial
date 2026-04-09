'use client';

import { RefreshCw, Pause, Play, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getCategoryConfig } from '@/lib/utils/categories';
import { formatCurrency } from '@/lib/utils/format';
import { FREQUENCY_LABELS, type RecurringRule } from '@/hooks/use-recurring-rules';

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

const STATUS_BADGE: Record<RecurringRule['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativa', variant: 'default' },
  paused: { label: 'Pausada', variant: 'secondary' },
  canceled: { label: 'Cancelada', variant: 'outline' },
};

interface RecurringItemProps {
  rule: RecurringRule;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

export function RecurringItem({ rule, onPause, onResume, onDelete }: RecurringItemProps) {
  const config = getCategoryConfig(rule.category);
  const CategoryIcon = config.icon;
  const isDebit = rule.type === 'debit';
  const statusBadge = STATUS_BADGE[rule.status];

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: config.color + '20' }}
        >
          <CategoryIcon className="h-4 w-4" style={{ color: config.color }} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-medium">{rule.description}</p>
            <span
              className={`shrink-0 text-sm font-semibold ${isDebit ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}
            >
              {isDebit ? '-' : '+'}{formatCurrency(rule.amount)}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge {...statusBadge} className="text-xs">{statusBadge.label}</Badge>
            <span>·</span>
            <RefreshCw className="h-3 w-3" />
            <span>{FREQUENCY_LABELS[rule.frequency]}</span>
            <span>·</span>
            <span>Próxima: <span className={`font-medium ${rule.status === 'active' ? 'text-foreground' : ''}`}>{formatDate(rule.next_due_date)}</span></span>
          </div>
        </div>
      </div>

      {rule.status !== 'canceled' && (
        <div className="mt-3 flex items-center justify-end gap-2">
          {rule.status === 'active' ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground"
              onClick={() => onPause(rule.id)}
            >
              <Pause className="h-3 w-3" />
              Pausar
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground"
              onClick={() => onResume(rule.id)}
            >
              <Play className="h-3 w-3" />
              Ativar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
            onClick={() => onDelete(rule.id)}
          >
            <Trash2 className="h-3 w-3" />
            Excluir
          </Button>
        </div>
      )}
    </Card>
  );
}
