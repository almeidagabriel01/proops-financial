import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

interface SummaryCardsProps {
  income: number;
  expenses: number;
  balance: number;
}

export function SummaryCards({ income, expenses, balance }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <ArrowUpCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Receitas</p>
            <p className="truncate text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(income)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <ArrowDownCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Despesas</p>
            <p className="truncate text-lg font-bold text-red-600 dark:text-red-400">
              {formatCurrency(expenses)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              balance >= 0
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-red-100 dark:bg-red-900/30',
            )}
          >
            <Wallet
              className={cn(
                'h-5 w-5',
                balance >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400',
              )}
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p
              className={cn(
                'truncate text-lg font-bold',
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
    </div>
  );
}
