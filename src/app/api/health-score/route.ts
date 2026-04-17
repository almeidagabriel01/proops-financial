import { createClient } from '@/lib/supabase/server';
import {
  getSavingsRateScore,
  getBudgetComplianceScore,
  getGoalsProgressScore,
  getDiversificationScore,
  calculateFinalScore,
  getBadge,
  isClosedMonth,
} from '@/lib/health-score/calculate';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get('month') ?? new Date().toISOString().slice(0, 7);

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: 'Parâmetro month inválido. Use YYYY-MM.' }, { status: 400 });
  }

  const [year, monthNum] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const endDate = new Date(year, monthNum, 0).toISOString().slice(0, 10);

  // Fetch transactions, budgets and goals in parallel
  const [txResult, budgetsResult, goalsResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('category, amount, type')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate),
    supabase
      .from('budgets')
      .select('category, monthly_limit')
      .eq('user_id', user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('goals')
      .select('current_amount, target_amount, status')
      .eq('user_id', user.id),
  ]);

  if (txResult.error) {
    console.error('[health-score GET] transactions error:', txResult.error);
    return Response.json({ error: 'Erro ao buscar transações' }, { status: 500 });
  }

  const txs = txResult.data ?? [];

  if (txs.length === 0) {
    return Response.json({ score: null, badge: null, month });
  }

  // Income and expenses
  const income = txs.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter((t) => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);

  // Category totals for diversification
  const categoryTotals: Record<string, number> = {};
  for (const tx of txs.filter((t) => t.type === 'debit')) {
    categoryTotals[tx.category] = (categoryTotals[tx.category] ?? 0) + Math.abs(tx.amount);
  }

  // Budget compliance: calculate spent per category then compare to limit
  const budgets = budgetsResult.data ?? [];
  const budgetsWithSpent = budgets.map((b: { category: string; monthly_limit: number }) => ({
    monthly_limit: b.monthly_limit,
    spent: categoryTotals[b.category] ?? 0,
  }));

  // Goals: active only
  const goals = (goalsResult.data ?? []) as Array<{
    current_amount: number;
    target_amount: number;
    status: string;
  }>;
  const activeGoals = goals
    .filter((g) => g.status === 'active')
    .map((g) => ({ current_amount: g.current_amount, target_amount: g.target_amount }));

  const components = {
    savingsRateScore: getSavingsRateScore(income, expenses),
    budgetComplianceScore: getBudgetComplianceScore(budgetsWithSpent),
    goalsProgressScore: getGoalsProgressScore(activeGoals),
    diversificationScore: getDiversificationScore(categoryTotals, expenses),
  };

  const score = calculateFinalScore(components);
  const badge = getBadge(score);

  // Persist to history only for closed months (mn1 fix: never persist partial current month)
  if (isClosedMonth(month)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('health_score_history')
      .upsert(
        {
          user_id: user.id,
          month: startDate,
          score,
          savings_rate_score: components.savingsRateScore,
          budget_compliance_score: components.budgetComplianceScore,
          goals_progress_score: components.goalsProgressScore,
          diversification_score: components.diversificationScore,
        },
        { onConflict: 'user_id,month', ignoreDuplicates: false },
      );
  }

  return Response.json({
    score,
    badge,
    components: {
      savingsRate: components.savingsRateScore,
      budgetCompliance: components.budgetComplianceScore,
      goalsProgress: components.goalsProgressScore,
      diversification: components.diversificationScore,
    },
    month,
  });
}
