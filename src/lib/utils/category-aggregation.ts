// Pure aggregation utilities for category dashboard — no UI imports, fully testable
// Used server-side in dashboard/page.tsx and in tests

export interface CategoryData {
  category: string;
  total: number;
  percentage: number;
  count: number;
}

export type TrendDirection = 'up' | 'down' | 'stable';

export interface TrendResult {
  direction: TrendDirection;
  percentage: number; // absolute percentage change (always positive)
}

export interface CategoryBreakdown extends CategoryData {
  trend: TrendResult | null; // null when no previous period data exists
}

// Aggregate debit transactions by category.
// Returns sorted by total descending, with percentage of total expenses.
export function aggregateByCategory(
  data: Array<{ category: string | null; amount: number; type: string }>,
): CategoryData[] {
  const totals: Record<string, { total: number; count: number }> = {};

  for (const tx of data) {
    if (tx.type !== 'debit') continue;
    const cat = tx.category ?? 'outros';
    if (!totals[cat]) totals[cat] = { total: 0, count: 0 };
    totals[cat].total += Math.abs(tx.amount);
    totals[cat].count += 1;
  }

  const grandTotal = Object.values(totals).reduce((sum, v) => sum + v.total, 0);

  return Object.entries(totals)
    .map(([category, { total, count }]) => ({
      category,
      total,
      count,
      percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

// Calculate trend between current and previous period values.
// Thresholds: > +5% = up, < -5% = down, otherwise stable.
export function calcTrend(current: number, prev: number): TrendResult {
  if (prev === 0) {
    return { direction: 'stable', percentage: 0 };
  }
  const change = ((current - prev) / prev) * 100;
  if (change > 5) return { direction: 'up', percentage: Math.round(change) };
  if (change < -5) return { direction: 'down', percentage: Math.round(Math.abs(change)) };
  return { direction: 'stable', percentage: 0 };
}

// Merge current period data with trends from previous period.
// hasPrevData: true only when previous period has at least one debit transaction.
export function buildCategoryBreakdown(
  current: CategoryData[],
  prev: CategoryData[],
  hasPrevData: boolean,
): CategoryBreakdown[] {
  const prevMap: Record<string, number> = {};
  for (const p of prev) prevMap[p.category] = p.total;

  return current.map((c) => ({
    ...c,
    trend: hasPrevData ? calcTrend(c.total, prevMap[c.category] ?? 0) : null,
  }));
}
