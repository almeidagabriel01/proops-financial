import type { SupabaseClient } from '@supabase/supabase-js';
import { getMonthBounds } from '@/lib/utils/format';
import { getEffectiveTier } from '@/lib/billing/plans';
import type { Database } from '@/lib/supabase/types';

type Profile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'plan' | 'trial_ends_at' | 'ai_queries_this_month' | 'ai_queries_reset_at'
>;

// ─── Financial Context ────────────────────────────────────────────────────────

export interface CategorySummary {
  category: string;
  total: number;
  count: number;
}

export interface MerchantSummary {
  description: string;
  total: number;
}

export interface MonthSummary {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  balance: number;
}

export interface FinancialContext {
  current_month: {
    period: string;
    income: number;
    expenses: number;
    balance: number;
    top_categories: CategorySummary[];
    top_merchants: MerchantSummary[];
    transaction_count: number;
  };
  previous_months: MonthSummary[];
}

export async function buildFinancialContext(
  userId: string,
  supabase: SupabaseClient
): Promise<FinancialContext> {
  const now = new Date();
  const { start, end } = getMonthBounds(now);

  // Current month transactions
  const { data: currentRows } = await supabase
    .from('transactions')
    .select('category, amount, type, description')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end);

  const rows = currentRows ?? [];
  const income = rows
    .filter((r) => r.type === 'credit')
    .reduce((s, r) => s + r.amount, 0);
  const expenses = rows
    .filter((r) => r.type === 'debit')
    .reduce((s, r) => s + Math.abs(r.amount), 0);

  // Aggregate by category (debits only)
  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const r of rows.filter((r) => r.type === 'debit')) {
    const existing = categoryMap.get(r.category) ?? { total: 0, count: 0 };
    categoryMap.set(r.category, {
      total: existing.total + Math.abs(r.amount),
      count: existing.count + 1,
    });
  }
  const topCategories: CategorySummary[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Top merchants by total spend
  const merchantMap = new Map<string, number>();
  for (const r of rows.filter((r) => r.type === 'debit')) {
    const key = r.description.substring(0, 50);
    merchantMap.set(key, (merchantMap.get(key) ?? 0) + Math.abs(r.amount));
  }
  const topMerchants: MerchantSummary[] = Array.from(merchantMap.entries())
    .map(([description, total]) => ({ description, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Previous 3 months
  const previousMonths: MonthSummary[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const bounds = getMonthBounds(d);
    const { data: prevRows } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .gte('date', bounds.start)
      .lte('date', bounds.end);

    const prev = prevRows ?? [];
    const prevIncome = prev
      .filter((r) => r.type === 'credit')
      .reduce((s, r) => s + r.amount, 0);
    const prevExpenses = prev
      .filter((r) => r.type === 'debit')
      .reduce((s, r) => s + Math.abs(r.amount), 0);

    previousMonths.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      income: prevIncome,
      expenses: prevExpenses,
      balance: prevIncome - prevExpenses,
    });
  }

  const periodLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return {
    current_month: {
      period: periodLabel,
      income,
      expenses,
      balance: income - expenses,
      top_categories: topCategories,
      top_merchants: topMerchants,
      transaction_count: rows.length,
    },
    previous_months: previousMonths,
  };
}

// ─── Rate Limit ───────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  queriesUsed: number;
  limit: number;
}

export async function checkAndResetRateLimit(
  userId: string,
  profile: Profile,
  supabase: SupabaseClient
): Promise<RateLimitResult> {
  const tier = getEffectiveTier(profile.plan, profile.trial_ends_at);
  const limit = tier === 'pro' ? 200 : 50;

  // Compare year+month only to avoid UTC vs local timezone issues
  // ai_queries_reset_at is stored as 'YYYY-MM-DD'; parse as local via appending time
  const resetAt = new Date(profile.ai_queries_reset_at + 'T00:00:00');
  const now = new Date();
  const needsReset =
    resetAt.getFullYear() < now.getFullYear() ||
    (resetAt.getFullYear() === now.getFullYear() && resetAt.getMonth() < now.getMonth());

  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let queriesUsed = profile.ai_queries_this_month;

  if (needsReset) {
    await supabase
      .from('profiles')
      .update({
        ai_queries_this_month: 0,
        ai_queries_reset_at: startOfThisMonth.toISOString().split('T')[0],
      })
      .eq('id', userId);
    queriesUsed = 0;
  }

  return {
    allowed: queriesUsed < limit,
    queriesUsed,
    limit,
  };
}
