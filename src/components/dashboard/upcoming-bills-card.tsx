import { CalendarClock, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils/format';

export interface UpcomingBill {
  id: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  due_date: string;
  status: 'pending' | 'overdue';
  category: string;
}

interface UpcomingBillsCardProps {
  bills: UpcomingBill[];
  daysAhead?: number;
}

export function UpcomingBillsCard({ bills, daysAhead = 7 }: UpcomingBillsCardProps) {
  if (bills.length === 0) return null;

  const overdue = bills.filter((b) => b.status === 'overdue');
  const pending = bills.filter((b) => b.status === 'pending');
  const allBills = [...overdue, ...pending];

  const totalAPagar = allBills
    .filter((b) => b.type === 'debit')
    .reduce((s, b) => s + b.amount, 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="h-4 w-4 text-primary" />
          Próximos {daysAhead} dias
          {overdue.length > 0 && (
            <span className="ml-auto rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
              {overdue.length} vencido{overdue.length > 1 ? 's' : ''}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        {/* Summary */}
        {totalAPagar > 0 && (
          <p className="text-xs text-muted-foreground">
            Total a pagar:{' '}
            <span className="font-semibold text-destructive">{formatCurrency(totalAPagar)}</span>
          </p>
        )}

        {/* Bills list (max 5) */}
        <div className="space-y-1.5">
          {allBills.slice(0, 5).map((bill) => (
            <div
              key={bill.id}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                bill.status === 'overdue'
                  ? 'bg-destructive/5'
                  : 'bg-muted/40'
              }`}
            >
              {bill.type === 'debit' ? (
                <TrendingDown className="h-3.5 w-3.5 shrink-0 text-destructive" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                {bill.description}
              </span>
              <span
                className={`shrink-0 text-xs font-semibold ${
                  bill.type === 'debit' ? 'text-destructive' : 'text-green-600 dark:text-green-400'
                }`}
              >
                {bill.type === 'debit' ? '-' : '+'}{formatCurrency(bill.amount)}
              </span>
              <span
                className={`shrink-0 text-[10px] ${
                  bill.status === 'overdue' ? 'font-semibold text-destructive' : 'text-muted-foreground'
                }`}
              >
                {bill.status === 'overdue' ? 'Vencido' : formatDate(bill.due_date)}
              </span>
            </div>
          ))}
          {allBills.length > 5 && (
            <p className="pt-1 text-center text-[10px] text-muted-foreground">
              +{allBills.length - 5} mais — veja em Financeiro
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
