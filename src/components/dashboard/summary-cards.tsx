import { ArrowDownCircle, ArrowUpCircle, PiggyBank, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

interface SummaryCardsProps {
  income: number;
  expenses: number;
  balance: number;
  prevIncome: number;
  prevExpenses: number;
  savingsRate: number;
}

function computeDelta(current: number, prev: number): { pct: number; dir: 'up' | 'down' | 'stable' } | null {
  if (prev === 0) return null;
  const pct = Math.round(((current - prev) / prev) * 100);
  const dir = pct > 2 ? 'up' : pct < -2 ? 'down' : 'stable';
  return { pct: Math.abs(pct), dir };
}

function DeltaBadge({
  delta,
  goodWhenUp = true,
}: {
  delta: ReturnType<typeof computeDelta>;
  goodWhenUp?: boolean;
}) {
  if (!delta || delta.dir === 'stable') return null;
  const up = delta.dir === 'up';
  const good = goodWhenUp ? up : !up;
  return (
    <span
      className={cn(
        'text-[10px] font-semibold',
        good ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400',
      )}
    >
      {up ? '↑' : '↓'} {delta.pct}%
    </span>
  );
}

export function SummaryCards({ income, expenses, balance, prevIncome, prevExpenses, savingsRate }: SummaryCardsProps) {
  const incomeDelta = computeDelta(income, prevIncome);
  const expensesDelta = computeDelta(expenses, prevExpenses);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
      {/* Receitas */}
      <Card className="lg:shadow-[var(--shadow-elevated)] lg:transition-all lg:hover:shadow-[var(--shadow-float)] lg:hover:-translate-y-0.5">
        <CardContent className="p-4 lg:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <DeltaBadge delta={incomeDelta} goodWhenUp={true} />
          </div>
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">Receitas</p>
            <p className="mt-0.5 truncate text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">
              {formatCurrency(income)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Despesas */}
      <Card className="lg:shadow-[var(--shadow-elevated)] lg:transition-all lg:hover:shadow-[var(--shadow-float)] lg:hover:-translate-y-0.5">
        <CardContent className="p-4 lg:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <ArrowDownCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <DeltaBadge delta={expensesDelta} goodWhenUp={false} />
          </div>
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">Despesas</p>
            <p className="mt-0.5 truncate text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">
              {formatCurrency(expenses)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Saldo */}
      <Card className="lg:shadow-[var(--shadow-elevated)] lg:transition-all lg:hover:shadow-[var(--shadow-float)] lg:hover:-translate-y-0.5">
        <CardContent className="p-4 lg:p-5">
          <div className="flex items-start justify-between gap-2">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                balance >= 0
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-red-100 dark:bg-red-900/30',
              )}
            >
              <Wallet
                className={cn(
                  'h-4 w-4',
                  balance >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400',
                )}
              />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p
              className={cn(
                'mt-0.5 truncate text-xl font-bold tabular-nums',
                balance >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400',
              )}
            >
              {formatCurrency(balance)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Taxa de Poupança */}
      <Card className="lg:shadow-[var(--shadow-elevated)] lg:transition-all lg:hover:shadow-[var(--shadow-float)] lg:hover:-translate-y-0.5">
        <CardContent className="p-4 lg:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <PiggyBank className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">Poupança</p>
            <p
              className={cn(
                'mt-0.5 text-xl font-bold tabular-nums',
                savingsRate >= 20
                  ? 'text-green-600 dark:text-green-400'
                  : savingsRate >= 0
                  ? 'text-foreground'
                  : 'text-red-600 dark:text-red-400',
              )}
            >
              {savingsRate}%
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
