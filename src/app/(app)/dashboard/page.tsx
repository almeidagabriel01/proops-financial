import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { SpendingChart } from '@/components/dashboard/spending-chart';
import { CategoryChart } from '@/components/dashboard/category-chart';
import { SpendingBreakdown } from '@/components/dashboard/spending-breakdown';
import { CategoryCards } from '@/components/dashboard/category-cards';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
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

  // Parallel fetch: current period + comparison period + pending count
  const [currentResult, compResult, pendingResult] = await Promise.all([
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
  ]);

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

      {hasData ? (
        <>
          <SummaryCards income={income} expenses={expenses} balance={balance} />

          {/* Weekly spending chart */}
          {weeklyData.length > 0 && <SpendingChart data={weeklyData} />}

          {/* Category breakdown — only when there are debit transactions */}
          {currentCats.length > 0 && (
            <>
              <CategoryChart data={currentCats} />
              <SpendingBreakdown data={currentCats} />
              <CategoryCards data={categoryBreakdown} />
            </>
          )}
        </>
      ) : (
        <DashboardEmptyState />
      )}
    </div>
  );
}
