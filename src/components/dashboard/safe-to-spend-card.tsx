'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import type { SafeToSpendResult } from '@/lib/dashboard/safe-to-spend';

interface SafeToSpendCardProps {
  result: SafeToSpendResult;
  // true quando o usuário tem transações importadas no mês (distingue "saldo zero" de "sem dados")
  hasData: boolean;
}

export function SafeToSpendCard({ result, hasData }: SafeToSpendCardProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const { safeToSpend, safeToSpendDaily, balanceMonth, pendingTotal, daysRemaining, pendingBillsCount } = result;

  // Estado de cor baseado no safe-to-spend total (não no diário)
  const isNegative = safeToSpend <= 0;
  const isTight = !isNegative && safeToSpendDaily < 20;

  const colorClass = isNegative
    ? 'text-red-600 dark:text-red-400'
    : isTight
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-green-600 dark:text-green-400';

  const borderClass = isNegative
    ? 'border-red-200 dark:border-red-800'
    : isTight
      ? 'border-amber-200 dark:border-amber-800'
      : 'border-border';

  return (
    <div className={`relative rounded-xl border ${borderClass} bg-card p-4 lg:shadow-[var(--shadow-elevated)] lg:p-5`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Disponível para gastar hoje</p>
        <button
          onClick={() => setTooltipOpen((o) => !o)}
          className="rounded-full p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
          aria-label="Explicar como é calculado"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {/* Tooltip explicativo */}
      {tooltipOpen && (
        <div className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-start justify-between gap-2">
            <p>
              Saldo do mês{' '}
              <span className="font-medium text-foreground">{formatCurrency(balanceMonth)}</span>
              {' '}menos contas pendentes{' '}
              <span className="font-medium text-foreground">{formatCurrency(pendingTotal)}</span>
              {' '}dividido por{' '}
              <span className="font-medium text-foreground">{daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'} restantes</span>
              {' '}no mês.
            </p>
            <button
              onClick={() => setTooltipOpen(false)}
              className="mt-0.5 shrink-0 text-muted-foreground/60 hover:text-muted-foreground"
              aria-label="Fechar explicação"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Valor principal */}
      {!hasData ? (
        <div className="mt-3">
          <p className="text-2xl font-bold text-muted-foreground lg:text-3xl">
            {formatCurrency(0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Importe seu extrato para ativar este card
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <p className={`text-2xl font-bold lg:text-3xl ${colorClass}`}>
            {formatCurrency(safeToSpendDaily)}
          </p>

          {isNegative && (
            <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
              Atenção: despesas superam receitas neste mês
            </p>
          )}

          <p className="mt-1.5 text-xs text-muted-foreground">
            {pendingBillsCount > 0
              ? `Considerando ${pendingBillsCount} conta${pendingBillsCount === 1 ? '' : 's'} a vencer este mês (${formatCurrency(pendingTotal)})`
              : 'Sem contas agendadas para este mês'}
          </p>
        </div>
      )}
    </div>
  );
}
