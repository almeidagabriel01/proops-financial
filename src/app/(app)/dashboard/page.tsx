import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { SpendingBreakdown } from '@/components/dashboard/spending-breakdown';
import { CategoryCards } from '@/components/dashboard/category-cards';
import { MonthPicker } from '@/components/dashboard/month-picker';
import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
import { SpendingChartLazy as SpendingChart, CategoryChartLazy as CategoryChart } from '@/components/dashboard/charts-lazy';
import { Loader2, TrendingDown } from 'lucide-react';
import { getMonthBounds, groupByWeek, formatCurrency } from '@/lib/utils/format';
import { aggregateByCategory, buildCategoryBreakdown } from '@/lib/utils/category-aggregation';
import { UpcomingBillsCard, type UpcomingBill } from '@/components/dashboard/upcoming-bills-card';
import { DuplicateAlertsCard, type DuplicateAlert } from '@/components/dashboard/duplicate-alerts-card';
import { SeasonalityCard, type SeasonalityWithEstimate } from '@/components/dashboard/seasonality-card';
import { getActiveSeasonalities, getSeasonalityEstimate } from '@/lib/dashboard/seasonalities';
import { SafeToSpendCard } from '@/components/dashboard/safe-to-spend-card';
import { calculateSafeToSpend } from '@/lib/dashboard/safe-to-spend';
import { SubscriptionsCard } from '@/components/dashboard/subscriptions-card';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const params = await searchParams;
  const monthParam = params.month; // "YYYY-MM" or undefined

  const now = new Date();

  // Resolve target date from ?month=YYYY-MM param
  const targetDate =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? new Date(`${monthParam}-15T12:00:00`)
      : new Date(now.getFullYear(), now.getMonth(), 15);

  const isCurrentMonth =
    targetDate.getFullYear() === now.getFullYear() &&
    targetDate.getMonth() === now.getMonth();

  const { start, end } = getMonthBounds(targetDate);
  const prevDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
  const compBounds = getMonthBounds(prevDate);

  const periodLabel = targetDate
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase());

  const monthName = targetDate.toLocaleDateString('pt-BR', { month: 'long' });

  // Upcoming bills: next 7 days + overdue last 30 days
  const sevenDaysAhead = new Date();
  sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);
  const upcomingTo = sevenDaysAhead.toISOString().slice(0, 10);
  const upcomingFrom = new Date();
  upcomingFrom.setDate(upcomingFrom.getDate() - 30);

  // Sazonalidades ativas no mês visualizado (usa targetDate, não new Date(), para
  // respeitar o param ?month=YYYY-MM e evitar divergência de fuso UTC vs UTC-3)
  const activeSeasonalities = getActiveSeasonalities(targetDate.getMonth() + 1);
  const lastYear = targetDate.getFullYear() - 1;
  const lastYearMonth = `${lastYear}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

  // Safe-to-spend: endOfMonth derivado de targetDate (param), não de new Date() do servidor.
  // Cobre o caso UTC vs UTC-3: mês vem do param, não do relógio UTC.
  const endOfCurrentMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [currentResult, compResult, pendingResult, upcomingResult, duplicateAlertsResult, pendingBillsResult, subscriptionsResult, ...seasonalityEstimates] = await Promise.all([
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
      .gte('due_date', upcomingFrom.toISOString().slice(0, 10))
      .lte('due_date', upcomingTo)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(10),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('duplicate_alerts')
      .select(
        'id, status, created_at, t1:transaction_id_1(id, date, description, amount), t2:transaction_id_2(id, date, description, amount)',
      )
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    // Safe-to-spend: contas pendentes do mês visualizado (filtro por endOfCurrentMonth de targetDate)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('scheduled_transactions')
      .select('amount, due_date')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lte('due_date', endOfCurrentMonth),
    // Assinaturas detectadas (detected_subscriptions ainda não está nos tipos gerados — migration 023)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('detected_subscriptions')
      .select('current_amount, frequency, price_change_detected')
      .eq('user_id', user.id)
      .is('dismissed_at', null),
    // Estimativas de sazonalidade para cada sazonalidade ativa no mês visualizado
    ...activeSeasonalities.map((s) =>
      getSeasonalityEstimate(supabase, user.id, s.months, s.keywords, lastYear)
    ),
  ]);

  const upcomingBills = ((upcomingResult as { data?: unknown[] }).data ?? []) as UpcomingBill[];
  const duplicateAlerts = ((duplicateAlertsResult as { data?: unknown[] }).data ?? []) as DuplicateAlert[];
  const pendingBills = ((pendingBillsResult as { data?: unknown[] }).data ?? []) as Array<{ amount: number; due_date: string }>;

  const detectedSubs = ((subscriptionsResult as { data?: unknown[] }).data ?? []) as Array<{
    current_amount: number;
    frequency: 'monthly' | 'annual';
    price_change_detected: boolean;
  }>;
  const subsTotalMonthly = detectedSubs.reduce(
    (sum, s) => sum + (s.frequency === 'monthly' ? s.current_amount : s.current_amount / 12),
    0,
  );
  const subsPriceChangeCount = detectedSubs.filter((s) => s.price_change_detected).length;

  const seasonalitiesWithEstimates: SeasonalityWithEstimate[] = activeSeasonalities.map((s, i) => ({
    ...s,
    estimate: (seasonalityEstimates[i] as { total: number; transactionCount: number } | null) ?? null,
  }));

  const rows = currentResult.data ?? [];
  const compRows = compResult.data ?? [];

  const income = rows.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const expenses = rows.filter((t) => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
  const balance = income - expenses;

  const prevIncome = compRows.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const prevExpenses = compRows.filter((t) => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

  // Safe-to-spend: referenceDate construído com mês de targetDate + dia de now (servidor).
  // Mês vem do param ?month= (não de new Date() puro) para evitar divergência UTC vs UTC-3.
  // O card só é exibido para isCurrentMonth, momento em que targetDate e now estão no mesmo mês.
  const safeToSpendRef = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
  );
  const safeToSpendResult = calculateSafeToSpend({
    totalIncome: income,
    totalExpenses: expenses,
    pendingBills,
    referenceDate: safeToSpendRef,
  });

  // Month progress (current month only)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);
  const dailyAvg = dayOfMonth > 0 ? expenses / dayOfMonth : 0;
  const projectedExpenses = Math.round(expenses + dailyAvg * daysRemaining);
  const upcomingDebit = upcomingBills.filter((b) => b.type === 'debit').reduce((s, b) => s + b.amount, 0);

  const weeklyData = groupByWeek(rows);
  const hasData = rows.length > 0;
  const hasPending = (pendingResult.count ?? 0) > 0;

  const currentCats = aggregateByCategory(rows);
  const compCats = aggregateByCategory(compRows);
  const hasPrevData = compRows.some((t) => t.type === 'debit');
  const categoryBreakdown = buildCategoryBreakdown(currentCats, compCats, hasPrevData);

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex w-full flex-col gap-5 px-4 py-4 pb-24 lg:px-8 lg:py-6 lg:pb-28">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground lg:text-3xl">{periodLabel}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Resumo financeiro</p>
          </div>
          <MonthPicker />
        </div>

        {/* ── Categorização pendente ──────────────────────────────── */}
        {hasPending && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Categorizando suas transações...</p>
          </div>
        )}

        {hasData ? (
          <>
            {/* ── Summary cards ─────────────────────────────────────── */}
            <SummaryCards
              income={income}
              expenses={expenses}
              balance={balance}
              prevIncome={prevIncome}
              prevExpenses={prevExpenses}
              savingsRate={savingsRate}
            />

            {/* ── Safe-to-spend (somente mês atual) ────────────────── */}
            {isCurrentMonth && (
              <SafeToSpendCard
                result={safeToSpendResult}
                hasData={hasData}
              />
            )}

            {/* ── Alertas de cobranças duplicadas ───────────────────── */}
            {duplicateAlerts.length > 0 && (
              <DuplicateAlertsCard initialAlerts={duplicateAlerts} />
            )}

            {/* ── Sazonalidades brasileiras ──────────────────────────── */}
            {seasonalitiesWithEstimates.length > 0 && (
              <SeasonalityCard
                seasonalities={seasonalitiesWithEstimates}
                lastYearMonth={lastYearMonth}
                monthName={monthName}
              />
            )}

            {/* ── Assinaturas detectadas ─────────────────────────────── */}
            <SubscriptionsCard
              totalMonthly={subsTotalMonthly}
              count={detectedSubs.length}
              priceChangeCount={subsPriceChangeCount}
            />

            {/* ── Progresso do mês (somente mês atual) ──────────────── */}
            {isCurrentMonth && (
              <div className="rounded-xl border border-border bg-card p-4 lg:shadow-[var(--shadow-elevated)] lg:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Progresso do Mês</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Dia {dayOfMonth} de {daysInMonth} · {daysRemaining} dias restantes
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                      Projeção:{' '}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(projectedExpenses)}
                      </span>
                    </span>
                    {upcomingDebit > 0 && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        +{formatCurrency(upcomingDebit)} agendado
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-2.5">
                  <div>
                    <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                      <span>Tempo decorrido</span>
                      <span className="font-medium">{monthProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                      <div
                        className="h-full rounded-full bg-primary/50 transition-all"
                        style={{ width: `${monthProgress}%` }}
                      />
                    </div>
                  </div>
                  {income > 0 && (
                    <div>
                      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                        <span>Gastos vs receita</span>
                        <span
                          className={
                            expenses / income > monthProgress / 100 + 0.05
                              ? 'font-semibold text-red-500'
                              : 'font-medium text-green-600 dark:text-green-400'
                          }
                        >
                          {Math.min(Math.round((expenses / income) * 100), 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                        <div
                          className={`h-full rounded-full transition-all ${
                            expenses / income > monthProgress / 100 + 0.05
                              ? 'bg-red-500'
                              : 'bg-green-500 dark:bg-green-400'
                          }`}
                          style={{
                            width: `${Math.min(Math.round((expenses / income) * 100), 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── DESKTOP LAYOUT ─────────────────────────────────────── */}
            <div className="hidden lg:flex lg:flex-col lg:gap-5">
              {/* Charts: 2-col com alturas iguais */}
              {(weeklyData.length > 0 || currentCats.length > 0) && (
                <div className="grid grid-cols-2 gap-5">
                  <SpendingChart data={weeklyData} />
                  <CategoryChart data={currentCats} />
                </div>
              )}

              {/* Breakdown: adaptive grid based on available content */}
              {(() => {
                const showCats = categoryBreakdown.length >= 2;
                const showUpcoming = upcomingBills.length > 0;
                const cols = showCats && showUpcoming
                  ? 'grid-cols-[1fr_1fr_280px]'
                  : showCats
                    ? 'grid-cols-2'
                    : showUpcoming
                      ? 'grid-cols-[1fr_280px]'
                      : 'grid-cols-1';
                return (
                  <div className={`grid gap-5 items-stretch ${cols}`}>
                    <SpendingBreakdown data={currentCats} />
                    {showCats && <CategoryCards data={categoryBreakdown} />}
                    {showUpcoming && <UpcomingBillsCard bills={upcomingBills} daysAhead={7} />}
                  </div>
                );
              })()}
            </div>

            {/* ── MOBILE LAYOUT ─────────────────────────────────────── */}
            <div className="flex flex-col gap-4 lg:hidden">
              {upcomingBills.length > 0 && (
                <UpcomingBillsCard bills={upcomingBills} daysAhead={7} />
              )}
              {weeklyData.length > 0 && <SpendingChart data={weeklyData} />}
              {currentCats.length > 0 && (
                <>
                  <CategoryChart data={currentCats} />
                  <SpendingBreakdown data={currentCats} />
                  <CategoryCards data={categoryBreakdown} />
                </>
              )}
            </div>

            {/* Empty state when categorized but no expenses */}
            {currentCats.length === 0 && (
              <div className="rounded-xl border border-border bg-muted/20 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum gasto categorizado neste período.
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Importe um extrato ou adicione uma despesa.
                </p>
              </div>
            )}
          </>
        ) : (
          <DashboardEmptyState />
        )}
      </div>
    </div>
  );
}
