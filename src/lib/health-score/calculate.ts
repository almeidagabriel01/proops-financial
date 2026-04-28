export interface ScoreComponents {
  savingsRateScore: number;
  budgetComplianceScore: number;
  goalsProgressScore: number;
  diversificationScore: number;
}

export interface BudgetWithSpent {
  monthly_limit: number;
  spent: number;
}

export interface ActiveGoal {
  current_amount: number;
  target_amount: number;
}

export type Badge = 'critico' | 'regular' | 'bom' | 'excelente';

export const BADGE_CONFIG: Record<Badge, { label: string; color: string }> = {
  critico:   { label: 'Crítico',   color: 'bg-red-100 text-red-700 border-red-200' },
  regular:   { label: 'Regular',   color: 'bg-orange-100 text-orange-700 border-orange-200' },
  bom:       { label: 'Bom',       color: 'bg-blue-100 text-blue-700 border-blue-200' },
  excelente: { label: 'Excelente', color: 'bg-green-100 text-green-700 border-green-200' },
};

export function getSavingsRateScore(income: number, expenses: number): number {
  if (income <= 0) return 0;
  const rate = (income - expenses) / income;
  if (rate <= 0) return 0;
  if (rate >= 0.3) return 100;
  return Math.round((rate / 0.3) * 100);
}

export function getBudgetComplianceScore(budgets: BudgetWithSpent[]): number {
  if (!budgets.length) return 50;
  const compliant = budgets.filter((b) => b.spent <= b.monthly_limit).length;
  return Math.round((compliant / budgets.length) * 100);
}

export function getGoalsProgressScore(goals: ActiveGoal[]): number {
  const active = goals.filter((g) => g.target_amount > 0);
  if (!active.length) return 50;
  const avg =
    active.reduce((sum, g) => sum + Math.min(g.current_amount / g.target_amount, 1), 0) /
    active.length;
  return Math.round(avg * 100);
}

export function getDiversificationScore(
  categoryTotals: Record<string, number>,
  totalExpenses: number,
): number {
  if (totalExpenses === 0) return 100;
  const maxShare = Math.max(...Object.values(categoryTotals)) / totalExpenses;
  if (maxShare <= 0.6) return 100;
  return Math.max(0, Math.round((1 - (maxShare - 0.6) / 0.4) * 100));
}

export function calculateFinalScore(components: ScoreComponents): number {
  return Math.round(
    components.savingsRateScore * 0.4 +
      components.budgetComplianceScore * 0.3 +
      components.goalsProgressScore * 0.2 +
      components.diversificationScore * 0.1,
  );
}

export function getBadge(score: number): Badge {
  if (score <= 25) return 'critico';
  if (score <= 50) return 'regular';
  if (score <= 75) return 'bom';
  return 'excelente';
}

/** Returns true when the given YYYY-MM month is fully closed (before current month). */
export function isClosedMonth(monthStr: string): boolean {
  const now = new Date();
  const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [year, month] = monthStr.split('-').map(Number);
  const firstOfTarget = new Date(year, month - 1, 1);
  return firstOfTarget < firstOfCurrentMonth;
}
