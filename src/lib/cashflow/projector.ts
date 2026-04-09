/**
 * Cash flow projector.
 * Projects the running balance day-by-day based on scheduled transactions
 * (pending/overdue items). Used by the /financeiro/fluxo page and the
 * /api/cashflow endpoint.
 */

export interface ScheduledItemForProjection {
  due_date: string;             // YYYY-MM-DD
  amount: number;               // absolute value
  type: 'credit' | 'debit';
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
}

export interface CashFlowPoint {
  date: string;     // YYYY-MM-DD
  inflow: number;   // credits due on this day
  outflow: number;  // debits due on this day
  net: number;      // inflow - outflow
  balance: number;  // running projected balance
}

/**
 * Project cash flow from startDate to endDate.
 *
 * @param currentBalance - Current account balance (sum of all settled transactions)
 * @param scheduledItems - Pending/overdue scheduled transactions
 * @param startDate - First day of projection (YYYY-MM-DD)
 * @param endDate - Last day of projection (YYYY-MM-DD)
 */
export function projectCashFlow(params: {
  currentBalance: number;
  scheduledItems: ScheduledItemForProjection[];
  startDate: string;
  endDate: string;
}): CashFlowPoint[] {
  const { currentBalance, scheduledItems, startDate, endDate } = params;

  // Only consider actionable items within the date window
  const relevant = scheduledItems.filter(
    (item) =>
      item.status !== 'canceled' &&
      item.status !== 'paid' &&
      item.due_date >= startDate &&
      item.due_date <= endDate,
  );

  // Aggregate inflows and outflows per calendar day
  const byDate = new Map<string, { inflow: number; outflow: number }>();
  for (const item of relevant) {
    const day = byDate.get(item.due_date) ?? { inflow: 0, outflow: 0 };
    const abs = Math.abs(item.amount);
    if (item.type === 'credit') {
      day.inflow += abs;
    } else {
      day.outflow += abs;
    }
    byDate.set(item.due_date, day);
  }

  // Build day-by-day series
  const points: CashFlowPoint[] = [];
  let runningBalance = currentBalance;
  let current = startDate;

  while (current <= endDate) {
    const day = byDate.get(current) ?? { inflow: 0, outflow: 0 };
    runningBalance = Math.round((runningBalance + day.inflow - day.outflow) * 100) / 100;

    points.push({
      date: current,
      inflow: Math.round(day.inflow * 100) / 100,
      outflow: Math.round(day.outflow * 100) / 100,
      net: Math.round((day.inflow - day.outflow) * 100) / 100,
      balance: runningBalance,
    });

    // Advance by one calendar day
    const d = new Date(current + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    current = d.toISOString().slice(0, 10);
  }

  return points;
}

/**
 * Collapse a daily series into weekly summary points (one per week).
 * Useful when projecting 3-12 months and we don't want 365 data points.
 */
export function collapseToWeekly(points: CashFlowPoint[]): CashFlowPoint[] {
  const weekly: CashFlowPoint[] = [];
  for (let i = 0; i < points.length; i += 7) {
    const slice = points.slice(i, i + 7);
    const last = slice[slice.length - 1];
    weekly.push({
      date: last.date,
      inflow: Math.round(slice.reduce((s, p) => s + p.inflow, 0) * 100) / 100,
      outflow: Math.round(slice.reduce((s, p) => s + p.outflow, 0) * 100) / 100,
      net: Math.round(slice.reduce((s, p) => s + p.net, 0) * 100) / 100,
      balance: last.balance,
    });
  }
  return weekly;
}
