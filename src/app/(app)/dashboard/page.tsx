import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { SpendingBreakdown } from '@/components/dashboard/spending-breakdown';
import { CategoryCards } from '@/components/dashboard/category-cards';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
// Charts loaded via client-side lazy wrapper (ssr:false requires Client Component)
import { SpendingChartLazy as SpendingChart, CategoryChartLazy as CategoryChart } from '@/components/dashboard/charts-lazy';
import { Loader2 } from 'lucide-react';
import {
  getMonthBounds,
  getPrevMonthBounds,
  groupByWeek,
} from '@/lib/utils/format';
import {
  aggregateByCategory,
  buildCategoryBreakdown,
} from '@/lib/utils/category-aggregation';
import { UpcomingBillsCard, type UpcomingBill } from '@/components/dashboard/upcoming-bills-card';

export const metadata: Metadata = { title: 'Dashboard' };

type Period = 'current' | 'previous';

function getPeriodBounds(period: Period): { start: string; end: string } {
  if (period === 'previous') return getPrevMonthBounds();
  return getMonthBounds();
}

function getComparisonBounds(period: Period): { start: string; end: string } {
  if (period === 'previous') {
    const now = new Date();
    return getMonthBounds(new Date(now.getFullYear(), now.getMonth() - 2, 1));
  }
  return getPrevMonthBounds();
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const params = await searchParams;
  const period = (params.period === 'previous' ? 'previous' : 'current') as Period;
  const { start, end } = getPeriodBounds(period);
  const compBounds = getComparisonBounds(period);

  const now = new Date();
  const periodLabel =
    period === 'previous'
      ? new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('pt-BR', {
          month: 'long',
          year: 'numeric',
        })
      : now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Upcoming bills: next 7 days + overdue
  const sevenDaysAhead = new Date();
  sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);
  const upcomingTo = sevenDaysAhead.toISOString().slice(0, 10);
  const upcomingFrom = new Date();
  upcomingFrom.setDate(upcomingFrom.getDate() - 30); // include overdue from last 30 days
  const upcomingFromStr = upcomingFrom.toISOString().slice(0, 10);

  // Parallel fetch: current period + comparison period + pending count + upcoming bills
  const [currentResult, compResult, pendingResult, upcomingResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('category, amount, type, date')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end),
    supabase
      .from('transactions')
      .select('category, amount, type')
      .eq('user_id', user.id)
      .gte('date', compBounds.start)
      .lte('date', compBounds.end),
    supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('category_source', 'pending'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('scheduled_transactions')
      .select('id, description, amount, type, due_date, status, category')
      .eq('user_id', user.id)
      .gte('due_date', upcomingFromStr)
      .lte('due_date', upcomingTo)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(10),
  ]);

  const upcomingBills = ((upcomingResult as { data?: unknown[] }).data ?? []) as UpcomingBill[];
  const rows = currentResult.data ?? [];
  const income = rows.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const expenses = rows
    .filter((t) => t.type === 'debit')
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const balance = income - expenses;
  const weeklyData = groupByWeek(rows);
  const hasData = rows.length > 0;
  const hasPending = (pendingResult.count ?? 0) > 0;

  const currentCats = aggregateByCategory(rows);
  const compCats = aggregateByCategory(compResult.data ?? []);
  const hasPrevData = (compResult.data ?? []).some((t) => t.type === 'debit');
  const categoryBreakdown = buildCategoryBreakdown(currentCats, compCats, hasPrevData);

  return (
    <div className="mx-auto max-w-screen-lg space-y-4 px-4 py-4">
      {/* Header + period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold capitalize text-foreground">{periodLabel}</h1>
          <p className="text-sm text-muted-foreground">Resumo financeiro</p>
        </div>
        <PeriodSelector />
      </div>

      {/* Pending categorization indicator */}
      {hasPending && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Categorizando suas transações...</p>
        </div>
      )}

      {/* Upcoming bills (overdue + next 7 days) */}
      {upcomingBills.length > 0 && (
        <UpcomingBillsCard bills={upcomingBills} daysAhead={7} />
      )}

      {hasData ? (
        <>
          <SummaryCards income={income} expenses={expenses} balance={balance} />

          {/* Weekly spending chart */}
          {weeklyData.length > 0 && <SpendingChart data={weeklyData} />}

          {/* Category breakdown — only when there are debit transactions */}
          {currentCats.length > 0 ? (
            <>
              <CategoryChart data={currentCats} />
              <SpendingBreakdown data={currentCats} />
              <CategoryCards data={categoryBreakdown} />
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm">Nenhum gasto categorizado neste período.</p>
              <p className="mt-1 text-xs">Importe um extrato ou adicione uma despesa.</p>
            </div>
          )}
        </>
      ) : (
        <DashboardEmptyState />
      )}
    </div>
  );
}
