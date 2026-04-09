'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { getCategoryConfig } from '@/lib/utils/categories';
import { formatCurrency } from '@/lib/utils/format';
import type { Budget } from '@/hooks/use-budgets';

interface BudgetProgressCardProps {
  budget: Budget;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
}

export function BudgetProgressCard({ budget, onEdit, onDelete }: BudgetProgressCardProps) {
  const config = getCategoryConfig(budget.category);
  const Icon = config.icon;
  const isOverBudget = budget.spent > budget.monthly_limit;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: config.color + '20' }}
          >
            <Icon className="h-4 w-4" style={{ color: config.color }} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium capitalize">{config.label}</p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(budget.spent)} de {formatCurrency(budget.monthly_limit)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(budget)}
            aria-label="Editar orçamento"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(budget.id)}
            aria-label="Excluir orçamento"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <Progress
          value={Math.min(100, budget.percentage)}
          className={isOverBudget ? '[&>div]:bg-destructive' : ''}
        />
        <div className="mt-1 flex items-center justify-between">
          <span
            className={`text-xs font-medium ${isOverBudget ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {budget.percentage}% usado
          </span>
          <span
            className={`text-xs font-medium ${isOverBudget ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}
          >
            {isOverBudget
              ? `${formatCurrency(Math.abs(budget.remaining))} acima`
              : `${formatCurrency(budget.remaining)} restante`}
          </span>
        </div>
      </div>
    </Card>
  );
}
