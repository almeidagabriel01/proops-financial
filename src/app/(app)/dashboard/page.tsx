import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { SpendingChart } from '@/components/dashboard/spending-chart';
import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
import { getMonthBounds, groupByWeek } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { start, end } = getMonthBounds();

  const { data: txs } = await supabase
    .from('transactions')
    .select('amount, type, date')
    .eq('user_id', user.id)
    .gte('date', start)
    .lte('date', end);

  const rows = txs ?? [];
  const income = rows.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const expenses = rows
    .filter((t) => t.type === 'debit')
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const balance = income - expenses;
  const weeklyData = groupByWeek(rows);
  const hasData = rows.length > 0;

  const now = new Date();
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-screen-lg space-y-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold capitalize text-foreground">{monthLabel}</h1>
          <p className="text-sm text-muted-foreground">Resumo financeiro</p>
        </div>
      </div>

      {hasData ? (
        <>
          <SummaryCards income={income} expenses={expenses} balance={balance} />
          {weeklyData.length > 0 && <SpendingChart data={weeklyData} />}
        </>
      ) : (
        <DashboardEmptyState />
      )}
    </div>
  );
}

