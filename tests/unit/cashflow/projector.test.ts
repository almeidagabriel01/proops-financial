import { describe, it, expect } from 'vitest';
import { projectCashFlow, collapseToWeekly, type ScheduledItemForProjection } from '@/lib/cashflow/projector';

describe('projectCashFlow', () => {
  it('returns empty array for same start and end with no items', () => {
    const result = projectCashFlow({
      currentBalance: 1000,
      scheduledItems: [],
      startDate: '2024-01-01',
      endDate: '2024-01-01',
    });
    expect(result).toHaveLength(1);
    expect(result[0].balance).toBe(1000);
    expect(result[0].inflow).toBe(0);
    expect(result[0].outflow).toBe(0);
  });

  it('correctly applies a debit item', () => {
    const items: ScheduledItemForProjection[] = [
      { due_date: '2024-01-05', amount: 200, type: 'debit', status: 'pending' },
    ];
    const result = projectCashFlow({ currentBalance: 1000, scheduledItems: items, startDate: '2024-01-01', endDate: '2024-01-10' });
    const day5 = result.find((p) => p.date === '2024-01-05');
    expect(day5?.outflow).toBe(200);
    expect(day5?.balance).toBe(800);
    const day6 = result.find((p) => p.date === '2024-01-06');
    expect(day6?.balance).toBe(800); // balance stays
  });

  it('correctly applies a credit item', () => {
    const items: ScheduledItemForProjection[] = [
      { due_date: '2024-01-03', amount: 5000, type: 'credit', status: 'pending' },
    ];
    const result = projectCashFlow({ currentBalance: 1000, scheduledItems: items, startDate: '2024-01-01', endDate: '2024-01-05' });
    const day3 = result.find((p) => p.date === '2024-01-03');
    expect(day3?.inflow).toBe(5000);
    expect(day3?.balance).toBe(6000);
  });

  it('ignores canceled and paid items', () => {
    const items: ScheduledItemForProjection[] = [
      { due_date: '2024-01-05', amount: 200, type: 'debit', status: 'canceled' },
      { due_date: '2024-01-05', amount: 300, type: 'debit', status: 'paid' },
    ];
    const result = projectCashFlow({ currentBalance: 1000, scheduledItems: items, startDate: '2024-01-01', endDate: '2024-01-10' });
    const day5 = result.find((p) => p.date === '2024-01-05');
    expect(day5?.balance).toBe(1000); // unchanged
  });

  it('generates correct number of days', () => {
    const result = projectCashFlow({
      currentBalance: 0,
      scheduledItems: [],
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });
    expect(result).toHaveLength(31);
  });

  it('handles overdue items', () => {
    const items: ScheduledItemForProjection[] = [
      { due_date: '2024-01-02', amount: 100, type: 'debit', status: 'overdue' },
    ];
    const result = projectCashFlow({ currentBalance: 500, scheduledItems: items, startDate: '2024-01-01', endDate: '2024-01-05' });
    const day2 = result.find((p) => p.date === '2024-01-02');
    expect(day2?.balance).toBe(400); // overdue counts as pending outflow
  });

  it('accumulates multiple items on same day', () => {
    const items: ScheduledItemForProjection[] = [
      { due_date: '2024-01-05', amount: 100, type: 'debit', status: 'pending' },
      { due_date: '2024-01-05', amount: 200, type: 'debit', status: 'pending' },
      { due_date: '2024-01-05', amount: 50,  type: 'credit', status: 'pending' },
    ];
    const result = projectCashFlow({ currentBalance: 1000, scheduledItems: items, startDate: '2024-01-05', endDate: '2024-01-05' });
    expect(result[0].outflow).toBe(300);
    expect(result[0].inflow).toBe(50);
    expect(result[0].balance).toBe(750);
  });
});

describe('collapseToWeekly', () => {
  it('groups 7 days into 1 week', () => {
    const daily = Array.from({ length: 14 }, (_, i) => {
      const d = new Date('2024-01-01');
      d.setDate(d.getDate() + i);
      return {
        date: d.toISOString().slice(0, 10),
        inflow: 10,
        outflow: 5,
        net: 5,
        balance: 1000 + i * 5,
      };
    });
    const weekly = collapseToWeekly(daily);
    expect(weekly).toHaveLength(2);
    expect(weekly[0].inflow).toBe(70); // 10 * 7
    expect(weekly[0].outflow).toBe(35); // 5 * 7
  });

  it('handles partial last week', () => {
    const daily = Array.from({ length: 10 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      inflow: 0, outflow: 0, net: 0, balance: 1000,
    }));
    const weekly = collapseToWeekly(daily);
    expect(weekly).toHaveLength(2); // 7 + 3
  });
});
