import { SupabaseClient } from '@supabase/supabase-js';
import {
  getSavingsRateScore,
  getBudgetComplianceScore,
  getGoalsProgressScore,
  getDiversificationScore,
  calculateFinalScore,
  getBadge,
} from '@/lib/health-score/calculate';

export interface CategoryTotal {
  category: string;
  total: number;
  percentage: number;
}

export interface BudgetStatus {
  name: string;
  limit: number;
  spent: number;
  compliant: boolean;
}

export interface GoalStatus {
  name: string;
  currentAmount: number;
  targetAmount: number;
  progressPct: number;
}

export interface ReportData {
  month: string;
  monthLabel: string;
  userName: string;
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
  score: number | null;
  scoreBadge: string | null;
  topCategories: CategoryTotal[];
  budgets: BudgetStatus[];
  goals: GoalStatus[];
  prevMonth: {
    income: number;
    expenses: number;
    balance: number;
  } | null;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${year}`;
}

function monthDateRange(month: string): { start: string; end: string } {
  const [year, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function prevMonthStr(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchMonthTotals(supabase: SupabaseClient<any>, userId: string, month: string) {
  const { start, end } = monthDateRange(month);
  const { data } = await supabase
    .from('transactions')
    .select('amount, type, category')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end);

  const rows = data ?? [];
  let income = 0;
  let expenses = 0;
  const categoryTotals: Record<string, number> = {};

  for (const row of rows) {
    if (row.type === 'credit') {
      income += row.amount;
    } else {
      expenses += row.amount;
      categoryTotals[row.category] = (categoryTotals[row.category] ?? 0) + row.amount;
    }
  }

  return { income, expenses, categoryTotals, hasTransactions: rows.length > 0 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function collectReportData(supabase: SupabaseClient<any>, userId: string, month: string, userName: string): Promise<ReportData | null> {
  const { start, end } = monthDateRange(month);

  const { income, expenses, categoryTotals, hasTransactions } = await fetchMonthTotals(supabase, userId, month);
  if (!hasTransactions) return null;

  // Orçamentos do mês
  const { data: budgetRows } = await supabase
    .from('budgets')
    .select('name, monthly_limit, category')
    .eq('user_id', userId)
    .eq('is_active', true);

  const budgetList = budgetRows ?? [];

  // Gasto por categoria dos orçamentos ativos no mês
  const budgets: BudgetStatus[] = await Promise.all(
    budgetList.map(async (b: { name: string; monthly_limit: number; category: string }) => {
      const { data: txs } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('category', b.category)
        .eq('type', 'debit')
        .gte('date', start)
        .lte('date', end);
      const spent = (txs ?? []).reduce((s: number, t: { amount: number }) => s + t.amount, 0);
      return { name: b.name, limit: b.monthly_limit, spent, compliant: spent <= b.monthly_limit };
    })
  );

  // Metas ativas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goalRows } = await (supabase as any)
    .from('goals')
    .select('name, current_amount, target_amount, status')
    .eq('user_id', userId)
    .eq('status', 'active');

  const goals: GoalStatus[] = (goalRows ?? []).map((g: { name: string; current_amount: number; target_amount: number }) => ({
    name: g.name,
    currentAmount: g.current_amount,
    targetAmount: g.target_amount,
    progressPct: g.target_amount > 0 ? Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100) : 0,
  }));

  // Score de saúde
  const savingsRateScore = getSavingsRateScore(income, expenses);
  const budgetComplianceScore = getBudgetComplianceScore(
    budgets.map(b => ({ monthly_limit: b.limit, spent: b.spent }))
  );
  const goalsProgressScore = getGoalsProgressScore(
    (goalRows ?? []).map((g: { current_amount: number; target_amount: number }) => ({
      current_amount: g.current_amount,
      target_amount: g.target_amount,
    }))
  );
  const diversificationScore = getDiversificationScore(categoryTotals, expenses);
  const score = hasTransactions
    ? calculateFinalScore({ savingsRateScore, budgetComplianceScore, goalsProgressScore, diversificationScore })
    : null;
  const scoreBadge = score !== null ? getBadge(score) : null;

  // Top 5 categorias
  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topCategories: CategoryTotal[] = sortedCategories.map(([category, total]) => ({
    category,
    total,
    percentage: expenses > 0 ? Math.round((total / expenses) * 100) : 0,
  }));

  // Mês anterior
  const prev = prevMonthStr(month);
  const { income: prevIncome, expenses: prevExpenses, hasTransactions: hasPrev } = await fetchMonthTotals(supabase, userId, prev);
  const prevMonth = hasPrev ? { income: prevIncome, expenses: prevExpenses, balance: prevIncome - prevExpenses } : null;

  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

  return {
    month,
    monthLabel: formatMonthLabel(month),
    userName,
    income,
    expenses,
    balance: income - expenses,
    savingsRate,
    score,
    scoreBadge,
    topCategories,
    budgets,
    goals,
    prevMonth,
  };
}
